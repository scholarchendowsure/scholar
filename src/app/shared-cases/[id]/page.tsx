'use client';

// 免登录案件详情页
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FOLLOWUP_TYPE_OPTIONS, CONTACT_OPTIONS, FOLLOWUP_RESULT_OPTIONS, FollowUp } from '@/types/case';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Case } from '@/types/case';
import { toast } from 'sonner';

// 状态标签配置
const STATUS_CONFIG = {
  pending_assign: { label: '待分配', color: 'bg-yellow-100 text-yellow-800' },
  pending_visit: { label: '待外访', color: 'bg-blue-100 text-blue-800' },
  following: { label: '跟进中', color: 'bg-blue-600 text-white' },
  closed: { label: '已结案', color: 'bg-green-100 text-green-800' },
};

// 风险等级配置
const RISK_CONFIG = {
  low: { label: '低', color: 'bg-green-100 text-green-800' },
  medium: { label: '中', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: '高', color: 'bg-orange-100 text-orange-800' },
  critical: { label: '极高', color: 'bg-red-100 text-red-800' },
};

// 金额格式化
const formatMoney = (amount: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// 字段显示组件
const Field = ({ label, value, highlight = false, action }: { 
  label: string; 
  value: string | number | React.ReactNode; 
  highlight?: boolean;
  action?: React.ReactNode;
}) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      {action}
    </div>
    <dd className={`text-sm ${highlight ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
      {value !== undefined && value !== null && value !== '' ? value : '-'}
    </dd>
  </div>
);

export default function SharedCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFollowupDialog, setShowFollowupDialog] = useState(false);
  const [newFollowup, setNewFollowup] = useState<Partial<FollowUp>>({
    followType: 'online',
    contact: 'legal_representative',
    followResult: 'normal_repayment',
    followRecord: '',
  });
  const [savingFollowup, setSavingFollowup] = useState(false);

  // 添加跟进记录
  const handleAddFollowup = async () => {
    if (!caseData?.id) return;
    if (!newFollowup.followRecord?.trim()) {
      toast.error('请输入跟进记录');
      return;
    }

    setSavingFollowup(true);
    try {
      const res = await fetch(`/api/cases/${caseData.id}/followups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newFollowup,
          follower: '免登录用户',
          syncToSameUser: true
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success('跟进记录已添加');
        setShowFollowupDialog(false);
        setNewFollowup({
          followType: 'online',
          contact: 'legal_representative',
          followResult: 'normal_repayment',
          followRecord: '',
        });
        // 刷新案件数据
        if (params.id) {
          fetchCase(params.id as string);
        }
      } else {
        toast.error(data.error || '添加失败');
      }
    } catch (error) {
      console.error('添加跟进记录失败:', error);
      toast.error('添加跟进记录失败');
    } finally {
      setSavingFollowup(false);
    }
  };

  // 获取案件详情
  const fetchCase = async (id: string) => {
    try {
      setLoading(true);
      // 添加时间戳参数防止任何级别的缓存
      const res = await fetch(`/api/cases/${id}?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
        },
      });
      const json: { success: boolean; data: Case } = await res.json();

      if (json.success) {
        console.log(`[SharedCase] 获取案件成功, followups数量: ${json.data.followups?.length || 0}`);
        setCaseData(json.data);
      } else {
        toast.error('获取案件详情失败');
      }
    } catch (error) {
      toast.error('获取案件详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchCase(params.id as string);
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
        <p className="ml-2 text-slate-600">加载中...</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">案件不存在</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-slate-900">案件详情</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {caseData.loanNo}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => params.id && fetchCase(params.id as string)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>
              <Button size="sm" onClick={() => setShowFollowupDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                新增跟进记录
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 核心信息卡片 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-1 h-6 bg-blue-600 rounded"></div>
              案件基本信息
              <Badge className={STATUS_CONFIG[caseData.status as keyof typeof STATUS_CONFIG]?.color || 'bg-slate-100 text-slate-800'}>
                {STATUS_CONFIG[caseData.status as keyof typeof STATUS_CONFIG]?.label || caseData.status}
              </Badge>
              <Badge className={RISK_CONFIG[caseData.riskLevel as keyof typeof RISK_CONFIG]?.color || 'bg-slate-100 text-slate-800'}>
                {RISK_CONFIG[caseData.riskLevel as keyof typeof RISK_CONFIG]?.label}风险
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Field label="产品名称" value={caseData.productName} />
              <Field label="资金方" value={caseData.funder} />
              <Field label="借款人姓名" value={(caseData as any).borrowerName || '-'} />
              <Field label="用户ID" value={caseData.userId} />
              <Field label="贷款单号" value={caseData.loanNo} highlight />
              <Field label="逾期金额" value={
                <span className={(caseData.overdueAmount || 0) > 0 ? 'text-red-600 font-semibold' : ''}>
                  {formatMoney(caseData.overdueAmount || 0)}
                </span>
              } highlight />
              <Field label="到期日" value={(caseData as any).dueDate || '-'} />
              <Field label="案件标签" value={(caseData as any).caseTags?.join('、') || '-'} />
            </dl>
          </CardContent>
        </Card>

        {/* 跟进记录 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-1 h-6 bg-red-600 rounded"></div>
              跟进记录
              <span className="text-sm text-slate-500">
                ({(caseData.followups || []).length}条)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(caseData.followups || []).length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                暂无跟进记录
              </div>
            ) : (
              <div className="space-y-4">
                {[...(caseData.followups || [])]
                  .sort((a, b) => new Date(b.followTime || b.createdAt || 0).getTime() - new Date(a.followTime || a.createdAt || 0).getTime())
                  .map((followup, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2 text-sm text-slate-600">
                        <span className="font-medium text-slate-900">跟进人：{followup.follower || followup.createdBy || '-'}</span>
                        <span>|</span>
                        <span>跟进时间：{new Date(followup.followTime || followup.createdAt || 0).toLocaleString('zh-CN')}</span>
                        <span>|</span>
                        <span>跟进类型：{FOLLOWUP_TYPE_OPTIONS.find(o => o.value === followup.followType)?.label || '-'}</span>
                        <span>|</span>
                        <span>联系人：{CONTACT_OPTIONS.find(o => o.value === followup.contact)?.label || '-'}</span>
                        <span>|</span>
                        <span>跟进结果：{FOLLOWUP_RESULT_OPTIONS.find(o => o.value === followup.followResult)?.label || '-'}</span>
                      </div>
                      <div className="text-slate-700 whitespace-pre-wrap">
                        记录：{followup.followRecord}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 新增跟进记录对话框 */}
      <Dialog open={showFollowupDialog} onOpenChange={setShowFollowupDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新增跟进记录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>跟进类型</Label>
                <Select 
                  value={newFollowup.followType as any} 
                  onValueChange={(v) => setNewFollowup(prev => ({ ...prev, followType: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLLOWUP_TYPE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>联系人</Label>
                <Select 
                  value={newFollowup.contact as any} 
                  onValueChange={(v) => setNewFollowup(prev => ({ ...prev, contact: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>跟进结果</Label>
              <Select 
                value={newFollowup.followResult as any} 
                onValueChange={(v) => setNewFollowup(prev => ({ ...prev, followResult: v as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOWUP_RESULT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>跟进记录</Label>
              <Textarea 
                placeholder="请输入跟进记录内容..."
                value={newFollowup.followRecord || ''}
                onChange={(e) => setNewFollowup(prev => ({ ...prev, followRecord: e.target.value }))}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFollowupDialog(false)} disabled={savingFollowup}>
              取消
            </Button>
            <Button onClick={handleAddFollowup} disabled={savingFollowup}>
              {savingFollowup ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}