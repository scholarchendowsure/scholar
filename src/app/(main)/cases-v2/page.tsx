'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2, RefreshCw, Download, Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Case } from '@/types/case';
import { toast } from 'sonner';
import Link from 'next/link';

// 状态标签配置
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_assign: { label: '待分配', color: 'bg-yellow-100 text-yellow-800' },
  pending_visit: { label: '待外访', color: 'bg-blue-100 text-blue-800' },
  following: { label: '跟进中', color: 'bg-blue-600 text-white' },
  closed: { label: '已结案', color: 'bg-green-100 text-green-800' },
};

// 风险等级配置
const RISK_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: '低', color: 'bg-green-100 text-green-800' },
  medium: { label: '中', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: '高', color: 'bg-orange-100 text-orange-800' },
  critical: { label: '极高', color: 'bg-red-100 text-red-800' },
};

// 金额格式化
const formatMoney = (amount: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [riskLevel, setRiskLevel] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(status !== 'all' && { status }),
        ...(riskLevel !== 'all' && { riskLevel }),
        ...(debouncedSearch && { search: debouncedSearch }),
      });

      const res = await fetch(`/api/cases-v2?${params}`);
      const json: { success: boolean; data: Case[]; total: number; totalPages: number } = await res.json();

      if (json.success) {
        setCases(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      }
    } catch (error) {
      toast.error('获取案件列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, riskLevel, debouncedSearch]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // 清除筛选
  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setRiskLevel('all');
    setPage(1);
  };

  // 下载模板 - 前端直接生成
  const handleDownloadTemplate = () => {
    try {
      // 模板表头（匹配最新的案件管理总表顺序）
      const headers = [
        '批次号', '贷款单号', '用户ID', '借款人姓名', '产品名称', '平台', '支付公司', '资金方', 
        '资金分类', '状态', '贷款状态', '锁定情况', '五级分类', '风险等级', '是否展期', 
        '币种', '贷款金额', '总贷款金额', '总在贷余额', '已还款总额', '在贷余额', '逾期金额', 
        '逾期本金', '逾期利息', '已还金额', '已还本金', '已还利息', '代偿总额', '贷款期限', 
        '贷款期限单位', '贷款日期', '到期日', '逾期天数', '逾期开始时间', '首次逾期时间', '代偿日期', 
        '公司名称', '公司地址', '家庭地址', '户籍地址', '借款人手机号', '注册手机号', '联系方式', 
        '所属销售', '所属风控', '所属贷后'
      ];
      
      // 示例数据
      const exampleRow = [
        '20260501001', 'LD20260501001', 'U001', '张三', '个人消费贷', '支付宝', '支付宝支付', 
        '招商银行', '自有资金', '待分配', '正常', '否', '正常', '低', '否',
        'CNY', '100000', '100000', '80000', '20000', '80000', '0', '0', '0', '20000', '20000',
        '0', '0', '36', '月', '2024-01-01', '2027-01-01', '0', '', '', '', 
        '示例公司', '北京市朝阳区', '北京市海淀区', '北京市西城区', '13800138000', '13900139000', 
        '联系人：李四', '王五', '赵六', '钱七'
      ];
      
      // 生成CSV内容
      const csvContent = '\uFEFF' + headers.join(',') + '\n' + exampleRow.join(',');
      
      // 创建Blob并下载
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '案件导入模板.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('模板下载成功');
    } catch (error) {
      toast.error('下载模板失败');
    }
  };

  // 选择文件
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // 导入案件
  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('请选择要导入的文件');
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      // 读取CSV文件
      const text = await selectedFile.text();
      setImportProgress(30);

      // 解析CSV
      const rows = parseCSV(text);
      if (rows.length < 2) {
        throw new Error('文件格式不正确，至少需要标题行和一条数据');
      }

      setImportProgress(50);

      // 转换数据
      const headers = rows[0];
      const dataRows = rows.slice(1);
      const cases = dataRows.map(row => {
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return convertToCaseFormat(obj);
      });

      setImportProgress(70);

      // 提交导入
      const res = await fetch('/api/cases-v2/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cases }),
      });

      const result = await res.json();
      setImportProgress(100);

      if (result.success) {
        toast.success(`成功导入 ${result.count} 条案件`);
        setShowImportDialog(false);
        setSelectedFile(null);
        fetchCases();
      } else {
        throw new Error(result.error || '导入失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导入失败');
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  // 简单CSV解析
  const parseCSV = (text: string): string[][] => {
    const lines = text.trim().split('\n');
    return lines.map(line => {
      // 简单处理，处理带引号的字段
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  // 转换到Case格式（字段名映射）
  const convertToCaseFormat = (obj: any): any => {
    const fieldMap: Record<string, string> = {
      '批次号': 'batchNo',
      '贷款单号': 'loanNo',
      '用户ID': 'userId',
      '借款人姓名': 'borrowerName',
      '状态': 'status',
      '币种': 'currency',
      '逾期天数': 'overdueDays',
      '贷款期限': 'loanTerm',
      '贷款期限单位': 'loanTermUnit',
      '贷款金额': 'loanAmount',
      '总贷款金额': 'totalLoanAmount',
      '总在贷余额': 'totalOutstandingBalance',
      '已还款总额': 'totalRepaidAmount',
      '在贷余额': 'outstandingBalance',
      '逾期金额': 'overdueAmount',
      '逾期本金': 'overduePrincipal',
      '逾期利息': 'overdueInterest',
      '已还金额': 'repaidAmount',
      '已还本金': 'repaidPrincipal',
      '已还利息': 'repaidInterest',
      '公司名称': 'companyName',
      '公司地址': 'companyAddress',
      '家庭地址': 'homeAddress',
      '户籍地址': 'householdAddress',
      '借款人手机号': 'borrowerPhone',
      '注册手机号': 'registeredPhone',
      '联系方式': 'contactInfo',
      '贷款状态': 'loanStatus',
      '锁定情况': 'isLocked',
      '平台': 'platform',
      '支付公司': 'paymentCompany',
      '五级分类': 'fiveLevelClassification',
      '风险等级': 'riskLevel',
      '所属销售': 'assignedSales',
      '所属风控': 'assignedRiskControl',
      '所属贷后': 'assignedPostLoan',
      '资金方': 'funder',
      '贷款日期': 'loanDate',
      '到期日': 'dueDate',
      '产品名称': 'productName',
      '逾期开始时间': 'overdueStartTime',
      '首次逾期时间': 'firstOverdueTime',
      '资金分类': 'fundCategory',
      '代偿总额': 'compensationAmount',
      '代偿日期': 'compensationDate',
      '是否展期': 'isExtended',
    };

    const result: any = {};
    Object.entries(obj).forEach(([key, value]) => {
      const newKey = fieldMap[key] || key;
      result[newKey] = value;
    });

    return result;
  };

  const hasFilters = search || status !== 'all' || riskLevel !== 'all';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* 头部 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">案件列表</h1>
            <p className="text-sm text-slate-500 mt-1">
              共 {total} 个案件
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              下载模板
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(true)}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              导入案件
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              筛选
              {hasFilters && (
                <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700">
                  {[
                    search && '搜索',
                    status !== 'all' && '状态',
                    riskLevel !== 'all' && '风险',
                  ].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="w-4 h-4" />
              新建案件
            </Button>
          </div>
        </div>
      </div>

      {/* 导入对话框 */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">导入案件</h3>
              <button
                onClick={() => setShowImportDialog(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  选择文件
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                >
                  {selectedFile ? (
                    <div>
                      <FileText className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">点击或拖拽文件到此处</p>
                      <p className="text-xs text-slate-400 mt-1">支持 CSV、Excel 格式</p>
                    </div>
                  )}
                </div>
              </div>

              {importing && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
                    <span>导入中...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowImportDialog(false);
                    setSelectedFile(null);
                  }}
                  disabled={importing}
                >
                  取消
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!selectedFile || importing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {importing ? '导入中...' : '开始导入'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 筛选面板 */}
      <div className="px-6">
        {showFilters && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in slide-in-from-top-2">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-slate-700 mb-2 block">搜索</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="用户ID/姓名/电话"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div className="w-40">
                <label className="text-sm font-medium text-slate-700 mb-2 block">状态</label>
                <Select
                  value={status}
                  onValueChange={(value) => {
                    setStatus(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-40">
                <label className="text-sm font-medium text-slate-700 mb-2 block">风险等级</label>
                <Select
                  value={riskLevel}
                  onValueChange={(value) => {
                    setRiskLevel(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部等级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部等级</SelectItem>
                    {Object.entries(RISK_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="text-slate-600"
                >
                  清除筛选
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 表格区域 */}
      <div className="px-6 py-6">
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400" />
                  <p className="mt-2 text-slate-500">加载中...</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-medium">用户ID</TableHead>
                      <TableHead className="font-medium">借款人姓名</TableHead>
                      <TableHead className="font-medium">币种</TableHead>
                      <TableHead className="font-medium text-right">总在贷金额</TableHead>
                      <TableHead className="font-medium text-right">逾期金额</TableHead>
                      <TableHead className="font-medium">借款人手机号</TableHead>
                      <TableHead className="font-medium">资金方</TableHead>
                      <TableHead className="font-medium">支付公司</TableHead>
                      <TableHead className="font-medium">逾期天数</TableHead>
                      <TableHead className="font-medium">产品名称</TableHead>
                      <TableHead className="font-medium">所属销售</TableHead>
                      <TableHead className="font-medium">所属贷后</TableHead>
                      <TableHead className="font-medium">风险等级</TableHead>
                      <TableHead className="font-medium w-24">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={14} className="text-center py-12 text-slate-500">
                          暂无案件数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      cases.map((caseItem) => (
                        <TableRow key={caseItem.id} className="hover:bg-slate-50">
                          <TableCell className="font-mono text-sm">{caseItem.userId}</TableCell>
                          <TableCell className="font-medium">{caseItem.borrowerName}</TableCell>
                          <TableCell>{caseItem.currency}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatMoney(caseItem.totalOutstandingBalance)}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${caseItem.overdueAmount > 0 ? 'text-red-600' : ''}`}>
                            {formatMoney(caseItem.overdueAmount)}
                          </TableCell>
                          <TableCell>{caseItem.borrowerPhone}</TableCell>
                          <TableCell>{caseItem.funder}</TableCell>
                          <TableCell>{caseItem.paymentCompany}</TableCell>
                          <TableCell className={caseItem.overdueDays > 0 ? 'text-red-600 font-medium' : ''}>
                            {caseItem.overdueDays > 0 ? `${caseItem.overdueDays}天` : '-'}
                          </TableCell>
                          <TableCell>{caseItem.productName}</TableCell>
                          <TableCell>{caseItem.assignedSales}</TableCell>
                          <TableCell>{caseItem.assignedPostLoan}</TableCell>
                          <TableCell>
                            {caseItem.riskLevel && (
                              <Badge className={RISK_CONFIG[caseItem.riskLevel]?.color || 'bg-slate-100 text-slate-800'}>
                                {RISK_CONFIG[caseItem.riskLevel]?.label || caseItem.riskLevel}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/cases-v2/${caseItem.id}`} className="cursor-pointer">
                                    <Eye className="w-4 h-4 mr-2" />
                                    查看详情
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="w-4 h-4 mr-2" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage(Math.max(1, page - 1))}
                    className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setPage(pageNum)}
                        isActive={page === pageNum}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}
