'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, ChevronDown, ChevronUp, Eye, Edit, Trash2, MoreHorizontal, Upload, LayoutDashboard, Building2, Columns } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { HSBCLoan, HSBCLoanFilter, calcPastdueAmount } from '@/lib/hsbc-loan';

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

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.search) params.set('search', filter.search);
      if (filter.currency && filter.currency !== 'all') params.set('currency', filter.currency);
      if (filter.status && filter.status !== 'all') params.set('status', filter.status);
      if (filter.hasOverdue) params.set('hasOverdue', 'true');
      params.set('page', String(filter.page || 1));
      params.set('pageSize', String(filter.pageSize || 50));

      const res = await fetch(`/api/hsbc/loans?${params.toString()}`);
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
    loadData();
  }, [loadData]);

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
            <Button onClick={() => router.push('/hsbc-panel/upload')}>
              <Upload className="w-4 h-4 mr-2" />
              导入数据
            </Button>
          </div>
        </div>

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
                        <TableHead>期限</TableHead>
                        <TableHead>到期日</TableHead>
                        <TableHead>余额</TableHead>
                        <TableHead>逾期金额</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {merchant.loans.map((loan: HSBCLoan) => (
                        <TableRow key={loan.id}>
                          <TableCell className="font-mono text-sm">{loan.loanReference}</TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(loan.loanAmount, loan.loanCurrency)}
                          </TableCell>
                          <TableCell>{loan.loanTenor}</TableCell>
                          <TableCell>{loan.maturityDate}</TableCell>
                          <TableCell className="font-mono">{formatCurrency(loan.balance, loan.loanCurrency)}</TableCell>
                          <TableCell className={`font-mono ${calcPastdueAmount(loan) > 0 ? 'text-red-600' : ''}`}>
                            {formatCurrency(calcPastdueAmount(loan), loan.loanCurrency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={calcPastdueAmount(loan) > 0 ? 'destructive' : 'secondary'}>
                              {calcPastdueAmount(loan) > 0 ? '逾期' : '正常'}
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
                      <Badge variant={calcPastdueAmount(selectedLoan) > 0 ? 'destructive' : 'secondary'} className="ml-2">
                        {calcPastdueAmount(selectedLoan) > 0 ? '逾期' : '正常'}
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
                      <span className="ml-2 font-mono">{formatCurrency(selectedLoan.balance, selectedLoan.loanCurrency)}</span>
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
