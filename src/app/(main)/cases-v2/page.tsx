'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2, RefreshCw } from 'lucide-react';
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
const STATUS_CONFIG = {
  pending_assign: { label: '待分配', color: 'bg-yellow-100 text-yellow-800' },
  pending_visit: { label: '待外访', color: 'bg-blue-100 text-blue-800' },
  following: { label: '跟进中', color: 'bg-blue-600 text-white' },
  closed: { label: '已结案', color: 'bg-green-100 text-green-800' },
};

// 风险等级配置
const RISK_CONFIG = {
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
                      <TableHead className="font-medium">产品名称</TableHead>
                      <TableHead className="font-medium">币种</TableHead>
                      <TableHead className="font-medium text-right">总在贷金额</TableHead>
                      <TableHead className="font-medium text-right">逾期金额</TableHead>
                      <TableHead className="font-medium">逾期天数</TableHead>
                      <TableHead className="font-medium">借款人手机号</TableHead>
                      <TableHead className="font-medium">资金方</TableHead>
                      <TableHead className="font-medium">支付公司</TableHead>
                      <TableHead className="font-medium">所属销售</TableHead>
                      <TableHead className="font-medium">所属贷后</TableHead>
                      <TableHead className="font-medium">风险等级</TableHead>
                      <TableHead className="font-medium">状态</TableHead>
                      <TableHead className="font-medium w-[80px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cases.map((caseItem) => (
                      <TableRow key={caseItem.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-mono text-sm">{caseItem.userId}</TableCell>
                        <TableCell className="font-medium">{caseItem.borrowerName}</TableCell>
                        <TableCell className="text-sm text-slate-600">{caseItem.productName}</TableCell>
                        <TableCell className="text-sm">{caseItem.currency}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{formatMoney(caseItem.totalOutstandingBalance)}</TableCell>
                        <TableCell className={`text-right font-mono tabular-nums ${caseItem.overdueAmount > 0 ? 'text-red-600' : ''}`}>
                          {formatMoney(caseItem.overdueAmount)}
                        </TableCell>
                        <TableCell className={`font-mono tabular-nums ${caseItem.overdueDays > 90 ? 'text-red-600 font-medium' : caseItem.overdueDays > 0 ? 'text-orange-600' : ''}`}>
                          {caseItem.overdueDays}天
                        </TableCell>
                        <TableCell className="font-mono text-sm">{caseItem.borrowerPhone}</TableCell>
                        <TableCell className="text-sm text-slate-600">{caseItem.funder}</TableCell>
                        <TableCell className="text-sm text-slate-600">{caseItem.paymentCompany}</TableCell>
                        <TableCell className="text-sm text-slate-600">{caseItem.assignedSales}</TableCell>
                        <TableCell className="text-sm text-slate-600">{caseItem.assignedPostLoan}</TableCell>
                        <TableCell>
                          <Badge className={RISK_CONFIG[caseItem.riskLevel as keyof typeof RISK_CONFIG]?.color || 'bg-gray-100'}>
                            {RISK_CONFIG[caseItem.riskLevel as keyof typeof RISK_CONFIG]?.label || caseItem.riskLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_CONFIG[caseItem.status as keyof typeof STATUS_CONFIG]?.color || 'bg-gray-100'}>
                            {STATUS_CONFIG[caseItem.status as keyof typeof STATUS_CONFIG]?.label || caseItem.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/cases-v2/${caseItem.id}`} className="flex items-center gap-2 cursor-pointer">
                                  <Eye className="w-4 h-4" />
                                  查看详情
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="flex items-center gap-2">
                                <Edit className="w-4 h-4" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem className="flex items-center gap-2 text-red-600">
                                <Trash2 className="w-4 h-4" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {cases.length === 0 && !loading && (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <p className="text-slate-500">暂无案件数据</p>
                    </div>
                  </div>
                )}
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
                    onClick={() => page > 1 && setPage(page - 1)}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => page < totalPages && setPage(page + 1)}
                    className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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
