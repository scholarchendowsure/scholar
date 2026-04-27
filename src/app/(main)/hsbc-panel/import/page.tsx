'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Upload, FileSpreadsheet, CheckCircle, AlertCircle, XCircle,
  Download, Trash2, RefreshCw, X, Eye, Info
} from 'lucide-react';
import { toast } from 'sonner';

interface ImportRow {
  'Loan Reference'?: string;
  'Merchant ID'?: string;
  'Borrower Name'?: string;
  'Loan Start Date'?: string;
  'Loan Currency'?: string;
  'Loan Amount'?: string;
  'Loan Interest'?: string;
  'Total Interest Rate'?: string;
  'Loan Tenor'?: string;
  'Maturity Date'?: string;
  'Balance'?: string;
  'Pastdue amount'?: string;
  // 原始数据
  loanReference?: string;
  merchantId?: string;
  borrowerName?: string;
  [key: string]: string | undefined;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export default function HSBCImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const pageSize = 10;

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls') && !selectedFile.name.endsWith('.csv')) {
        toast.error('请选择 Excel 或 CSV 文件');
        return;
      }
      setFile(selectedFile);
      setImportResult(null);
      parseFile(selectedFile);
    }
  }, []);

  const parseFile = async (file: File) => {
    try {
      // 简单解析 - 实际项目中应使用 xlsx 库
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('文件格式错误，请检查文件内容');
        return;
      }

      // 解析表头
      const headers = parseCSVLine(lines[0]);
      
      // 解析数据行
      const data: ImportRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length > 0) {
          const row: ImportRow = {};
          headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim() || '';
            // 兼容无表头格式
            if (!row.loanReference && index === 0) row.loanReference = values[index]?.trim();
            if (!row.merchantId && index === 1) row.merchantId = values[index]?.trim();
            if (!row.borrowerName && index === 2) row.borrowerName = values[index]?.trim();
          });
          // 同时设置兼容字段
          row.loanReference = row['Loan Reference'] || row.loanReference;
          row.merchantId = row['Merchant ID'] || row.merchantId;
          row.borrowerName = row['Borrower Name'] || row.borrowerName;
          row['Loan Currency'] = row['Loan Currency'] || 'USD';
          row['Loan Amount'] = row[' Loan Amount '] || row['Loan Amount'] || row.loanReference;
          row.Balance = row.Balance || '0';
          row['Pastdue amount'] = row['Pastdue amount'] || '0';
          
          if (row.merchantId || row.loanReference) {
            data.push(row);
          }
        }
      }

      if (data.length === 0) {
        toast.error('未找到有效数据');
        return;
      }

      setPreviewData(data);
      validateData(data);
      setShowPreview(true);
      toast.success(`成功解析 ${data.length} 条记录`);
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('文件解析失败');
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const validateData = (data: ImportRow[]) => {
    const errors: ValidationError[] = [];
    
    data.forEach((row, index) => {
      if (!row.merchantId || row.merchantId.trim() === '') {
        errors.push({ row: index + 2, field: 'Merchant ID', message: '商户ID不能为空' });
      }
      if (!row.loanReference || row.loanReference.trim() === '') {
        errors.push({ row: index + 2, field: 'Loan Reference', message: '贷款编号不能为空' });
      }
      const amount = parseFloat(String(row['Loan Amount'] || row[' Loan Amount '] || '0').replace(/,/g, ''));
      if (isNaN(amount) || amount < 0) {
        errors.push({ row: index + 2, field: 'Loan Amount', message: '贷款金额格式错误' });
      }
    });

    setValidationErrors(errors);
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast.error('没有可导入的数据');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/hsbc/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loans: previewData,
          action: importMode,
        }),
      });

      const result = await res.json();
      
      if (result.success) {
        setImportResult(result);
        toast.success(result.message);
        // 刷新数据
        window.location.href = '/hsbc-panel/cases';
      } else {
        toast.error(result.error || '导入失败');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('导入失败，请重试');
    } finally {
      setImporting(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setImportResult(null);
      parseFile(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const downloadTemplate = () => {
    const template = `Loan Reference,Merchant ID,Borrower Name,Loan Start Date,Loan Currency,Loan Amount,Loan Interest,Total Interest Rate,Loan Tenor,Maturity Date,Balance,Pastdue amount
LAEAM1017710,63257,ZHONGBO INTL TRADE CO LIMITED,08-Apr-2024,USD,250000.00,90D SOFR TERM + 3%,8.30184,91D,08-Jul-2024,250000.00,0
WCTHK1081926,68537,RONDAFUL (HK) INTERNATIONAL LIMITED,23-Feb-2024,CNY,1971109.85,90D CNY HBR + 1.25%,4.60394,90D,23-May-2024,1971109.85,0`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '汇丰贷款导入模板.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('模板下载成功');
  };

  const paginatedData = previewData.slice((previewPage - 1) * pageSize, previewPage * pageSize);
  const totalPages = Math.ceil(previewData.length / pageSize);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">汇丰数据导入</h1>
          <p className="text-sm text-slate-500 mt-1">上传 Excel 文件导入汇丰贷款数据</p>
        </div>
      </div>

      {/* 上传区域 */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-6">
          <div
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">
              {file ? file.name : '点击或拖拽文件到此处上传'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              支持 Excel (.xlsx, .xls) 和 CSV 格式
            </p>
            <Button variant="outline" onClick={downloadTemplate} className="gap-2">
              <Download className="w-4 h-4" />
              下载导入模板
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 数据预览 */}
      {previewData.length > 0 && (
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">数据预览</CardTitle>
                <Badge className="bg-blue-100 text-blue-700">{previewData.length} 条记录</Badge>
                {validationErrors.length > 0 && (
                  <Badge className="bg-red-100 text-red-700">
                    {validationErrors.length} 个错误
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Select value={importMode} onValueChange={(v: 'replace' | 'merge') => setImportMode(v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="replace">覆盖导入</SelectItem>
                    <SelectItem value="merge">增量导入</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="gap-2">
                  <Eye className="w-4 h-4" />
                  {showPreview ? '隐藏' : '显示'}预览
                </Button>
              </div>
            </div>
            <CardDescription>
              {importMode === 'replace' ? '覆盖模式：将替换所有现有数据' : '增量模式：仅导入新数据，保留现有数据'}
            </CardDescription>
          </CardHeader>

          {showPreview && (
            <CardContent>
              {/* 错误提示 */}
              {validationErrors.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-800">数据验证错误</h4>
                      <ul className="mt-2 text-sm text-red-600 space-y-1">
                        {validationErrors.slice(0, 5).map((error, idx) => (
                          <li key={idx}>
                            第 {error.row} 行 - {error.field}: {error.message}
                          </li>
                        ))}
                        {validationErrors.length > 5 && (
                          <li>...还有 {validationErrors.length - 5} 个错误</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 数据表格 */}
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>贷款编号</TableHead>
                      <TableHead>商户ID</TableHead>
                      <TableHead>商户名称</TableHead>
                      <TableHead>币种</TableHead>
                      <TableHead className="text-right">贷款金额</TableHead>
                      <TableHead className="text-right">余额</TableHead>
                      <TableHead className="text-right">逾期金额</TableHead>
                      <TableHead>到期日</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((row, index) => {
                      const amount = parseFloat(String(row['Loan Amount'] || row[' Loan Amount '] || '0').replace(/,/g, ''));
                      const balance = parseFloat(String(row.Balance || '0').replace(/,/g, ''));
                      const pastdue = parseFloat(String(row['Pastdue amount'] || '0').replace(/,/g, ''));
                      
                      return (
                        <TableRow key={index}>
                          <TableCell className="text-slate-500">{(previewPage - 1) * pageSize + index + 1}</TableCell>
                          <TableCell className="font-mono text-sm">{row['Loan Reference'] || row.loanReference}</TableCell>
                          <TableCell className="font-mono text-sm">{row['Merchant ID'] || row.merchantId}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{row['Borrower Name'] || row.borrowerName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={row['Loan Currency'] === 'CNY' ? 'text-blue-600' : 'text-amber-600'}>
                              {row['Loan Currency'] || 'USD'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${pastdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {pastdue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-sm">{row['Maturity Date']}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-slate-500">
                    显示 {(previewPage - 1) * pageSize + 1} - {Math.min(previewPage * pageSize, previewData.length)}，共 {previewData.length} 条
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                      disabled={previewPage === 1}
                    >
                      上一页
                    </Button>
                    <span className="text-sm text-slate-600">
                      第 {previewPage} / {totalPages} 页
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewPage(p => Math.min(totalPages, p + 1))}
                      disabled={previewPage === totalPages}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}

              {/* 导入按钮 */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                <Button variant="outline" onClick={() => {
                  setPreviewData([]);
                  setFile(null);
                  setShowPreview(false);
                }}>
                  取消
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={importing || validationErrors.length > 0}
                  className="gap-2"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      导入中...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      确认导入
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* 导入结果 */}
      {importResult && (
        <Card className={importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {importResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <div>
                <p className={`font-medium ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {importResult.message}
                </p>
                {importResult.count !== undefined && (
                  <p className="text-sm text-green-600 mt-1">
                    成功导入 {importResult.count} 条记录
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 导入说明 */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-500 mt-0.5" />
            <div className="text-sm text-slate-600 space-y-2">
              <h4 className="font-medium text-slate-700">导入说明</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>支持 Excel (.xlsx, .xls) 和 CSV 格式文件</li>
                <li>文件大小不超过 10MB</li>
                <li>覆盖导入将替换所有现有数据，请谨慎操作</li>
                <li>增量导入只添加新数据，不会修改现有记录</li>
                <li>必填字段：贷款编号 (Loan Reference)、商户ID (Merchant ID)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
