'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CASE_STATUS_CONFIG } from '@/lib/constants';
import { Eye, ChevronLeft, ChevronRight, FileText, User } from 'lucide-react';
import Link from 'next/link';

interface Case {
  id: string;
  caseNo: string;
  borrowerName: string;
  borrowerPhone: string;
  debtAmount: string;
  status: string;
  assigneeName: string | null;
  createdAt: string;
}

export default function MyCasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cases?page=${page}&pageSize=${pageSize}&myCases=true`);
      const json = await res.json();
      if (json.success) {
        setCases(json.data);
        setTotal(json.total);
      }
    } catch (error) {
      console.error('获取失败:', error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <User className="w-6 h-6 text-blue-600" />
              我的案件
            </h1>
            <p className="text-sm text-slate-500 mt-1">共 {total} 个案件</p>
          </div>
        </div>

      <div className="p-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">案件编号</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">借款人</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">电话</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">欠款金额</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">状态</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">创建时间</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-6 py-4">
                            <Skeleton className="h-5 w-20" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : cases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500">暂无案件数据</p>
                      </td>
                    </tr>
                  ) : (
                    cases.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-sm text-blue-600">{c.caseNo}</td>
                        <td className="px-6 py-4 font-medium">{c.borrowerName}</td>
                        <td className="px-6 py-4 text-slate-600">{c.borrowerPhone}</td>
                        <td className="px-6 py-4 font-mono tabular-nums">{formatCurrency(c.debtAmount)}</td>
                        <td className="px-6 py-4">
                          <Badge className={CASE_STATUS_CONFIG[c.status as keyof typeof CASE_STATUS_CONFIG]?.color}>
                            {CASE_STATUS_CONFIG[c.status as keyof typeof CASE_STATUS_CONFIG]?.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-sm">{formatDate(c.createdAt)}</td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/cases/${c.id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && cases.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                <p className="text-sm text-slate-600">
                  显示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 条
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    上一页
                  </Button>
                  <span className="text-sm text-slate-600">第 {page} 页</span>
                  <Button variant="outline" size="sm" disabled={cases.length < pageSize} onClick={() => setPage(p => p + 1)}>
                    下一页
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
