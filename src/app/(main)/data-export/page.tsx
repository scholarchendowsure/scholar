'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Download, Calendar, FileSpreadsheet } from 'lucide-react';

export default function DataExportPage() {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  const handleExport = async (type: 'cases' | 'repayments') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.set('startDate', dateRange.startDate);
      if (dateRange.endDate) params.set('endDate', dateRange.endDate);

      const res = await fetch(`/api/cases/export?${params.toString()}&type=${type}`);
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type === 'cases' ? '案件数据' : '还款记录'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('导出成功');
      } else {
        toast.error('导出失败');
      }
    } catch (error) {
      toast.error('导出失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">数据导出</h1>
        <p className="text-muted-foreground mt-1">按日期范围导出案件和还款数据</p>
      </div>

      {/* Date Range */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            日期范围筛选
          </CardTitle>
          <CardDescription>选择导出数据的时间范围</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>开始日期</Label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>结束日期</Label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                variant="outline"
                onClick={() => setDateRange({ startDate: '', endDate: '' })}
              >
                清空筛选
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-[hsl(210,95%,40%)]" />
              案件数据导出
            </CardTitle>
            <CardDescription>
              导出所有案件的详细信息，包含跟进记录和结案信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1 mb-4">
              <li>- 基本信息：案件编号、借款人、地址、联系方式</li>
              <li>- 财务信息：欠款金额、逾期天数、贷款余额</li>
              <li>- 状态信息：案件状态、负责人、批次号</li>
              <li>- 风险信息：风险等级、资金来源、产品名称</li>
            </ul>
            <Button
              className="w-full"
              onClick={() => handleExport('cases')}
              disabled={loading}
            >
              <Download className="h-4 w-4 mr-2" />
              {loading ? '导出中...' : '导出案件 Excel'}
            </Button>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-[hsl(145,65%,38%)]" />
              还款记录导出
            </CardTitle>
            <CardDescription>
              导出所有还款记录，包含审核状态和还款明细
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1 mb-4">
              <li>- 贷款信息：贷款单号、借款人、贷款金额</li>
              <li>- 还款信息：还款日期、还款金额、逾期金额</li>
              <li>- 审核信息：审核状态、审核人、审核备注</li>
            </ul>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleExport('repayments')}
              disabled={loading}
            >
              <Download className="h-4 w-4 mr-2" />
              {loading ? '导出中...' : '导出还款记录 Excel'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* HSBC Export */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-lg">汇丰贷款导出</CardTitle>
          <CardDescription>
            导出汇丰贷款仪表盘数据，包含公式引用的完整底表
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            导出的 Excel 文件包含所有汇丰贷款数据及预置的统计公式，方便后续分析和制作报告。
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              setLoading(true);
              try {
                const res = await fetch('/api/hsbc/export');
                if (res.ok) {
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `汇丰贷款数据_${new Date().toISOString().split('T')[0]}.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                  toast.success('导出成功');
                }
              } catch (error) {
                toast.error('导出失败');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            <Download className="h-4 w-4 mr-2" />
            导出汇丰贷款 Excel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
