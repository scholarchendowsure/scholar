'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { formatCurrency, CASE_STATUS_CONFIG } from '@/lib/constants';
import {
  Users,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  CheckCircle,
} from 'lucide-react';

interface Case {
  id: string;
  caseNo: string;
  borrowerName: string;
  debtAmount: string;
  overdueDays: number;
  status: string;
  assignedUser: string;
}

interface User {
  id: string;
  name: string;
  role: string;
  activeCases: number;
}

interface PaginatedResponse {
  data: Case[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function AssignmentPage() {
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<PaginatedResponse | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [assigningUser, setAssigningUser] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', '20');
      params.set('status', 'pending_assign');

      const res = await fetch(`/api/cases?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setCases(result.data);
      }
    } catch (error) {
      toast.error('获取待分配案件失败');
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users?role=agent&pageSize=100');
      const result = await res.json();
      if (result.success) {
        setUsers(result.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  useEffect(() => {
    fetchCases();
    fetchUsers();
  }, [fetchCases, fetchUsers]);

  const handleSelectAll = () => {
    if (!cases || !cases.data) return;
    if (selectedCases.size === cases.data.length) {
      setSelectedCases(new Set());
    } else {
      setSelectedCases(new Set(cases.data.map((c) => c.id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedCases);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCases(newSelected);
  };

  const handleBatchAssign = async () => {
    if (selectedCases.size === 0) {
      toast.error('请选择要分配的案件');
      return;
    }
    if (!assigningUser) {
      toast.error('请选择外访人员');
      return;
    }

    setAssigning(true);
    try {
      const res = await fetch('/api/cases/batch-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseIds: Array.from(selectedCases),
          userId: assigningUser,
        }),
      });

      if (res.ok) {
        toast.success(`已成功分配 ${selectedCases.size} 个案件`);
        setSelectedCases(new Set());
        setAssigningUser('');
        fetchCases();
      }
    } catch (error) {
      toast.error('分配失败');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">案件分配</h1>
          <Badge variant="outline">
            待分配: {cases?.total || 0} 个案件
          </Badge>
        </div>
      </div>

      {/* Assignment Bar */}
      <Card className="border-[hsl(210,95%,40%)] bg-[hsl(210,95%,40%)]/5">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-[hsl(210,95%,40%)]" />
              <span>已选择 {selectedCases.size} 个案件</span>
            </div>

            <Select value={assigningUser} onValueChange={setAssigningUser}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="选择外访人员" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.activeCases} 案件)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleBatchAssign}
              disabled={selectedCases.size === 0 || !assigningUser || assigning}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {assigning ? '分配中...' : '批量分配'}
            </Button>

            {selectedCases.size > 0 && (
              <Button
                variant="ghost"
                onClick={() => setSelectedCases(new Set())}
              >
                取消选择
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
                      cases?.data &&
                      cases.data.length !== 0 &&
                      selectedCases.size === cases.data.length
                    }
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </TableHead>
                <TableHead>案件编号</TableHead>
                <TableHead>借款人</TableHead>
                <TableHead className="text-right">欠款金额</TableHead>
                <TableHead>逾期天数</TableHead>
                <TableHead>当前状态</TableHead>
                <TableHead>当前负责人</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : !cases?.data || cases.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    暂无待分配案件
                  </TableCell>
                </TableRow>
              ) : (
                cases.data.map((item) => (
                  <TableRow key={item.id} className="hover:bg-accent/50">
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedCases.has(item.id)}
                        onChange={() => handleSelect(item.id)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.caseNo}</TableCell>
                    <TableCell className="font-medium">{item.borrowerName}</TableCell>
                    <TableCell className="text-right font-data">
                      {formatCurrency(item.debtAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.overdueDays > 60
                            ? 'destructive'
                            : item.overdueDays > 30
                            ? 'warning'
                            : 'outline'
                        }
                      >
                        {item.overdueDays} 天
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor:
                            CASE_STATUS_CONFIG[item.status]?.color || 'hsl(220,20%,88%)',
                          color: 'white',
                        }}
                      >
                        {CASE_STATUS_CONFIG[item.status]?.label || item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.assignedUser || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {cases && cases.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            共 {cases.total} 条记录，第 {cases.page}/{cases.totalPages} 页
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
              {page} / {cases.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === cases.totalPages}
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
