'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface ImportRow {
  row: number;
  data: Record<string, string>;
  status: 'pending' | 'valid' | 'invalid';
  errors: string[];
}

export default function CaseImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('请选择 Excel 文件');
      return;
    }

    setFile(selectedFile);
    setPreviewData([]);
    setImportResult(null);
  }, []);

  const handleUpload = async () => {
    if (!file) {
      toast.error('请先选择文件');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      const response = await new Promise<{ success: boolean; data?: ImportRow[]; error?: string }>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error('解析响应失败'));
            }
          } else {
            reject(new Error('上传失败'));
          }
        };
        xhr.onerror = () => reject(new Error('网络错误'));
        xhr.open('POST', '/api/cases/import/preview');
        xhr.send(formData);
      });

      if (response.success && response.data) {
        setPreviewData(response.data);
        toast.success('文件预览成功');
      } else {
        toast.error(response.error || '预览失败');
      }
    } catch (error) {
      toast.error('预览失败，请检查文件格式');
    } finally {
      setUploading(false);
      setProgress(100);
    }
  };

  const handleImport = async () => {
    const validRows = previewData.filter((r) => r.status === 'valid');
    if (validRows.length === 0) {
      toast.error('没有可导入的有效数据');
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      const res = await fetch('/api/cases/batch-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cases: validRows.map((r) => r.data),
        }),
      });

      const result = await res.json();

      if (result.success) {
        setImportResult({
          success: result.data?.successCount || 0,
          failed: result.data?.failedCount || 0,
          errors: result.data?.errors || [],
        });
        toast.success('导入完成');
      } else {
        toast.error(result.error || '导入失败');
      }
    } catch (error) {
      toast.error('导入失败');
    } finally {
      setImporting(false);
      setProgress(100);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreviewData([]);
    setImportResult(null);
    setProgress(0);
  };

  const downloadTemplate = async () => {
    try {
      const res = await fetch('/api/cases/import/template');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '案件导入模板.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast.error('模板下载失败');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cases">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">案件导入</h1>
            <p className="text-muted-foreground text-sm mt-1">
              批量导入案件数据，支持 Excel 格式
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          下载模板
        </Button>
      </div>

      {/* File Upload */}
      {previewData.length === 0 && !importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">上传文件</CardTitle>
            <CardDescription>支持 .xlsx, .xls 格式的 Excel 文件</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded p-8 text-center">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-4"
              >
                {file ? (
                  <>
                    <FileSpreadsheet className="h-12 w-12 text-[hsl(210,95%,40%)]" />
                    <div className="text-sm">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      <p>点击选择文件或将文件拖拽到此处</p>
                      <p className="mt-1">最大支持 10MB</p>
                    </div>
                  </>
                )}
              </label>
            </div>

            {uploading && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>上传中...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleClear} disabled={!file}>
                清空
              </Button>
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? '预览中...' : '预览数据'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Data */}
      {previewData.length > 0 && !importResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">数据预览</CardTitle>
                <CardDescription>
                  共 {previewData.length} 条数据，{previewData.filter((r) => r.status === 'valid').length} 条有效，{previewData.filter((r) => r.status === 'invalid').length} 条无效
                </CardDescription>
              </div>
              <Button variant="outline" onClick={handleClear}>
                <Trash2 className="h-4 w-4 mr-2" />
                重新上传
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-2 px-3 font-medium w-[60px]">行号</th>
                    <th className="text-left py-2 px-3 font-medium">状态</th>
                    <th className="text-left py-2 px-3 font-medium">借款人</th>
                    <th className="text-left py-2 px-3 font-medium">身份证</th>
                    <th className="text-left py-2 px-3 font-medium">电话</th>
                    <th className="text-left py-2 px-3 font-medium">地址</th>
                    <th className="text-right py-2 px-3 font-medium">欠款金额</th>
                    <th className="text-left py-2 px-3 font-medium">错误信息</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row) => (
                    <tr key={row.row} className="border-b hover:bg-accent/50">
                      <td className="py-2 px-3">{row.row}</td>
                      <td className="py-2 px-3">
                        {row.status === 'valid' ? (
                          <CheckCircle className="h-4 w-4 text-[hsl(145,65%,38%)]" />
                        ) : (
                          <XCircle className="h-4 w-4 text-[hsl(0,75%,50%)]" />
                        )}
                      </td>
                      <td className="py-2 px-3 font-medium">
                        {row.data.borrowerName || '-'}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs">
                        {row.data.borrowerIdCard || '-'}
                      </td>
                      <td className="py-2 px-3 font-mono">
                        {row.data.borrowerPhone || '-'}
                      </td>
                      <td className="py-2 px-3 max-w-[200px] truncate">
                        {row.data.address || '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-data">
                        {row.data.debtAmount || '-'}
                      </td>
                      <td className="py-2 px-3 text-xs text-[hsl(0,75%,50%)]">
                        {row.errors.join('; ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importing && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>导入中...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleClear} disabled={importing}>
                取消
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  importing ||
                  previewData.filter((r) => r.status === 'valid').length === 0
                }
              >
                导入 {previewData.filter((r) => r.status === 'valid').length} 条有效数据
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Result */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">导入结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-[hsl(145,65%,38%)]/10 rounded">
                <CheckCircle className="h-8 w-8 text-[hsl(145,65%,38%)] mx-auto mb-2" />
                <p className="text-2xl font-bold">{importResult.success}</p>
                <p className="text-sm text-muted-foreground">成功导入</p>
              </div>
              <div className="text-center p-4 bg-[hsl(0,75%,50%)]/10 rounded">
                <XCircle className="h-8 w-8 text-[hsl(0,75%,50%)] mx-auto mb-2" />
                <p className="text-2xl font-bold">{importResult.failed}</p>
                <p className="text-sm text-muted-foreground">导入失败</p>
              </div>
              <div className="text-center p-4 bg-muted rounded">
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-2xl font-bold">{previewData.length}</p>
                <p className="text-sm text-muted-foreground">总数据条数</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-[hsl(35,90%,45%)]" />
                  <span className="text-sm font-medium">错误详情</span>
                </div>
                <div className="bg-muted/50 rounded p-3 max-h-[200px] overflow-y-auto">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-[hsl(0,75%,50%)] mb-1">
                      {err}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleClear}>
                继续导入
              </Button>
              <Button asChild>
                <Link href="/cases">查看案件列表</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
