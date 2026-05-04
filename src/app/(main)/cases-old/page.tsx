'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CASE_STATUS_CONFIG, RISK_LEVEL_CONFIG } from '@/lib/constants';
import {
  Search,
  Plus,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface Case {
  id: string;
  caseNo: string;
  borrowerName: string;
  borrowerPhone: string;
  address: string;
  debtAmount: string;
  status: string;
  riskLevel: string;
  assigneeName: string | null;
  createdAt: string;
}

interface PaginatedResponse {
  data: Case[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function CasesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 状态
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // 分页和筛选
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // 筛选条件
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [riskLevel, setRiskLevel] = useState(searchParams.get('riskLevel') || 'all');

  // 防抖搜索
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // 获取数据
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

      const res = await fetch(`/api/cases?${params}`);
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
                    placeholder="案件编号/姓名/电话"
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
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="w-[160px]">
                <label className="text-sm font-medium text-slate-700 mb-2 block">案件状态</label>
                <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    {Object.entries(CASE_STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[160px]">
                <label className="text-sm font-medium text-slate-700 mb-2 block">风险等级</label>
                <Select value={riskLevel} onValueChange={(v) => { setRiskLevel(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部等级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部等级</SelectItem>
                    {Object.entries(RISK_LEVEL_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasFilters && (
                <Button variant="ghost" onClick={clearFilters} className="text-slate-500">
                  清除筛选
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 表格区域 */}
      <div className="p-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-[120px] font-semibold">案件编号</TableHead>
                    <TableHead className="font-semibold">借款人</TableHead>
                    <TableHead className="font-semibold">联系电话</TableHead>
                    <TableHead className="font-semibold">欠款金额</TableHead>
                    <TableHead className="font-semibold">状态</TableHead>
                    <TableHead className="font-semibold">风险等级</TableHead>
                    <TableHead className="font-semibold">外访员</TableHead>
                    <TableHead className="font-semibold">创建时间</TableHead>
                    <TableHead className="w-[100px] text-right font-semibold">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    // 加载状态
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : cases.length === 0 ? (
                    // 空状态
                    <TableRow>
                      <TableCell colSpan={9} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <Search className="w-12 h-12 mb-3 text-slate-300" />
                          <p className="text-lg font-medium">暂无案件数据</p>
                          <p className="text-sm">尝试调整筛选条件</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    // 数据列表
                    cases.map((caseItem) => (
                      <TableRow
                        key={caseItem.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedCase(caseItem)}
                      >
                        <TableCell className="font-mono text-sm text-blue-600">
                          {caseItem.caseNo}
                        </TableCell>
                        <TableCell className="font-medium">{caseItem.borrowerName}</TableCell>
                        <TableCell className="text-slate-600">{caseItem.borrowerPhone}</TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {formatCurrency(caseItem.debtAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={CASE_STATUS_CONFIG[caseItem.status as keyof typeof CASE_STATUS_CONFIG]?.color || ''}
                            variant="outline"
                          >
                            {CASE_STATUS_CONFIG[caseItem.status as keyof typeof CASE_STATUS_CONFIG]?.label || caseItem.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {caseItem.riskLevel && (
                            <Badge
                              className={RISK_LEVEL_CONFIG[caseItem.riskLevel as keyof typeof RISK_LEVEL_CONFIG]?.color || ''}
                              variant="outline"
                            >
                              {RISK_LEVEL_CONFIG[caseItem.riskLevel as keyof typeof RISK_LEVEL_CONFIG]?.label || caseItem.riskLevel}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {caseItem.assigneeName || '-'}
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {formatDate(caseItem.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link href={`/cases/${caseItem.id}`}>
                                <Eye className="w-4 h-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                toast.success('删除成功');
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* 分页 */}
            {!loading && cases.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                <p className="text-sm text-slate-600">
                  显示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 条，共 {total} 条
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    上一页
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? 'default' : 'outline'}
                          size="sm"
                          className="w-9"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {totalPages > 5 && <span className="px-2 text-slate-500">...</span>}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    下一页
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 详情弹窗 */}
      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              案件详情 - {selectedCase?.caseNo}
            </DialogTitle>
          </DialogHeader>
          {selectedCase && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-1">
                <p className="text-sm text-slate-500">借款人</p>
                <p className="font-medium">{selectedCase.borrowerName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-500">联系电话</p>
                <p className="font-mono">{selectedCase.borrowerPhone}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-500">欠款金额</p>
                <p className="font-mono font-semibold text-red-600">
                  {formatCurrency(selectedCase.debtAmount)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-500">案件状态</p>
                <Badge className={CASE_STATUS_CONFIG[selectedCase.status as keyof typeof CASE_STATUS_CONFIG]?.color}>
                  {CASE_STATUS_CONFIG[selectedCase.status as keyof typeof CASE_STATUS_CONFIG]?.label}
                </Badge>
              </div>
              <div className="col-span-2 space-y-1">
                <p className="text-sm text-slate-500">联系地址</p>
                <p>{selectedCase.address}</p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setSelectedCase(null)}>
              关闭
            </Button>
            <Button asChild>
              <Link href={`/cases/${selectedCase?.id}`}>
                查看详情
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CasesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>}>
      <CasesContent />
    </Suspense>
  );
}
