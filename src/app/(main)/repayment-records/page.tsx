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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Search,
  Download,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';

interface RepaymentRecord {
  id: string;
  caseId: string;
  loanOrderNo: string;
  borrowerName: string;
  repaymentDate: string;
  repaymentAmount: string;
  currency: string;
  overdueAmount: string;
  auditStatus: 'pending' | 'approved' | 'rejected';
  auditRemark: string;
  createdAt: string;
}

interface PaginatedResponse {
  data: RepaymentRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function RepaymentRecordsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [keyword, setKeyword] = useState('');
  const [auditStatus, setAuditStatus] = useState('');
  const [page, setPage] = useState(1);

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RepaymentRecord | null>(null);
  const [auditRemark, setAuditRemark] = useState('');
  const [auditing, setAuditing] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', '20');
      if (keyword) params.set('keyword', keyword);
      if (auditStatus) params.set('auditStatus', auditStatus);

      const res = await fetch(`/api/cases/repayment-records/all?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      toast.error('获取还款记录失败');
    } finally {
      setLoading(false);
    }
  }, [page, keyword, auditStatus]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRecords();
  };

  const handleAudit = async (recordId: string, status: 'approved' | 'rejected') => {
    setAuditing(true);
    try {
      const res = await fetch(`/api/cases/repayment-records/${recordId}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          remark: auditRemark,
        }),
      });

      if (res.ok) {
        toast.success(status === 'approved' ? '审核通过' : '审核拒绝');
        setDetailDialogOpen(false);
        setSelectedRecord(null);
        setAuditRemark('');
        fetchRecords();
      }
    } catch (error) {
      toast.error('审核失败');
    } finally {
      setAuditing(false);
    }
  };

  const openDetail = (record: RepaymentRecord) => {
    setSelectedRecord(record);
    setAuditRemark('');
    setDetailDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">还款记录</h1>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          导出
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索贷款单号、借款人..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={auditStatus} onValueChange={setAuditStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="审核状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部状态</SelectItem>
                <SelectItem value="pending">待审核</SelectItem>
                <SelectItem value="approved">已通过</SelectItem>
                <SelectItem value="rejected">已拒绝</SelectItem>
              </SelectContent>
            </Select>

            <Button type="submit" variant="secondary">
              筛选
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium">贷款单号</th>
                  <th className="text-left py-3 px-4 font-medium">借款人</th>
                  <th className="text-right py-3 px-4 font-medium">还款金额</th>
                  <th className="text-right py-3 px-4 font-medium">逾期金额</th>
                  <th className="text-left py-3 px-4 font-medium">还款日期</th>
                  <th className="text-left py-3 px-4 font-medium">审核状态</th>
                  <th className="text-left py-3 px-4 font-medium">创建时间</th>
                  <th className="text-center py-3 px-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-6 w-12" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                    </tr>
                  ))
                ) : data?.data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      暂无还款记录
                    </td>
                  </tr>
                ) : (
                  data?.data.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-accent/50">
                      <td className="py-3 px-4 font-mono">{record.loanOrderNo || '-'}</td>
                      <td className="py-3 px-4 font-medium">{record.borrowerName || '-'}</td>
                      <td className="py-3 px-4 text-right font-data">
                        {formatCurrency(record.repaymentAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-data text-[hsl(0,75%,50%)]">
                        {formatCurrency(record.overdueAmount)}
                      </td>
                      <td className="py-3 px-4">{record.repaymentDate ? formatDate(record.repaymentDate) : '-'}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            record.auditStatus === 'approved'
                              ? 'default'
                              : record.auditStatus === 'rejected'
                              ? 'destructive'
                              : 'outline'
                          }
                          className={
                            record.auditStatus === 'approved' ? 'bg-[hsl(145,65%,38%)] text-white' : ''
                          }
                        >
                          {record.auditStatus === 'pending'
                            ? '待审核'
                            : record.auditStatus === 'approved'
                            ? '已通过'
                            : '已拒绝'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {formatDate(record.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {record.auditStatus === 'pending' && (
                          <Button variant="ghost" size="sm" onClick={() => openDetail(record)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

      {/* Audit Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>还款记录审核</DialogTitle>
            <DialogDescription>审核还款记录，确认还款信息</DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">贷款单号:</span>
                  <span className="ml-2 font-mono">{selectedRecord.loanOrderNo || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">借款人:</span>
                  <span className="ml-2">{selectedRecord.borrowerName || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">还款金额:</span>
                  <span className="ml-2 font-data">{formatCurrency(selectedRecord.repaymentAmount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">逾期金额:</span>
                  <span className="ml-2 font-data text-[hsl(0,75%,50%)]">
                    {formatCurrency(selectedRecord.overdueAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">还款日期:</span>
                  <span className="ml-2">{selectedRecord.repaymentDate ? formatDate(selectedRecord.repaymentDate) : '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">创建时间:</span>
                  <span className="ml-2">{formatDate(selectedRecord.createdAt)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>审核备注</Label>
                <Input
                  value={auditRemark}
                  onChange={(e) => setAuditRemark(e.target.value)}
                  placeholder="请输入审核备注"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleAudit(selectedRecord!.id, 'rejected')}
              disabled={auditing}
            >
              <XCircle className="h-4 w-4 mr-2" />
              拒绝
            </Button>
            <Button
              className="bg-[hsl(145,65%,38%)] hover:bg-[hsl(145,65%,32%)]"
              onClick={() => handleAudit(selectedRecord!.id, 'approved')}
              disabled={auditing}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              通过
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
