'use client';

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function HSBCUploadPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [batchDate, setBatchDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const parseExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
          
          if (jsonData.length < 2) {
            reject(new Error('文件格式错误，请检查文件内容'));
            return;
          }
          
          const headers = jsonData[0] as string[];
          const rows: any[] = [];
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row.length > 0) {
              const obj: any = {};
              headers.forEach((header, index) => {
                if (header) {
                  obj[header.trim()] = row[index];
                }
              });
              rows.push(obj);
            }
          }
          
          resolve(rows);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.csv'))) {
      setFile(droppedFile);
      setUploadResult(null);
      parseAndPreview(droppedFile);
    } else {
      toast.error('请上传 Excel (.xlsx, .xls) 或 CSV 文件');
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadResult(null);
      parseAndPreview(selectedFile);
    }
  };

  const parseAndPreview = async (file: File) => {
    try {
      const data = await parseExcelFile(file);
      setPreviewData(data.slice(0, 10)); // 只显示前10条作为预览
      toast.success(`成功解析 ${data.length} 条记录`);
    } catch (error) {
      toast.error('文件解析失败：' + (error as Error).message);
    }
  };

  const handleUpload = async () => {
    if (!file || !batchDate) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const data = await parseExcelFile(file);
      
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 80));
      }, 200);

      const response = await fetch('/api/hsbc/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loans: data,
          batchDate,
          mode: 'replace',
        }),
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (result.success) {
        setUploadResult(result);
        toast.success(result.message);
      } else {
        toast.error(result.error || '上传失败');
      }
    } catch (error) {
      toast.error('上传出错：' + (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setUploadResult(null);
    setUploadProgress(0);
    setPreviewData([]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">汇丰贷款数据导入</h1>
          <p className="text-slate-600 mt-2">上传 Excel 或 CSV 文件，导入汇丰贷款案件数据</p>
        </div>

        {/* 批次日期选择 */}
        {!uploadResult && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>选择批次日期</CardTitle>
              <CardDescription>
                请选择本次导入数据的批次日期
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="date"
                value={batchDate}
                onChange={(e) => setBatchDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </CardContent>
          </Card>
        )}

        {/* 上传区域 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              上传数据文件
            </CardTitle>
            <CardDescription>
              支持 .xlsx、.xls 和 .csv 格式的文件
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-4">
                  <FileSpreadsheet className="w-16 h-16 mx-auto text-green-600" />
                  <div>
                    <p className="font-medium text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  
                  {/* 数据预览 */}
                  {previewData.length > 0 && !uploadResult && (
                    <div className="mt-4 text-left">
                      <p className="font-medium text-slate-700 mb-2">数据预览（前{previewData.length}条）：</p>
                      <div className="bg-slate-50 rounded-lg p-4 overflow-x-auto max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200">
                              {Object.keys(previewData[0]).slice(0, 5).map((key) => (
                                <th key={key} className="px-2 py-1 text-left text-slate-600">{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.map((row, index) => (
                              <tr key={index} className="border-b border-slate-100">
                                {Object.values(row).slice(0, 5).map((value, idx) => (
                                  <td key={idx} className="px-2 py-1 text-slate-800">{String(value)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3 justify-center">
                    {!uploadResult && (
                      <Button onClick={handleUpload} disabled={isUploading || !batchDate}>
                        {isUploading ? '上传中...' : '开始导入'}
                      </Button>
                    )}
                    <Button variant="outline" onClick={handleClear}>
                      清除
                    </Button>
                  </div>
                  {isUploading && (
                    <div className="mt-4">
                      <Progress value={uploadProgress} className="w-64 mx-auto" />
                      <p className="text-sm text-slate-500 mt-2">正在解析文件...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-16 h-16 mx-auto text-slate-400" />
                  <div>
                    <p className="text-slate-600">拖拽文件到此处，或</p>
                    <label className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
                      点击选择文件
                      <input
                        type="file"
                        className="hidden"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 上传结果 */}
        {uploadResult && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                导入完成
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-500">导入记录</p>
                  <p className="text-2xl font-bold text-slate-900">{uploadResult.importedCount || uploadResult.imported}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-500">总贷款</p>
                  <p className="text-2xl font-bold text-slate-900">{uploadResult.totalCount || 0}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-500">批次日期</p>
                  <p className="text-2xl font-bold text-slate-900">{uploadResult.batchDate}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={() => router.push('/hsbc-panel/loans')}>
                  查看案件列表
                </Button>
                <Button variant="outline" onClick={() => router.push('/hsbc-panel/dashboard')}>
                  查看仪表盘
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 模板下载 */}
        <Card>
          <CardHeader>
            <CardTitle>导入模板</CardTitle>
            <CardDescription>
              请按照以下字段格式准备您的数据
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="font-medium mb-2">必填字段：</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-slate-600">
                <span>Loan Reference (贷款参考号)</span>
                <span>Merchant ID (商户ID)</span>
                <span>Borrower Name (借款人名称)</span>
                <span>Loan Currency (货币)</span>
                <span>Loan Amount (贷款金额)</span>
                <span>Maturity Date (到期日)</span>
                <span>Balance (余额)</span>
                <span>Pastdue amount (逾期金额)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
