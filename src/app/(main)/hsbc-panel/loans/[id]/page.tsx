'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { HSBCLoan, HSBCLoanLog } from '@/lib/hsbc-loan';

export default function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loan, setLoan] = useState<HSBCLoan | null>(null);
  const [logs, setLogs] = useState<HSBCLoanLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedLoan, setEditedLoan] = useState<Partial<HSBCLoan>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadLoan();
  }, [id]);

  const loadLoan = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hsbc/loans/${id}`);
      if (res.ok) {
        const data = await res.json();
        setLoan(data.loan);
        setEditedLoan(data.loan);
        setLogs(data.logs || []);
      } else {
        toast.error('贷款不存在');
        router.push('/hsbc-panel/loans');
      }
    } catch (error) {
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof HSBCLoan, value: any) => {
    setEditedLoan(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/hsbc/loans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editedLoan,
          action: 'update_info',
          operator: 'Admin',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLoan(data.loan);
        setLogs(prev => [data.log, ...prev]);
        setHasChanges(false);
        toast.success('保存成功');
      } else {
        toast.error('保存失败');
      }
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'CNY') => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!loan) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/hsbc-panel/loans')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回列表
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{loan.loanReference}</h1>
              <p className="text-slate-600 mt-1">{loan.borrowerName}</p>
            </div>
          </div>
          <div className="flex gap-3">
            {hasChanges && (
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? '保存中...' : '保存修改'}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：编辑表单 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本信息 */}
            <Card>
              <CardHeader>
                <CardTitle>基本信息</CardTitle>
                <CardDescription>贷款基本信息和状态</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>商户ID</Label>
                    <Input value={editedLoan.merchantId || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>借款人名称</Label>
                    <Input 
                      value={editedLoan.borrowerName || ''} 
                      onChange={(e) => handleChange('borrowerName', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>贷款编号</Label>
                    <Input value={editedLoan.loanReference || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>状态</Label>
                    <Select 
                      value={editedLoan.status || 'active'} 
                      onValueChange={(value) => handleChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">正常</SelectItem>
                        <SelectItem value="overdue">逾期</SelectItem>
                        <SelectItem value="settled">已结清</SelectItem>
                        <SelectItem value="written_off">坏账</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 贷款详情 */}
            <Card>
              <CardHeader>
                <CardTitle>贷款详情</CardTitle>
                <CardDescription>贷款金额和期限信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>贷款金额</Label>
                    <Input 
                      type="number"
                      value={editedLoan.loanAmount || 0} 
                      onChange={(e) => handleChange('loanAmount', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>货币</Label>
                    <Select 
                      value={editedLoan.loanCurrency || 'USD'} 
                      onValueChange={(value) => handleChange('loanCurrency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CNY">人民币 (CNY)</SelectItem>
                        <SelectItem value="USD">美元 (USD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>贷款期限</Label>
                    <Input 
                      value={editedLoan.loanTenor || ''} 
                      onChange={(e) => handleChange('loanTenor', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>总利率 (%)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={editedLoan.totalInterestRate || 0} 
                      onChange={(e) => handleChange('totalInterestRate', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>起贷日期</Label>
                    <Input 
                      value={editedLoan.loanStartDate || ''} 
                      onChange={(e) => handleChange('loanStartDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>到期日期</Label>
                    <Input 
                      value={editedLoan.maturityDate || ''} 
                      onChange={(e) => handleChange('maturityDate', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>余额</Label>
                    <Input 
                      type="number"
                      value={editedLoan.balance || 0} 
                      onChange={(e) => handleChange('balance', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>逾期金额</Label>
                    <Input 
                      type="number"
                      value={editedLoan.pastdueAmount || 0} 
                      onChange={(e) => handleChange('pastdueAmount', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 操作记录 */}
            <Card>
              <CardHeader>
                <CardTitle>操作记录</CardTitle>
                <CardDescription>冻结账户、强制扣款等操作</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>冻结账户请求日期</Label>
                    <Input 
                      placeholder="DDMMYY"
                      value={editedLoan.freezeAccountRequested || ''} 
                      onChange={(e) => handleChange('freezeAccountRequested', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>强制扣款请求日期</Label>
                    <Input 
                      placeholder="DDMMYY"
                      value={editedLoan.forceDebitRequested || ''} 
                      onChange={(e) => handleChange('forceDebitRequested', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>RM审批日期</Label>
                    <Input 
                      placeholder="DDMMYY"
                      value={editedLoan.approvalFromRM || ''} 
                      onChange={(e) => handleChange('approvalFromRM', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dowsure冻结账户确认</Label>
                    <Input 
                      placeholder="DDMMYY"
                      value={editedLoan.confirmationFreezeAccount || ''} 
                      onChange={(e) => handleChange('confirmationFreezeAccount', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Dowsure强制扣款确认</Label>
                  <Input 
                    placeholder="DDMMYY"
                    value={editedLoan.confirmationForceDebit || ''} 
                    onChange={(e) => handleChange('confirmationForceDebit', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 备注 */}
            <Card>
              <CardHeader>
                <CardTitle>备注</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  placeholder="添加备注信息..."
                  value={editedLoan.remarks || ''} 
                  onChange={(e) => handleChange('remarks', e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* 右侧：概览和日志 */}
          <div className="space-y-6">
            {/* 财务概览 */}
            <Card>
              <CardHeader>
                <CardTitle>财务概览</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">贷款金额</span>
                  </div>
                  <p className="text-2xl font-bold font-mono">
                    {formatCurrency(loan.loanAmount, loan.loanCurrency)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">当前余额</span>
                  </div>
                  <p className="text-2xl font-bold font-mono">
                    {formatCurrency(loan.balance, loan.loanCurrency)}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-600 mb-1">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">逾期金额</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-red-600">
                    {formatCurrency(loan.pastdueAmount, loan.loanCurrency)}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant={loan.pastdueAmount > 0 ? 'destructive' : 'default'}>
                    {loan.pastdueAmount > 0 ? '逾期中' : '正常'}
                  </Badge>
                  <span className="text-sm text-slate-500">
                    {loan.loanCurrency}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 还款计划 */}
            <Card>
              <CardHeader>
                <CardTitle>还款计划</CardTitle>
              </CardHeader>
              <CardContent>
                {loan.repaymentSchedule && loan.repaymentSchedule.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日期</TableHead>
                        <TableHead>金额</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loan.repaymentSchedule.map((record, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-sm">{record.date}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatCurrency(record.amount, loan.loanCurrency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={record.repaid ? 'default' : 'secondary'}>
                              {record.repaid ? '已还' : '未还'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">暂无还款计划</p>
                )}
              </CardContent>
            </Card>

            {/* 操作日志 */}
            <Card>
              <CardHeader>
                <CardTitle>操作日志</CardTitle>
              </CardHeader>
              <CardContent>
                {logs.length > 0 ? (
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div key={log.id} className="flex gap-3 text-sm">
                        <div className="mt-1">
                          {log.action === 'delete' ? (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{log.action}</p>
                          <p className="text-slate-500">{log.operator}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(log.timestamp).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">暂无操作记录</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
