'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, ArrowRight } from 'lucide-react';

export default function CaseImport() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 下载模板
  const handleDownloadTemplate = () => {
    const headers = [
      '批次号', '贷款单号', '用户ID', '借款人姓名', '产品名称', '平台',
      '支付公司', '资金方', '资金分类', '状态', '贷款状态', '锁定情况',
      '五级分类', '风险等级', '是否展期', '币种', '贷款金额', '总贷款金额',
      '总在贷余额', '已还款总额', '在贷余额', '逾期金额', '逾期本金',
      '逾期利息', '已还金额', '已还本金', '已还利息', '代偿总额',
      '贷款期限', '贷款期限单位', '贷款日期', '到期日', '逾期天数',
      '逾期开始时间', '首次逾期时间', '代偿日期', '公司名称', '公司地址',
      '家庭地址', '户籍地址', '借款人手机号', '注册手机号', '联系方式',
      '所属销售', '所属风控', '所属贷后'
    ];

    // 生成示例数据
    const sampleData = [
      ['20250501', 'LOAN20250501001', 'USR001', '张三', '个人消费贷', 'APP1',
       '支付公司A', '银行A', '自营', '待分配', '正常', '否', '正常',
       '低', '否', 'CNY', '100000', '100000', '50000', '50000',
       '50000', '0', '0', '0', '50000', '45000', '5000', '0',
       '12', '月', '2024-01-01', '2025-01-01', '0', '', '', '',
       '某某公司', '某某地址', '家庭地址', '户籍地址', '13800138000',
       '13800138000', '13800138000', '销售A', '风控A', '贷后A']
    ];

    const csvContent = [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '案件导入模板.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success('模板下载成功！');
  };

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setPreviewData(null);
    setImportResult(null);
    setShowPreview(false);
    
    if (selectedFile) {
      await handlePreview(selectedFile);
    }
  };

  // 预览文件
  const handlePreview = async (selectedFile: File) => {
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await fetch('/api/cases-v2/preview', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        setPreviewData(result.data);
        setShowPreview(true);
        toast.success(`文件解析成功，共 ${result.data.totalRows} 条数据`);
      } else {
        toast.error(result.error || '预览失败');
      }
    } catch (error) {
      toast.error('文件预览失败');
      console.error('Preview error:', error);
    }
  };

  // 处理导入
  const handleImport = async () => {
    if (!file) {
      toast.error('请选择文件');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/cases-v2/import', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        setImportResult(result.data);
        toast.success(`导入完成！成功 ${result.data.success} 条，失败 ${result.data.failed} 条`);
      } else {
        toast.error(result.error || '导入失败');
      }
    } catch (error) {
      toast.error('导入失败，请重试');
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">案件导入</h1>
        <p className="text-muted-foreground mt-1">批量导入案件数据到系统</p>
      </div>

      <div className="grid gap-6">
        {/* 下载模板 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              下载导入模板
            </CardTitle>
            <CardDescription>
              下载标准模板文件，按照模板格式整理数据
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleDownloadTemplate}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              下载模板
            </Button>
          </CardContent>
        </Card>

        {/* 上传文件 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              上传文件
            </CardTitle>
            <CardDescription>
              选择整理好的CSV文件进行导入
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="secondary"
              >
                <Upload className="h-4 w-4 mr-2" />
                选择文件
              </Button>
              {file && (
                <div className="flex items-center gap-2 text-sm">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  <span>{file.name}</span>
                </div>
              )}
            </div>
            
            {/* 下载模板 - 移动到上传区域下方 */}
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadTemplate}
                className="text-primary hover:text-primary"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                没有模板？点击下载
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 预览数据 */}
        {showPreview && previewData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                数据预览（前20条）
              </CardTitle>
              <CardDescription>
                文件：{previewData.filename}，共 {previewData.totalRows} 条数据
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {previewData.headers.slice(0, 10).map((header: string, index: number) => (
                        <th key={index} className="px-3 py-2 text-left font-medium text-muted-foreground">
                          {header}
                        </th>
                      ))}
                      {previewData.headers.length > 10 && (
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          ...
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewData.previewRows.map((row: any, rowIndex: number) => (
                      <tr key={rowIndex} className="hover:bg-muted/50">
                        {previewData.headers.slice(0, 10).map((header: string, colIndex: number) => (
                          <td key={colIndex} className="px-3 py-2 text-foreground">
                            {row[header] || '-'}
                          </td>
                        ))}
                        {previewData.headers.length > 10 && (
                          <td className="px-3 py-2 text-muted-foreground">
                            ...
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 flex gap-3">
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? '导入中...' : '确认导入'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 导入结果 */}
        {importResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                导入结果
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{importResult.total}</div>
                  <div className="text-sm text-muted-foreground">总数据</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{importResult.success}</div>
                  <div className="text-sm text-green-700 dark:text-green-300">成功</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{importResult.failed}</div>
                  <div className="text-sm text-red-700 dark:text-red-300">失败</div>
                </div>
              </div>

              {importResult.failedCases.length > 0 && (
                <div>
                  <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    失败详情
                  </h4>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {importResult.failedCases.map((item: any, index: number) => (
                      <div key={index} className="text-sm text-red-700 dark:text-red-300 mb-1">
                        第{item.row}行：{item.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.successCases.length > 0 && (
                <div className="mt-4">
                  <Button variant="ghost" onClick={() => window.location.href = '/cases-v2'}>
                    查看案件列表
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 没有预览时显示导入按钮 */}
        {file && !showPreview && (
          <Card>
            <CardContent className="pt-6">
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? '导入中...' : '开始导入'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
