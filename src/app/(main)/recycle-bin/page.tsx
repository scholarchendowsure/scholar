'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  Upload,
  Download,
  RefreshCw,
  Trash2,
  RotateCcw,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';
import Link from 'next/link';

interface DeletedCase {
  id: string;
  caseNo: string;
  borrowerName: string;
  debtAmount: string;
  status: string;
  deletedAt: string;
  deletedBy: string;
}

export default function RecycleBinPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<DeletedCase[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchDeletedCases = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cases/recycle-bin');
      const result = await res.json();
      if (result.success) {
        setCases(result.data || []);
      }
    } catch (error) {
      toast.error('获取回收站数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedCases();
  }, []);

  const handleSelectAll = () => {
    if (selectedIds.size === cases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cases.map((c) => c.id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleRestore = async () => {
    if (selectedIds.size === 0) {
      toast.error('请选择要恢复的案件');
      return;
    }

    setRestoring(true);
    try {
      const res = await fetch('/api/cases/recycle-bin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(result.message || `已恢复 ${selectedIds.size} 个案件`);
        setSelectedIds(new Set());
        fetchDeletedCases();
      } else {
        toast.error(result.error || '恢复失败');
      }
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('恢复失败');
    } finally {
      setRestoring(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error('请选择要永久删除的案件');
      return;
    }

    if (!confirm(`确定要永久删除 ${selectedIds.size} 个案件吗？此操作不可恢复！`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch('/api/cases/recycle-bin/permanent-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(result.message || `已永久删除 ${selectedIds.size} 个案件`);
        setSelectedIds(new Set());
        fetchDeletedCases();
      } else {
        toast.error(result.error || '删除失败');
      }
    } catch (error) {
      console.error('Permanent delete error:', error);
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">回收站</h1>
            <p className="text-muted-foreground text-sm mt-1">
              已删除的案件可在此恢复或永久删除
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRestore}
            disabled={selectedIds.size === 0 || restoring}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            恢复 ({selectedIds.size})
          </Button>
          <Button
            variant="destructive"
            onClick={handlePermanentDelete}
            disabled={selectedIds.size === 0 || deleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            永久删除 ({selectedIds.size})
          </Button>
        </div>
      </div>

      {/* Warning Banner */}
      <Card className="border-[hsl(35,90%,45%)] bg-[hsl(35,90%,45%)]/10">
        <CardContent className="py-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[hsl(35,90%,45%)]" />
          <span className="text-sm">
            永久删除的案件无法恢复，请谨慎操作
          </span>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium w-[40px]">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === cases.length && cases.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left py-3 px-4 font-medium">案件编号</th>
                <th className="text-left py-3 px-4 font-medium">借款人</th>
                <th className="text-right py-3 px-4 font-medium">欠款金额</th>
                <th className="text-left py-3 px-4 font-medium">原状态</th>
                <th className="text-left py-3 px-4 font-medium">删除时间</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-3 px-4"><Skeleton className="h-4 w-4" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-6 w-12" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                  </tr>
                ))
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet className="h-12 w-12 opacity-50" />
                      <p>回收站为空</p>
                    </div>
                  </td>
                </tr>
              ) : (
                cases.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-accent/50">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => handleSelect(item.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="py-3 px-4 font-mono">{item.caseNo}</td>
                    <td className="py-3 px-4 font-medium">{item.borrowerName}</td>
                    <td className="py-3 px-4 text-right font-data">
                      {formatCurrency(item.debtAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{item.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {formatDate(item.deletedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
