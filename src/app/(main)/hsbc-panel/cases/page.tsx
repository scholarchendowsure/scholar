'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  Search, Filter, Download, ChevronDown, ChevronUp,
  Building2, Banknote, AlertTriangle, Calendar, RefreshCw, Eye
} from 'lucide-react';
import { toast } from 'sonner';

interface HSBCLoan {
  id: string;
  loanReference: string;
  merchantId: string;
  borrowerName: string;
  loanStartDate: string;
  loanCurrency: 'CNY' | 'USD';
  loanAmount: number;
  loanInterest: string;
  totalInterestRate: number;
  loanTenor: string;
  maturityDate: string;
  balance: number;
  pastdueAmount: number;
  freezeAccountRequested?: string;
  forceDebitRequested?: string;
  remarks: string;
  batchDate?: string;
  repaymentSchedule?: Array<{ date: string; amount: number; repaid?: boolean }>;
}

interface MerchantGroup {
  merchantId: string;
  borrowerName: string;
  loanCount: number;
  totalAmount: number;
  totalBalance: number;
  totalPastdueAmount: number;
  currency: string;
  loans: HSBCLoan[];
}

function formatCurrency(amount: number, currency: string = 'CNY'): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}

export default function HSBCCasesPage() {
  const [loans, setLoans] = useState<HSBCLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedMerchant, setExpandedMerchant] = useState<string | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<HSBCLoan | null>(null);
  const [merchants, setMerchants] = useState<MerchantGroup[]>([]);
  const [batchDates, setBatchDates] = useState<string[]>([]);
  const [selectedBatchDate, setSelectedBatchDate] = useState<string>('');

  const fetchBatchDates = useCallback(async () => {
    try {
      const res = await fetch('/api/hsbc/batch-dates');
      if (res.ok) {
        const data = await res.json();
        const dates = data.data || [];
        setBatchDates(dates);
        if (dates.length > 0 && !selectedBatchDate) {
          setSelectedBatchDate(dates[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch batch dates:', error);
    }
  }, [selectedBatchDate]);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const dateParam = selectedBatchDate ? `&batchDate=${encodeURIComponent(selectedBatchDate)}` : '';
      const res = await fetch(`/api/hsbc?pageSize=99999${dateParam}`);
      const data = await res.json();
      setLoans(data.loans || []);
    } catch (error) {
      console.error('Failed to fetch loans:', error);
      toast.error('获取贷款数据失败');
    } finally {
      setLoading(false);
    }
  }, [selectedBatchDate]);

  useEffect(() => {
    fetchBatchDates();
  }, [fetchBatchDates]);

  useEffect(() => {
    if (selectedBatchDate) {
      fetchLoans();
    }
  }, [selectedBatchDate, fetchLoans]);

  // 按商户聚合
  useEffect(() => {
    const filtered = loans.filter(loan => {
      // 支持多商户ID搜索（用空格分隔）
      const searchTerms = searchTerm.trim().split(/\s+/).filter(t => t.length > 0);
      const matchSearch = searchTerms.length === 0 ||
        searchTerms.some(term =>
          loan.loanReference.toLowerCase().includes(term.toLowerCase()) ||
          loan.merchantId.toLowerCase().includes(term.toLowerCase()) ||
          loan.borrowerName.toLowerCase().includes(term.toLowerCase())
        ) ||
        // 特殊支持：纯数字或短字符串作为商户ID精确匹配
        (searchTerms.length === 1 && loan.merchantId.toLowerCase().includes(searchTerms[0].toLowerCase()));
      const matchCurrency = currencyFilter === 'all' || loan.loanCurrency === currencyFilter;
      const matchStatus = statusFilter === 'all' || 
        (statusFilter === 'overdue' && loan.pastdueAmount >= 0.5) ||
        (statusFilter === 'normal' && loan.pastdueAmount < 0.5);
      return matchSearch && matchCurrency && matchStatus;
    });

    const grouped = filtered.reduce((acc, loan) => {
      const key = loan.merchantId;
      if (!acc[key]) {
        acc[key] = {
          merchantId: loan.merchantId,
          borrowerName: loan.borrowerName,
          loanCount: 0,
          totalAmount: 0,
          totalBalance: 0,
          totalPastdueAmount: 0,
          currency: loan.loanCurrency,
          loans: [],
        };
      }
      acc[key].loanCount++;
      acc[key].totalAmount += loan.loanAmount;
      acc[key].totalBalance += loan.balance;
      acc[key].totalPastdueAmount += loan.pastdueAmount;
      acc[key].loans.push(loan);
      return acc;
    }, {} as Record<string, MerchantGroup>);

    setMerchants(Object.values(grouped).sort((a, b) => b.totalBalance - a.totalBalance));
  }, [loans, searchTerm, currencyFilter, statusFilter]);

  const getStatusBadge = (pastdueAmount: number) => {
    if (pastdueAmount >= 0.5) {
      return <Badge className="bg-red-100 text-red-700 border-red-200">逾期</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700 border-green-200">正常</Badge>;
  };

  const handleExport = () => {
    toast.success('导出功能开发中');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">汇丰贷款列表</h1>
        </div>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">汇丰贷款列表</h1>
          <p className="text-sm text-slate-500 mt-1">共 {merchants.length} 家商户，{loans.length} 笔贷款</p>
        </div>
        <div className="flex items-center gap-3">
          {batchDates.length > 0 && (
            <Select value={selectedBatchDate} onValueChange={setSelectedBatchDate}>
              <SelectTrigger className="w-[160px] bg-white border-slate-200">
                <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="选择批次" />
              </SelectTrigger>
              <SelectContent>
                {batchDates.map((date) => (
                  <SelectItem key={date} value={date}>{date}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={fetchLoans} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            导出
          </Button>
        </div>
      </div>

      {/* 筛选器 */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="搜索商户ID(支持多个,空格分隔)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-50 border-slate-200"
              />
            </div>
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200">
                <SelectValue placeholder="币种" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部币种</SelectItem>
                <SelectItem value="CNY">CNY</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="normal">正常</SelectItem>
                <SelectItem value="overdue">逾期</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 商户列表 */}
      <div className="space-y-4">
        {merchants.length === 0 ? (
          <Card className="bg-white border-slate-200">
            <CardContent className="p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">暂无数据</p>
            </CardContent>
          </Card>
        ) : (
          merchants.map((merchant) => (
            <Card key={merchant.merchantId} className="bg-white border-slate-200 overflow-hidden">
              {/* 商户头部 */}
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedMerchant(expandedMerchant === merchant.merchantId ? null : merchant.merchantId)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800">{merchant.borrowerName}</h3>
                      <Badge variant="outline" className="text-xs">{merchant.merchantId}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {merchant.loanCount} 笔贷款 · 
                      余额 {formatCurrency(merchant.totalBalance, merchant.currency)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-slate-500">累计放款</p>
                    <p className="font-semibold text-slate-700 font-mono">
                      {formatCurrency(merchant.totalAmount, merchant.currency)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">逾期金额</p>
                    <p className={`font-semibold font-mono ${merchant.totalPastdueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(merchant.totalPastdueAmount, merchant.currency)}
                    </p>
                  </div>
                  <Badge variant="outline" className={merchant.currency === 'CNY' ? 'text-blue-600 border-blue-300' : 'text-amber-600 border-amber-300'}>
                    {merchant.currency}
                  </Badge>
                  {expandedMerchant === merchant.merchantId ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>

              {/* 贷款明细 */}
              {expandedMerchant === merchant.merchantId && (
                <div className="border-t border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-[160px]">贷款编号</TableHead>
                        <TableHead>贷款日期</TableHead>
                        <TableHead>期限</TableHead>
                        <TableHead>到期日</TableHead>
                        <TableHead className="text-right">贷款金额</TableHead>
                        <TableHead className="text-right">余额</TableHead>
                        <TableHead className="text-right">逾期金额</TableHead>
                        <TableHead>利率</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="w-[100px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {merchant.loans.map((loan) => (
                        <TableRow key={loan.id} className="hover:bg-slate-50">
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              <Banknote className="w-4 h-4 text-slate-400" />
                              {loan.loanReference}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{loan.loanStartDate}</TableCell>
                          <TableCell className="text-sm">{loan.loanTenor}</TableCell>
                          <TableCell className="text-sm">{loan.maturityDate}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(loan.loanAmount, loan.loanCurrency)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(loan.balance, loan.loanCurrency)}
                          </TableCell>
                          <TableCell className={`text-right font-mono text-sm ${loan.pastdueAmount > 0 ? 'text-red-600 font-medium' : 'text-green-600'}`}>
                            {formatCurrency(loan.pastdueAmount, loan.loanCurrency)}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">{loan.totalInterestRate}%</TableCell>
                          <TableCell>{getStatusBadge(loan.pastdueAmount)}</TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelectedLoan(loan)}>
                                  <Eye className="w-4 h-4" />
                                  详情
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <Banknote className="w-5 h-5" />
                                    贷款详情 - {loan.loanReference}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="grid grid-cols-2 gap-4 py-4">
                                  <div className="space-y-1">
                                    <p className="text-sm text-slate-500">商户ID</p>
                                    <p className="font-medium">{loan.merchantId}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-slate-500">商户名称</p>
                                    <p className="font-medium">{loan.borrowerName}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-slate-500">币种</p>
                                    <Badge variant="outline">{loan.loanCurrency}</Badge>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-slate-500">贷款金额</p>
                                    <p className="font-mono font-medium">{formatCurrency(loan.loanAmount, loan.loanCurrency)}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-slate-500">贷款期限</p>
                                    <p className="font-medium">{loan.loanTenor}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-slate-500">利率</p>
                                    <p className="font-medium">{loan.loanInterest} ({loan.totalInterestRate}%)</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-slate-500">贷款开始日</p>
                                    <p className="font-medium">{loan.loanStartDate}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-slate-500">到期日</p>
                                    <p className="font-medium">{loan.maturityDate}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-slate-500">当前余额</p>
                                    <p className="font-mono font-medium">{formatCurrency(loan.balance, loan.loanCurrency)}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-slate-500">逾期金额</p>
                                    <p className={`font-mono font-medium ${loan.pastdueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {formatCurrency(loan.pastdueAmount, loan.loanCurrency)}
                                    </p>
                                  </div>
                                  {loan.freezeAccountRequested && (
                                    <div className="space-y-1">
                                      <p className="text-sm text-slate-500">冻结账户请求</p>
                                      <p className="font-medium">{loan.freezeAccountRequested}</p>
                                    </div>
                                  )}
                                  {loan.forceDebitRequested && (
                                    <div className="space-y-1">
                                      <p className="text-sm text-slate-500">强制扣款请求</p>
                                      <p className="font-medium">{loan.forceDebitRequested}</p>
                                    </div>
                                  )}
                                  {loan.remarks && (
                                    <div className="col-span-2 space-y-1">
                                      <p className="text-sm text-slate-500">备注</p>
                                      <p className="font-medium">{loan.remarks}</p>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
