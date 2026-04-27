'use client';

import { useEffect, useState, useCallback } from 'react';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CASE_STATUS_CONFIG, RISK_LEVEL_CONFIG } from '@/lib/constants';
import {
  Search,
  Plus,
  Download,
  Upload,
  Filter,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

interface Case {
  id: string;
  caseNo: string;
  borrowerName: string;
  borrowerPhone: string;
  address: string;
  debtAmount: string;
  loanOrderNo: string;
  status: 'pending_assign' | 'pending_visit' | 'following' | 'closed';
  riskLevel: string;
  fundingSource: string;
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

export default function CasesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');

  // Filters
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [assignedUser, setAssignedUser] = useState(searchParams.get('assignedUser') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', '20');
      if (keyword) params.set('keyword', keyword);
      if (status) params.set('status', status);
      if (assignedUser) params.set('assignedUser', assignedUser);

      const res = await fetch(`/api/cases?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      toast.error('获取案件列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, keyword, status, assignedUser]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users?pageSize=100');
      const result = await res.json();
      if (result.success) {
        setUsers(result.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCases();
  };

  const handleAssign = async () => {
    if (!selectedUser || selectedCases.length === 0) {
      toast.error('请选择外访人员和案件');
      return;
    }

    try {
      const promises = selectedCases.map((caseId) =>
        fetch(`/api/cases/${caseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedUser: selectedUser }),
        })
      );

      const results = await Promise.all(promises);
      const allSuccess = results.every((r) => r.ok);

      if (allSuccess) {
        toast.success(`成功分配 ${selectedCases.length} 件案件`);
        setSelectedCases([]);
        setAssignDialogOpen(false);
        setSelectedUser('');
        fetchCases();
      } else {
        toast.error('部分案件分配失败');
      }
    } catch (error) {
      toast.error('分配失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该案件吗？')) return;

    try {
      const res = await fetch(`/api/cases/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('案件已删除');
        fetchCases();
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedCases((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCases.length === data?.data.length) {
      setSelectedCases([]);
    } else {
      setSelectedCases(data?.data.map((c) => c.id) || []);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = CASE_STATUS_CONFIG[status as keyof typeof CASE_STATUS_CONFIG];
    if (!config) return null;
    return (
      <Badge
        className="text-white"
        style={{ backgroundColor: config.color }}
      >
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">案件列表</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/case-import">
              <Upload className="h-4 w-4 mr-2" />
              导入
            </Link>
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            导出
          </Button>
          <Button asChild>
            <Link href="/cases/new">
              <Plus className="h-4 w-4 mr-2" />
              新建案件
            </Link>
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
                  placeholder="搜索案件编号、借款人姓名、手机号..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="案件状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending_assign">待分配</SelectItem>
                <SelectItem value="pending_visit">待外访</SelectItem>
                <SelectItem value="following">跟进中</SelectItem>
                <SelectItem value="closed">已结案</SelectItem>
              </SelectContent>
            </Select>

            <Select value={assignedUser || 'all'} onValueChange={(v) => setAssignedUser(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="负责人" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部人员</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button type="submit" variant="secondary">
              <Filter className="h-4 w-4 mr-2" />
              筛选
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setKeyword('');
                setStatus('');
                setAssignedUser('');
                setPage(1);
              }}
            >
              重置
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Batch Actions */}
      {selectedCases.length > 0 && (
        <Card className="border-[hsl(210,95%,40%)] bg-[hsl(210,95%,40%)]/5">
          <CardContent className="py-2 flex items-center justify-between">
            <span className="text-sm font-medium">
              已选择 {selectedCases.length} 件案件
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAssignDialogOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                批量分配
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedCases([])}
              >
                取消选择
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <input
                    type="checkbox"
                    checked={
                      data?.data.length === selectedCases.length &&
                      data?.data.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </TableHead>
                <TableHead>案件编号</TableHead>
                <TableHead>借款人</TableHead>
                <TableHead>联系方式</TableHead>
                <TableHead>欠款金额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>负责人</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-[80px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    暂无案件数据
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((item) => (
                  <TableRow key={item.id} className="hover:bg-accent/50">
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedCases.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.caseNo}</TableCell>
                    <TableCell className="font-medium">{item.borrowerName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.borrowerPhone || '-'}
                    </TableCell>
                    <TableCell className="font-data">
                      {formatCurrency(item.debtAmount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>{item.assigneeName || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(item.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/cases/${item.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看详情
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/cases/${item.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
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

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量分配案件</DialogTitle>
            <DialogDescription>
              将 {selectedCases.length} 件案件分配给外访人员
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>选择外访人员</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择外访人员" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAssign}>确认分配</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
