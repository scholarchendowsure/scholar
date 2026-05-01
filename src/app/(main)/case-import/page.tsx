'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  ArrowLeft,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  Plus
} from 'lucide-react';
import Link from 'next/link';

// 案件导入模板字段（按您提供的模板顺序）
const TEMPLATE_HEADERS = [
  '批次号', '贷款单号', '用户ID', '借款人姓名', '产品名称', '平台', '支付公司', '资金方', '资金分类',
  '状态', '贷款状态', '锁定情况', '五级分类', '风险等级', '是否展期', '币种',
  '贷款金额', '总贷款金额', '总在贷余额', '已还款总额', '在贷余额',
  '逾期金额', '逾期本金', '逾期利息', '已还金额', '已还本金', '已还利息', '代偿总额',
  '贷款期限', '贷款期限单位', '贷款日期', '到期日', '逾期天数', '逾期开始时间', '首次逾期时间', '代偿日期',
  '公司名称', '公司地址', '家庭地址', '户籍地址', '借款人手机号', '注册手机号', '联系方式',
  '所属销售', '所属风控', '所属贷后'
];

// 示例数据
const TEMPLATE_EXAMPLE_DATA = [
  'BATCH001', 'LOAN001', 'USER001', '张三', '消费贷', '支付宝', '蚂蚁金服', '招商银行', '个人贷款',
  '待外访', '正常', '否', '正常', '低', '否', 'CNY',
  '100000', '100000', '80000', '20000', '80000',
  '0', '0', '0', '20000', '20000', '0', '0',
  '36', '月', '2024-01-01', '2026-12-31', '0', '', '', '',
  '某某公司', '上海市浦东新区', '上海市黄浦区', '北京市朝阳区', '13800138000', '13900139000', '李四',
  '王五', '赵六', '钱七'
];

export default function CaseImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<any>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      toast.success('文件已选择');
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreviewData([]);
    setImportResult(null);
  };

  const handlePreview = () => {
    toast.info('预览功能开发中');
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('请先选择文件');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // 模拟上传进度
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setProgress(i);
      }

      setImportResult({
        success: true,
        total: 10,
        imported: 8,
        failed: 2,
        errors: [
          { row: 3, reason: '贷款单号不能为空' },
          { row: 7, reason: '逾期金额格式错误' }
        ]
      });
      toast.success('导入完成');
    } catch (error) {
      toast.error('导入失败');
    } finally {
      setUploading(false);
    }
  };

  // 直接下载模板的函数（最简单、最可靠的方式）
  const handleDownloadTemplate = () => {
    try {
      // 生成CSV内容
      const csvContent = [
        TEMPLATE_HEADERS.join(','),
        TEMPLATE_EXAMPLE_DATA.join(',')
      ].join('\n');

      // 添加BOM，确保Excel中文不乱码
      const blob = new Blob(['\uFEFF' + csvContent], { 
        type: 'text/csv;charset=utf-8' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '案件导入模板.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('模板下载成功');
    } catch (error) {
      console.error('下载模板失败:', error);
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

            <div className="flex justify-between items-center mt-6">
              {/* 下载模板按钮 - 放在左侧 */}
              <a 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleDownloadTemplate();
                }}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[hsl(210,95%,40%)] text-white hover:bg-[hsl(210,95%,40%)]/90 h-10 px-4 py-2"
              >
                <Download className="h-4 w-4" />
                下载模板
              </a>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClear} disabled={!file}>
                  清空
                </Button>
                <Button onClick={handlePreview} disabled={!file || uploading}>
                  预览数据
                </Button>
                <Button onClick={handleImport} disabled={!file || uploading}>
                  开始导入
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {previewData.length > 0 && !importResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">数据预览</CardTitle>
                <CardDescription>共 {previewData.length} 条数据</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClear}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  重新选择
                </Button>
                <Button onClick={handleImport} disabled={uploading}>
                  确认导入
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {Object.keys(previewData[0] || {}).map((key) => (
                        <th key={key} className="px-4 py-2 text-left font-medium">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewData.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value, vIndex) => (
                          <td key={vIndex} className="px-4 py-2">
                            {value as string}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewData.length > 10 && (
                <div className="px-4 py-2 text-center text-sm text-muted-foreground border-t">
                  仅显示前 10 条，共 {previewData.length} 条
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Result */}
      {importResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {importResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  导入结果
                </CardTitle>
                <CardDescription>
                  共 {importResult.total} 条，成功 {importResult.imported} 条，失败 {importResult.failed} 条
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClear}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  继续导入
                </Button>
                <Button asChild>
                  <Link href="/cases">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    返回列表
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-[hsl(210,95%,40%)]">
                    {importResult.total}
                  </div>
                  <div className="text-sm text-muted-foreground">总计</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">
                    {importResult.imported}
                  </div>
                  <div className="text-sm text-muted-foreground">成功</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-600">
                    {importResult.failed}
                  </div>
                  <div className="text-sm text-muted-foreground">失败</div>
                </CardContent>
              </Card>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  错误详情
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">行号</th>
                        <th className="px-4 py-2 text-left font-medium">错误原因</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {importResult.errors.map((error: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-2 font-mono">{error.row}</td>
                          <td className="px-4 py-2 text-red-600">{error.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
