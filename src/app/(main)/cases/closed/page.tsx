'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Eye,
  Download,
  CalendarRange
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatCurrency, CASE_STATUS_CONFIG } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

interface ClosedCase {
  id: string;
  caseNo: string;
  borrowerName: string;
  borrowerPhone: string;
  debtAmount: number;
  loanAmount: number;
  overdueAmount: number;
  actualRepaymentAmount: number;
  closureType: 'full_repayment' | 'partial_repayment' | 'no_repayment' | 'other';
  closureNote: string;
  closedAt: string;
  closedBy: string;
  companyName?: string;
  address?: string;
}

interface ClosureStats {
  total: number;
  totalAmount: number;
  recoveryRate: number;
  fullRepayment: number;
  partialRepayment: number;
  avgRecoveryDays: number;
  monthlyTrend: { month: string; count: number; amount: number }[];
}

const closureTypeConfig = {
  full_repayment: { label: '全额回款', variant: 'success' as const },
  partial_repayment: { label: '部分回款', variant: 'warning' as const },
  no_repayment: { label: '无回款', variant: 'danger' as const },
  other: { label: '其他', variant: 'default' as const },
};

export default function ClosedCasesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<ClosedCase[]>([]);
  const [stats, setStats] = useState<ClosureStats | null>(null);
  const [search, setSearch] = useState('');
  const [closureType, setClosureType] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // 生成模拟数据
  const generateMockClosedCases = (): ClosedCase[] => {
    const cases: ClosedCase[] = [];
    const names = ['张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十', '钱一', '陈二'];
    const companys = ['某某科技公司', '某某贸易公司', '某某电子有限公司', '某某网络科技'];
    const closureTypes: ('full_repayment' | 'partial_repayment' | 'no_repayment' | 'other')[] = 
      ['full_repayment', 'full_repayment', 'full_repayment', 'partial_repayment', 'partial_repayment', 'no_repayment', 'other'];
    
    for (let i = 0; i < 28; i++) {
      const debtAmount = Math.floor(Math.random() * 500000) + 50000;
      const closureType = closureTypes[Math.floor(Math.random() * closureTypes.length)];
      let actualRepaymentAmount = 0;
      
      if (closureType === 'full_repayment') {
        actualRepaymentAmount = debtAmount;
      } else if (closureType === 'partial_repayment') {
        actualRepaymentAmount = Math.floor(debtAmount * (Math.random() * 0.7 + 0.2));
      }
      
      const daysAgo = Math.floor(Math.random() * 180) + 7;
      const closedAt = new Date();
      closedAt.setDate(closedAt.getDate() - daysAgo);

      cases.push({
        id: `closed-${i + 1}`,
        caseNo: `AJ${2024}${String(i + 1001).padStart(4, '0')}`,
        borrowerName: names[i % names.length],
        borrowerPhone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
        debtAmount,
        loanAmount: Math.floor(debtAmount * (Math.random() * 0.5 + 1)),
        overdueAmount: Math.floor(debtAmount * 0.1),
        actualRepaymentAmount,
        closureType,
        closureNote: closureType === 'full_repayment' ? '已全额结清' : 
                    closureType === 'partial_repayment' ? '部分结清，剩余欠款协商中' :
                    closureType === 'no_repayment' ? '暂无还款能力' : '其他原因结案',
        closedAt: closedAt.toISOString(),
        closedBy: ['张三经理', '李四经理', '王五经理'][Math.floor(Math.random() * 3)],
        companyName: companys[i % companys.length],
        address: '北京市朝阳区某某街道某某号',
      });
    }
    return cases.sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());
  };

  const generateStats = (cases: ClosedCase[]): ClosureStats => {
    const total = cases.length;
    const totalAmount = cases.reduce((sum, c) => sum + c.actualRepaymentAmount, 0);
    const fullRepayment = cases.filter(c => c.closureType === 'full_repayment').length;
    const partialRepayment = cases.filter(c => c.closureType === 'partial_repayment').length;
    const recoveryRate = total > 0 ? 
      Math.round((cases.reduce((sum, c) => sum + c.actualRepaymentAmount, 0) / 
                 cases.reduce((sum, c) => sum + c.debtAmount, 0) * 100)) : 0;
    
    const monthlyData: Record<string, { count: number; amount: number }> = {};
    cases.forEach(c => {
      const month = new Date(c.closedAt).toLocaleDateString('zh-CN', { month: 'short' });
      if (!monthlyData[month]) monthlyData[month] = { count: 0, amount: 0 };
      monthlyData[month].count++;
      monthlyData[month].amount += c.actualRepaymentAmount;
    });

    return {
      total,
      totalAmount,
      recoveryRate,
      fullRepayment,
      partialRepayment,
      avgRecoveryDays: 45,
      monthlyTrend: Object.entries(monthlyData).map(([month, data]) => ({
        month,
        count: data.count,
        amount: data.amount
      })),
    };
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const mockCases = generateMockClosedCases();
      setCases(mockCases);
      setStats(generateStats(mockCases));
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // 筛选逻辑
  const filteredCases = cases.filter(c => {
    const matchesSearch = !search || 
      c.caseNo.toLowerCase().includes(search.toLowerCase()) ||
      c.borrowerName.toLowerCase().includes(search.toLowerCase()) ||
      (c.companyName && c.companyName.toLowerCase().includes(search.toLowerCase()));
    const matchesType = closureType === 'all' || c.closureType === closureType;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredCases.length / pageSize);
  const paginatedCases = filteredCases.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleExport = () => {
    toast.success('导出成功！', {
      description: '结清案件列表已导出'
    });
  };

  const handleViewCase = (id: string) => {
    router.push(`/cases/${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">结清案件</h1>
          <p className="text-slate-500 mt-1">查看和管理已结清的案件记录</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            导出
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">结清案件数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
              <div className="text-xs text-slate-400 mt-1">累计已结案</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">总回款金额</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {formatCurrency(stats.totalAmount)}
              </div>
              <div className="text-xs text-slate-400 mt-1">累计回款</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">回款率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.recoveryRate}%</div>
              <div className="text-xs text-slate-400 mt-1">
                {stats.recoveryRate >= 60 ? '良好' : stats.recoveryRate >= 40 ? '一般' : '待提升'}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">全额结案</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {stats.fullRepayment}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {Math.round(stats.fullRepayment / stats.total * 100)}% 全额回款
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* 筛选和表格 */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="搜索案件编号、借款人、公司名称..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 border-slate-200"
                />
              </div>
              <Select value={closureType} onValueChange={setClosureType}>
                <SelectTrigger className="w-36 border-slate-200">
                  <SelectValue placeholder="结案类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="full_repayment">全额回款</SelectItem>
                  <SelectItem value="partial_repayment">部分回款</SelectItem>
                  <SelectItem value="no_repayment">无回款</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-36 border-slate-200">
                  <SelectValue placeholder="时间范围" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部时间</SelectItem>
                  <SelectItem value="7days">最近7天</SelectItem>
                  <SelectItem value="30days">最近30天</SelectItem>
                  <SelectItem value="90days">最近90天</SelectItem>
                  <SelectItem value="180days">最近180天</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-slate-600 font-semibold">案件编号</TableHead>
                      <TableHead className="text-slate-600 font-semibold">借款人</TableHead>
                      <TableHead className="text-slate-600 font-semibold">欠款金额</TableHead>
                      <TableHead className="text-slate-600 font-semibold">实际回款</TableHead>
                      <TableHead className="text-slate-600 font-semibold">结案类型</TableHead>
                      <TableHead className="text-slate-600 font-semibold">结案时间</TableHead>
                      <TableHead className="text-slate-600 font-semibold">操作人</TableHead>
                      <TableHead className="text-slate-600 font-semibold text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>暂无结清案件</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedCases.map((c) => (
                        <TableRow key={c.id} className="hover:bg-slate-50">
                          <TableCell className="font-mono font-medium text-slate-700">
                            {c.caseNo}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-slate-800">{c.borrowerName}</div>
                            {c.companyName && (
                              <div className="text-xs text-slate-400">{c.companyName}</div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-slate-600">
                            {formatCurrency(c.debtAmount)}
                          </TableCell>
                          <TableCell className="font-mono">
                            <span className={c.closureType === 'full_repayment' ? 'text-emerald-600 font-semibold' : 'text-blue-600'}>
                              {formatCurrency(c.actualRepaymentAmount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={closureTypeConfig[c.closureType].variant}>
                              {closureTypeConfig[c.closureType].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {formatDate(c.closedAt)}
                          </TableCell>
                          <TableCell className="text-slate-600">{c.closedBy}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewCase(c.id)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              查看
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-slate-500">
                    显示 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredCases.length)} / {filteredCases.length} 条
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      上一页
                    </Button>
                    {[...Array(Math.min(5, totalPages))].map((_, i) => (
                      <Button
                        key={i}
                        variant={currentPage === i + 1 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(i + 1)}
                      >
                        {i + 1}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}