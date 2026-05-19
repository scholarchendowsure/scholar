'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, ChevronDown, ChevronUp, Eye, Edit, Trash2, MoreHorizontal, Upload, LayoutDashboard, Building2, Columns, FileUp, Download, Loader2, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { HSBCLoan, HSBCLoanFilter, calcPastdueAmount, calcBalance } from '@/lib/hsbc-loan';
import * as XLSX from 'xlsx';

interface RepaymentInfo {
  loanReference: string;
  merchantName?: string;
  borrowerName: string;
  dueDate: string;
  actualDate: string;
  amount: number;
  currency: string;
  isOverdue: boolean;
}

// 还款日期筛选类型
type RepaymentFilterType = 'all' | 'on_time' | 'late';

interface MerchantData {
  merchantId: string;
  merchantName: string;
  totalAmount: number;
  totalBalance: number;
  overdueAmount: number;
  loanCount: number;
  overdueCount: number;
  loans?: HSBCLoan[];
}

export default function HSBCLoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<HSBCLoan[]>([]);
  const [merchants, setMerchants] = useState<MerchantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMerchant, setExpandedMerchant] = useState<string | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<HSBCLoan | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filter, setFilter] = useState<HSBCLoanFilter>({
    page: 1,
    pageSize: 50,
  });
  const [searchInput, setSearchInput] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 0 });
  const [deduplicateMerchant, setDeduplicateMerchant] = useState(false);
  const [batchDate, setBatchDate] = useState<string>('all');
  const [batchDates, setBatchDates] = useState<string[]>([]);

  // 还款日期筛选状态
  const [repaymentDate, setRepaymentDate] = useState<string>('');
  const [repaymentFilterType, setRepaymentFilterType] = useState<RepaymentFilterType>('all');
  const [repaymentResults, setRepaymentResults] = useState<RepaymentInfo[]>([]);
  const [showRepaymentCard, setShowRepaymentCard] = useState(false);

  // 批量查询状态
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取批次日期
  const fetchBatchDates = useCallback(async () => {
    try {
      const res = await fetch('/api/hsbc/batch-dates');
      const data = await res.json();
      setBatchDates(data.data || []);
    } catch (error) {
      console.error('获取批次日期失败:', error);
    }
  }, []);

  // 筛选还款记录
  const handleRepaymentFilter = useCallback(async () => {
    if (!repaymentDate) {
      toast.error('请选择还款日期');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('batchDate', batchDate !== 'all' ? batchDate : '');
      
      const res = await fetch(`/api/hsbc?${params.toString()}`);
      const data = await res.json();
      const allLoans: HSBCLoan[] = data.data || [];

      // 从所有贷款中提取还款记录
      const results: RepaymentInfo[] = [];
      
      allLoans.forEach(loan => {
        if (loan.repaymentSchedule && loan.repaymentSchedule.length > 0) {
          loan.repaymentSchedule.forEach(record => {
            // 检查实际还款日期是否匹配选择的日期
            if (record.actualDate && record.actualDate.startsWith(repaymentDate)) {
              // 判断是否逾期
              const isOverdue = record.actualDate > record.date;
              
              // 根据筛选类型过滤
              if (repaymentFilterType === 'on_time' && isOverdue) return;
              if (repaymentFilterType === 'late' && !isOverdue) return;

              results.push({
                loanReference: loan.loanReference,
                merchantName: loan.merchantName,
                borrowerName: loan.borrowerName,
                dueDate: record.date,
                actualDate: record.actualDate,
                amount: record.actualAmount || record.amount,
                currency: loan.loanCurrency,
                isOverdue,
              });
            }
          });
        }
      });

      // 按实际还款日期排序
      results.sort((a, b) => a.actualDate.localeCompare(b.actualDate));
      
      setRepaymentResults(results);
      setShowRepaymentCard(true);
      toast.success(`找到 ${results.length} 条还款记录`);
    } catch (error) {
      toast.error('筛选失败');
    } finally {
      setLoading(false);
    }
  }, [repaymentDate, repaymentFilterType, batchDate]);

  // 导出还款记录
  const handleExportRepayments = () => {
    if (repaymentResults.length === 0) {
      toast.error('没有可导出的数据');
      return;
    }

    const exportData = repaymentResults.map(r => ({
      贷款编号: r.loanReference,
      商户名称: r.merchantName || '',
      借款人: r.borrowerName,
      计划还款日: r.dueDate,
      实际还款日: r.actualDate,
      还款金额: r.amount,
      货币: r.currency,
      还款类型: r.isOverdue ? '逾期后还款' : '未逾期还款',
    }));

    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, '还款记录');
    XLSX.writeFile(newWorkbook, `还款记录_${repaymentDate}.xlsx`);
    toast.success('导出成功！');
  };

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.search) params.set('search', filter.search);
      if (filter.currency && filter.currency !== 'all') params.set('currency', filter.currency);
      if (filter.status && filter.status !== 'all') params.set('status', filter.status);
      if (filter.hasOverdue) params.set('hasOverdue', 'true');
      if (batchDate && batchDate !== 'all') params.set('batchDate', batchDate);
      params.set('page', String(filter.page || 1));
      params.set('pageSize', String(filter.pageSize || 50));

      const res = await fetch(`/api/hsbc?${params.toString()}`);
      const data = await res.json();
      let merchantsData = data.merchants || [];
      
      // 去重商户ID功能：只保留一个商户ID，金额合计计算
      if (deduplicateMerchant && merchantsData.length > 0) {
        const merchantMap = new Map();
        merchantsData.forEach((m: MerchantData) => {
          if (!merchantMap.has(m.merchantId)) {
            merchantMap.set(m.merchantId, { ...m });
          } else {
            const existing = merchantMap.get(m.merchantId);
            existing.totalAmount += m.totalAmount;
            existing.totalBalance += m.totalBalance;
            existing.overdueAmount += m.overdueAmount;
            existing.loanCount = (existing.loanCount || 1) + (m.loanCount || 1);
            existing.overdueCount = (existing.overdueCount || 0) + (m.overdueCount || 0);
          }
        });
        merchantsData = Array.from(merchantMap.values());
      }
      
      setLoans(data.data || []);
      setMerchants(merchantsData);
      setPagination(data.pagination || { page: 1, pageSize: 50, total: 0, totalPages: 0 });
    } catch (error) {
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [filter, deduplicateMerchant]);

  useEffect(() => {
    fetchBatchDates();
  }, [fetchBatchDates]);

  useEffect(() => {
    loadData();
  }, [loadData, batchDate]);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter(prev => ({ ...prev, search: searchInput, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const formatCurrency = (amount: number, currency: string = 'CNY') => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleDelete = async (loan: HSBCLoan) => {
    if (!confirm(`确定要删除贷款 ${loan.loanReference} 吗？`)) return;
    
    try {
      const res = await fetch(`/api/hsbc/loans/${loan.loanReference}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('删除成功');
        loadData();
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const viewDetail = (loan: HSBCLoan) => {
    setSelectedLoan(loan);
    setShowDetail(true);
  };

  // 解析offer_dataset字段
  const parseOfferDataset = (dataset: string | null) => {
    if (!dataset) {
      return {
        绑定店铺数量: '',
        未来应收在贷金额: '',
        未来应收: '',
        在贷金额: '',
        未来应收库存在贷金额: '',
        库存金额: '',
      };
    }
    try {
      const data = JSON.parse(dataset);
      return {
        绑定店铺数量: data.bind_shop_count?.toString() || '',
        未来应收在贷金额: data.future_receive_or_loan_amount?.toString() || '',
        未来应收: data.future_receive?.toString() || '',
        在贷金额: data.loan_amount?.toString() || '',
        未来应收库存在贷金额: data.future_receive_and_inventory_or_loan_amount?.toString() || '',
        库存金额: data.inventory_amount?.toString() || '',
      };
    } catch {
      return {
        绑定店铺数量: '',
        未来应收在贷金额: '',
        未来应收: '',
        在贷金额: '',
        未来应收库存在贷金额: '',
        库存金额: '',
      };
    }
  };

  // 处理批量查询
  const handleBatchQuery = async () => {
    if (!batchFile) {
      toast.error('请选择Excel文件');
      return;
    }

    setBatchLoading(true);
    setBatchProgress(0);
    setBatchResults([]);

    try {
      // 读取Excel文件
      const arrayBuffer = await batchFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // 提取loan_code列表
      const loanCodes: string[] = [];
      jsonData.forEach((row: any) => {
        if (row.loan_code) {
          loanCodes.push(row.loan_code.toString());
        }
      });

      if (loanCodes.length === 0) {
        toast.error('未找到loan_code列或列为空');
        setBatchLoading(false);
        return;
      }

      toast.info(`开始查询 ${loanCodes.length} 条记录...`);

      // 分批处理
      const batchSize = 50;
      const allResults: any[] = [];

      for (let i = 0; i < loanCodes.length; i += batchSize) {
        const batch = loanCodes.slice(i, i + batchSize);
        setBatchProgress(Math.round((i / loanCodes.length) * 100));

        try {
          const response = await fetch('/api/batch-loan-query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loanCodes: batch }),
          });
          const data = await response.json();
          if (data.success) {
            allResults.push(...data.data);
          }
        } catch (e) {
          console.error('批次查询失败:', e);
        }
      }

      setBatchProgress(100);
      setBatchResults(allResults);
      toast.success(`查询完成，共 ${allResults.length} 条记录`);
    } catch (e) {
      toast.error('处理文件失败: ' + (e as Error).message);
    } finally {
      setBatchLoading(false);
    }
  };

  // 导出查询结果
  const handleExportResults = () => {
    if (batchResults.length === 0) {
      toast.error('没有可导出的数据');
      return;
    }

    const exportData = batchResults.map((result) => {
      const parsed = parseOfferDataset(result.offer_dataset);
      return {
        loan_code: result.loan_code,
        application_code: result.application_code || '',
        offer_id: result.offer_ids?.join(', ') || '',
        update_time: result.update_time || '',
        绑定店铺数量: parsed.绑定店铺数量,
        未来应收在贷金额: parsed.未来应收在贷金额,
        未来应收: parsed.未来应收,
        在贷金额: parsed.在贷金额,
        未来应收库存在贷金额: parsed.未来应收库存在贷金额,
        库存金额: parsed.库存金额,
      };
    });

    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, '查询结果');

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(newWorkbook, `贷款数据查询结果_${timestamp}.xlsx`);
    toast.success('导出成功！');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">汇丰贷款案件</h1>
            <p className="text-slate-600 mt-1">
              共 {pagination.total} 条记录，{merchants.length} 家商户
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push('/hsbc-panel/dashboard')}>
              <LayoutDashboard className="w-4 h-4 mr-2" />
              仪表盘
            </Button>
            <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileUp className="w-4 h-4 mr-2" />
                  批量查询
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>批量贷款数据查询</DialogTitle>
                  <DialogDescription>
                    上传包含loan_code列的Excel文件，系统将自动查询并导出结果
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">选择Excel文件</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setBatchFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {batchFile && (
                      <p className="mt-2 text-sm text-gray-600">
                        已选择: {batchFile.name}
                      </p>
                    )}
                  </div>

                  {batchLoading && (
                    <div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${batchProgress}%` }}
                        />
                      </div>
                      <p className="mt-2 text-sm text-gray-600 text-center">
                        查询进度: {batchProgress}%
                      </p>
                    </div>
                  )}

                  {batchResults.length > 0 && (
                    <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                      <p className="text-sm font-medium mb-2">查询结果 (共 {batchResults.length} 条)</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>loan_code</TableHead>
                            <TableHead>application_code</TableHead>
                            <TableHead>offer数量</TableHead>
                            <TableHead>绑定店铺</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {batchResults.slice(0, 10).map((result, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs">{result.loan_code}</TableCell>
                              <TableCell className="font-mono text-xs">{result.application_code || '-'}</TableCell>
                              <TableCell>{result.offer_ids?.length || 0}</TableCell>
                              <TableCell>{result.绑定店铺数量 || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {batchResults.length > 10 && (
                        <p className="mt-2 text-sm text-gray-500">仅显示前10条...</p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
                      关闭
                    </Button>
                    <Button onClick={handleBatchQuery} disabled={!batchFile || batchLoading}>
                      {batchLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          查询中...
                        </>
                      ) : (
                        '开始查询'
                      )}
                    </Button>
                    {batchResults.length > 0 && (
                      <Button onClick={handleExportResults}>
                        <Download className="w-4 h-4 mr-2" />
                        导出结果
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={() => router.push('/hsbc-panel/upload')}>
              <Upload className="w-4 h-4 mr-2" />
              导入数据
            </Button>
          </div>
        </div>

        {/* 还款日期筛选卡片 */}
        <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">还款日期筛选</CardTitle>
            </div>
            <CardDescription>按实际还款日期筛选，查看未逾期或逾期后的还款记录</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">还款日期</label>
                <Input
                  type="date"
                  value={repaymentDate}
                  onChange={(e) => setRepaymentDate(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="w-[200px]">
                <label className="text-sm font-medium mb-2 block">还款类型</label>
                <Select value={repaymentFilterType} onValueChange={(v) => setRepaymentFilterType(v as RepaymentFilterType)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="on_time">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>未逾期还款</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="late">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>逾期后还款</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleRepaymentFilter} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    查询中...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    查询
                  </>
                )}
              </Button>
              {showRepaymentCard && repaymentResults.length > 0 && (
                <Button variant="outline" onClick={handleExportRepayments}>
                  <Download className="w-4 h-4 mr-2" />
                  导出
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 还款记录结果 */}
        {showRepaymentCard && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>还款记录查询结果</CardTitle>
                  <CardDescription>
                    {repaymentDate} 共 {repaymentResults.length} 条记录
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowRepaymentCard(false)}>
                  关闭
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {repaymentResults.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>未找到还款记录</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 统计摘要 */}
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span>未逾期:</span>
                      <span className="font-semibold text-green-700">
                        {repaymentResults.filter(r => !r.isOverdue).length} 条
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>逾期后:</span>
                      <span className="font-semibold text-amber-700">
                        {repaymentResults.filter(r => r.isOverdue).length} 条
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                      <span className="text-blue-700">总金额:</span>
                      <span className="font-semibold text-blue-700 font-mono">
                        {formatCurrency(
                          repaymentResults.reduce((sum, r) => sum + r.amount, 0),
                          repaymentResults[0]?.currency || 'CNY'
                        )}
                      </span>
                    </div>
                  </div>

                  {/* 还款记录表格 */}
                  <div className="max-h-[400px] overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader className="sticky top-0 bg-slate-100">
                        <TableRow>
                          <TableHead>还款订单号</TableHead>
                          <TableHead>贷款编号</TableHead>
                          <TableHead>借款人</TableHead>
                          <TableHead>计划还款日</TableHead>
                          <TableHead>实际还款日</TableHead>
                          <TableHead>还款金额</TableHead>
                          <TableHead>状态</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {repaymentResults.map((record, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-sm">
                              {record.actualDate.replace(/-/g, '')}_{idx + 1}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{record.loanReference}</TableCell>
                            <TableCell>{record.borrowerName}</TableCell>
                            <TableCell>{record.dueDate}</TableCell>
                            <TableCell className="font-mono">{record.actualDate}</TableCell>
                            <TableCell className="font-mono">
                              {formatCurrency(record.amount, record.currency)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={record.isOverdue ? 'default' : 'secondary'} className={record.isOverdue ? 'bg-amber-500' : 'bg-green-500'}>
                                {record.isOverdue ? '逾期后还款' : '未逾期'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 筛选栏 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="搜索贷款编号、商户名称..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={batchDate} onValueChange={setBatchDate}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="选择批次日期" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部批次</SelectItem>
                  {batchDates.map(date => (
                    <SelectItem key={date} value={date}>{date}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filter.currency || 'all'}
                onValueChange={(value) => setFilter(prev => ({ ...prev, currency: value as any, page: 1 }))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="货币" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部货币</SelectItem>
                  <SelectItem value="CNY">人民币 (CNY)</SelectItem>
                  <SelectItem value="USD">美元 (USD)</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filter.status || 'all'}
                onValueChange={(value) => setFilter(prev => ({ ...prev, status: value as any, page: 1 }))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">正常</SelectItem>
                  <SelectItem value="overdue">逾期</SelectItem>
                  <SelectItem value="settled">已结清</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 商户分组列表 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">商户分组列表</h2>
          <Button
            variant={deduplicateMerchant ? "default" : "outline"}
            size="sm"
            onClick={() => setDeduplicateMerchant(!deduplicateMerchant)}
            className="gap-2"
          >
            <Building2 className="w-4 h-4" />
            {deduplicateMerchant ? "已去重" : "去重商户"}
          </Button>
        </div>
        <div className="space-y-4">
          {merchants.map((merchant) => (
            <Card key={merchant.merchantId}>
              <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpandedMerchant(expandedMerchant === merchant.merchantId ? null : merchant.merchantId)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{merchant.merchantName}</CardTitle>
                      <Badge variant="outline">商户ID: {merchant.merchantId}</Badge>
                      {merchant.overdueCount > 0 && (
                        <Badge variant="destructive">{merchant.overdueCount} 笔逾期</Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      {merchant.loanCount} 笔贷款 | 
                      总金额: {formatCurrency(merchant.totalAmount)} | 
                      余额: {formatCurrency(merchant.totalBalance)} | 
                      逾期: {formatCurrency(merchant.overdueAmount)}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    {expandedMerchant === merchant.merchantId ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              
              {expandedMerchant === merchant.merchantId && (
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>贷款编号</TableHead>
                        <TableHead>贷款金额</TableHead>
                        <TableHead>已还款</TableHead>
                        <TableHead>期限</TableHead>
                        <TableHead>到期日</TableHead>
                        <TableHead>余额</TableHead>
                        <TableHead>逾期金额</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(merchant.loans || []).map((loan: HSBCLoan) => (
                        <TableRow key={loan.id}>
                          <TableCell className="font-mono text-sm">{loan.loanReference}</TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(loan.loanAmount, loan.loanCurrency)}
                          </TableCell>
                          <TableCell className="font-mono text-green-600">
                            {formatCurrency(loan.totalRepaid ?? 0, loan.loanCurrency)}
                          </TableCell>
                          <TableCell>{loan.loanTenor}</TableCell>
                          <TableCell>{loan.maturityDate}</TableCell>
                          <TableCell className="font-mono">{formatCurrency(calcBalance(loan), loan.loanCurrency)}</TableCell>
                          <TableCell className={`font-mono ${calcPastdueAmount(loan) > 0 ? 'text-red-600' : ''}`}>
                            {formatCurrency(calcPastdueAmount(loan), loan.loanCurrency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={loan.status === 'overdue' ? 'destructive' : 'secondary'}>
                              {loan.status === 'overdue' ? '逾期' : '正常'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => viewDetail(loan)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  查看详情
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/hsbc-panel/loans/${loan.loanReference}`)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDelete(loan)} className="text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          ))}

          {merchants.length === 0 && !loading && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-500">暂无数据</p>
                <Button className="mt-4" onClick={() => router.push('/hsbc-panel/upload')}>
                  导入数据
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 分页 */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => setFilter(prev => ({ ...prev, page: prev.page! - 1 }))}
            >
              上一页
            </Button>
            <span className="flex items-center px-4 text-sm text-slate-600">
              第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 条
            </span>
            <Button
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setFilter(prev => ({ ...prev, page: prev.page! + 1 }))}
            >
              下一页
            </Button>
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedLoan && (
            <>
              <DialogHeader>
                <DialogTitle>贷款详情</DialogTitle>
                <DialogDescription>
                  贷款编号: {selectedLoan.loanReference}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">基本信息</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">商户ID:</span>
                      <span className="ml-2 font-mono">{selectedLoan.merchantId}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">借款人:</span>
                      <span className="ml-2">{selectedLoan.borrowerName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">贷款编号:</span>
                      <span className="ml-2 font-mono">{selectedLoan.loanReference}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">状态:</span>
                      <Badge variant={selectedLoan.status === 'overdue' ? 'destructive' : 'secondary'} className="ml-2">
                        {selectedLoan.status === 'overdue' ? '逾期' : '正常'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* 贷款信息 */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">贷款信息</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">贷款金额:</span>
                      <span className="ml-2 font-mono">{formatCurrency(selectedLoan.loanAmount, selectedLoan.loanCurrency)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">贷款货币:</span>
                      <span className="ml-2">{selectedLoan.loanCurrency}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">贷款期限:</span>
                      <span className="ml-2">{selectedLoan.loanTenor}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">总利率:</span>
                      <span className="ml-2">{selectedLoan.totalInterestRate}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500">起贷日期:</span>
                      <span className="ml-2">{selectedLoan.loanStartDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">到期日期:</span>
                      <span className="ml-2">{selectedLoan.maturityDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">余额:</span>
                      <span className="ml-2 font-mono">{formatCurrency(calcBalance(selectedLoan), selectedLoan.loanCurrency)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">逾期金额:</span>
                      <span className="ml-2 font-mono text-red-600">{formatCurrency(calcPastdueAmount(selectedLoan), selectedLoan.loanCurrency)}</span>
                    </div>
                  </div>
                </div>

                {/* 操作记录 */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">操作记录</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">冻结账户请求:</span>
                      <span className="ml-2">{selectedLoan.freezeAccountRequested || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">强制扣款请求:</span>
                      <span className="ml-2">{selectedLoan.forceDebitRequested || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">RM审批:</span>
                      <span className="ml-2">{selectedLoan.approvalFromRM || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Dowsure冻结确认:</span>
                      <span className="ml-2">{selectedLoan.confirmationFreezeAccount || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Dowsure扣款确认:</span>
                      <span className="ml-2">{selectedLoan.confirmationForceDebit || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* 备注 */}
                {selectedLoan.remarks && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-3">备注</h3>
                    <p className="text-sm">{selectedLoan.remarks}</p>
                  </div>
                )}

                {/* 还款计划 */}
                {selectedLoan.repaymentSchedule && selectedLoan.repaymentSchedule.length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-3">还款计划</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>还款日期</TableHead>
                          <TableHead>计划金额</TableHead>
                          <TableHead>状态</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedLoan.repaymentSchedule.map((record, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{record.date}</TableCell>
                            <TableCell className="font-mono">{formatCurrency(record.amount, selectedLoan.loanCurrency)}</TableCell>
                            <TableCell>
                              <Badge variant={record.repaid ? 'default' : 'secondary'}>
                                {record.repaid ? '已还' : '未还'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
