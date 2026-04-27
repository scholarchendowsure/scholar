'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function FollowupImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [activeTab, setActiveTab] = useState<'followups' | 'addresses'>('followups');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('请选择 Excel 文件');
      return;
    }

    setFile(selectedFile);
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('请先选择文件');
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = activeTab === 'followups'
        ? '/api/cases/followups/import'
        : '/api/cases/addresses/import';

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      const response = await new Promise<ImportResult>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const result = JSON.parse(xhr.responseText);
              resolve(result.success ? { success: result.data?.successCount || 0, failed: result.data?.failedCount || 0, errors: result.data?.errors || [] } : { success: 0, failed: 0, errors: [result.error || '导入失败'] });
            } catch {
              reject(new Error('解析响应失败'));
            }
          } else {
            reject(new Error('导入失败'));
          }
        };
        xhr.onerror = () => reject(new Error('网络错误'));
        xhr.open('POST', endpoint);
        xhr.send(formData);
      });

      setImportResult(response);
      toast.success('导入完成');
    } catch (error) {
      toast.error('导入失败，请检查文件格式');
    } finally {
      setImporting(false);
      setProgress(100);
    }
  };

  const handleClear = () => {
    setFile(null);
    setImportResult(null);
    setProgress(0);
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
            <h1 className="text-2xl font-bold">跟进记录导入</h1>
            <p className="text-muted-foreground text-sm mt-1">
              批量导入跟进记录或地址信息
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/api/cases/import/template">
            <Download className="h-4 w-4 mr-2" />
            下载模板
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'followups' | 'addresses')}>
        <TabsList>
          <TabsTrigger value="followups">跟进记录导入</TabsTrigger>
          <TabsTrigger value="addresses">地址信息导入</TabsTrigger>
        </TabsList>

        <TabsContent value="followups">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">跟进记录导入</CardTitle>
              <CardDescription>
                批量导入案件的外访跟进记录，包含访问结果、沟通内容、还款意向等信息
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                <li>- 必填字段：案件编号、访问时间、访问结果</li>
                <li>- 选填字段：沟通内容、还款意向、承诺还款日期/金额、下一步计划</li>
                <li>- 支持多张照片上传（照片URL列表）</li>
              </ul>

              <ImportForm
                file={file}
                uploading={uploading}
                importing={importing}
                progress={progress}
                importResult={importResult}
                onFileSelect={handleFileSelect}
                onImport={handleImport}
                onClear={handleClear}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addresses">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">地址信息导入</CardTitle>
              <CardDescription>
                批量更新案件的地址信息，包含家庭地址、公司地址等
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                <li>- 必填字段：案件编号</li>
                <li>- 选填字段：家庭地址、公司地址、其他地址、地址来源</li>
              </ul>

              <ImportForm
                file={file}
                uploading={uploading}
                importing={importing}
                progress={progress}
                importResult={importResult}
                onFileSelect={handleFileSelect}
                onImport={handleImport}
                onClear={handleClear}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ImportForm({
  file,
  uploading,
  importing,
  progress,
  importResult,
  onFileSelect,
  onImport,
  onClear,
}: {
  file: File | null;
  uploading: boolean;
  importing: boolean;
  progress: number;
  importResult: ImportResult | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
  onClear: () => void;
}) {
  if (importResult) {
    return (
      <>
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
            <p className="text-2xl font-bold">{importResult.success + importResult.failed}</p>
            <p className="text-sm text-muted-foreground">总数据条数</p>
          </div>
        </div>

        {importResult.errors.length > 0 && (
          <div className="bg-muted/50 rounded p-3 max-h-[200px] overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-[hsl(35,90%,45%)]" />
              <span className="text-sm font-medium">错误详情</span>
            </div>
            {importResult.errors.map((err, i) => (
              <p key={i} className="text-xs text-[hsl(0,75%,50%)] mb-1">
                {err}
              </p>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClear}>
            继续导入
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="border-2 border-dashed border-muted-foreground/25 rounded p-8 text-center">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={onFileSelect}
          className="hidden"
          id="import-file"
        />
        <label htmlFor="import-file" className="cursor-pointer flex flex-col items-center gap-4">
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

      {(uploading || importing) && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>{uploading ? '上传中...' : '导入中...'}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onClear} disabled={!file || importing}>
          清空
        </Button>
        <Button onClick={onImport} disabled={!file || importing}>
          {importing ? '导入中...' : '开始导入'}
        </Button>
      </div>
    </>
  );
}
