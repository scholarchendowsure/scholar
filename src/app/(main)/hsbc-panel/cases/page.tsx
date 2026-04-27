'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Search,
  Download,
  Upload,
  Eye,
  ChevronLeft,
  ChevronRight,
  Building2,
  DollarSign,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

interface HSBCLoan {
  id: string;
  loanReference: string;
  merchantId: string;
  borrowerName: string;
  loanStartDate: string;
  loanCurrency: string;
  loanAmount: string;
  loanTenor: number;
  maturityDate: string;
  balance: string;
  pastdueAmount: string;
  batchDate: string;
}

interface PaginatedResponse {
  data: HSBCLoan[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function HSBCCasesPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [keyword, setKeyword] = useState('');
  const [currency, setCurrency] = useState('');
  const [batchDate, setBatchDate] = useState('');
  const [page, setPage] = useState(1);
  const [batchDates, setBatchDates] = useState<Array<{ batchDate: string; count: number }>>([]);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', '20');
      if (keyword) params.set('keyword', keyword);
      if (currency) params.set('currency', currency);
      if (batchDate) params.set('batchDate', batchDate);

      const res = await fetch(`/api/hsbc?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      toast.error('获取汇丰贷款列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, keyword, currency, batchDate]);

  const fetchBatchDates = async () => {
    try {
      const res = await fetch('/api/hsbc/batch-dates');
      const result = await res.json();
      if (result.success) {
        setBatchDates(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch batch dates:', error);
    }
  };

  useEffect(() => {
    fetchBatchDates();
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLoans();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">汇丰贷款列表</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/hsbc-panel/risk-assessment">
              <Upload className="h-4 w-4 mr-2" />
              风险评定导入
            </Link>
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            导出
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索贷款编号、商户ID、借款人..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={currency || 'all'} onValueChange={(v) => setCurrency(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="币种" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部币种</SelectItem>
                <SelectItem value="CNY">CNY</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>

            <Select value={batchDate || 'all'} onValueChange={(v) => setBatchDate(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="批次日期" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部批次</SelectItem>
                {batchDates.map((bd) => (
                  <SelectItem key={bd.batchDate} value={bd.batchDate}>
                    {bd.batchDate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button type="submit" variant="secondary">
              筛选
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setKeyword('');
                setCurrency('');
                setBatchDate('');
                setPage(1);
              }}
            >
              重置
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>贷款编号</TableHead>
                <TableHead>商户ID</TableHead>
                <TableHead>借款人</TableHead>
                <TableHead>币种</TableHead>
                <TableHead className="text-right">贷款金额</TableHead>
                <TableHead className="text-right">余额</TableHead>
                <TableHead className="text-right">逾期金额</TableHead>
                <TableHead>到期日期</TableHead>
                <TableHead>批次</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((item) => (
                  <TableRow key={item.id} className="hover:bg-accent/50">
                    <TableCell className="font-mono text-sm">{item.loanReference || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{item.merchantId || '-'}</TableCell>
                    <TableCell className="font-medium">{item.borrowerName || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={item.loanCurrency === 'CNY' ? 'default' : 'secondary'}>
                        {item.loanCurrency}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-data">
                      {item.loanCurrency === 'CNY' 
                        ? formatCurrency(item.loanAmount)
                        : `$${parseFloat(item.loanAmount).toLocaleString()}`
                      }
                    </TableCell>
                    <TableCell className="text-right font-data">
                      {item.loanCurrency === 'CNY' 
                        ? formatCurrency(item.balance)
                        : `$${parseFloat(item.balance).toLocaleString()}`
                      }
                    </TableCell>
                    <TableCell className={`text-right font-data ${parseFloat(item.pastdueAmount) >= 0.5 ? 'text-[hsl(0,75%,50%)]' : ''}`}>
                      {item.loanCurrency === 'CNY' 
                        ? formatCurrency(item.pastdueAmount)
                        : `$${parseFloat(item.pastdueAmount).toLocaleString()}`
                      }
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.maturityDate ? formatDate(item.maturityDate) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.batchDate || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            共 {data.total} 条记录，第 {data.page}/{data.totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {page} / {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
