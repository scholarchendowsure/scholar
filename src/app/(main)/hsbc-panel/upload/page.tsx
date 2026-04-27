'use client';

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function HSBCUploadPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.csv'))) {
      setFile(droppedFile);
      setUploadResult(null);
    } else {
      toast.error('请上传 Excel (.xlsx, .xls) 或 CSV 文件');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', 'replace');

    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/hsbc/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (response.ok) {
        setUploadResult(result);
        toast.success(`成功导入 ${result.imported} 条贷款记录`);
      } else {
        toast.error(result.error || '上传失败');
      }
    } catch (error) {
      toast.error('上传出错，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setUploadResult(null);
    setUploadProgress(0);
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
                  <div className="flex gap-3 justify-center">
                    <Button onClick={handleUpload} disabled={isUploading}>
                      {isUploading ? '上传中...' : '开始导入'}
                    </Button>
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
                  <p className="text-2xl font-bold text-slate-900">{uploadResult.imported}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-500">总贷款</p>
                  <p className="text-2xl font-bold text-slate-900">{uploadResult.stats?.totalLoans || 0}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-500">在贷余额</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {formatCurrency(uploadResult.stats?.totalBalance || 0)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-500">逾期总额</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(uploadResult.stats?.totalPastdueAmount || 0)}
                  </p>
                </div>
              </div>

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 text-amber-800 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">部分数据导入失败</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    共 {uploadResult.totalErrors} 条记录导入失败
                  </p>
                </div>
              )}

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

        {/* 文件格式说明 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>文件格式说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="font-medium mb-2">Excel 文件 (.xlsx/.xls)</p>
                <p className="text-sm text-slate-600">
                  请确保第一行为表头，数据从第二行开始。支持的字段请参考模板。
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="font-medium mb-2">CSV 文件 (.csv)</p>
                <p className="text-sm text-slate-600">
                  请使用 UTF-8 编码，并用逗号分隔各字段值。
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-medium text-blue-800 mb-2">注意事项</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 同一商户的多笔贷款请放在同一批次导入</li>
                  <li>• 已存在的贷款记录将根据 Loan Reference 更新</li>
                  <li>• 建议单次导入不超过 10000 条记录</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
