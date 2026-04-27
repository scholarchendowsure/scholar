'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { CASE_STATUS_CONFIG, RISK_LEVEL_CONFIG } from '@/lib/constants';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Building2,
  Calendar,
  User,
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle,
  Edit,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CaseDetail {
  id: string;
  caseNo: string;
  borrowerName: string;
  borrowerIdCard: string;
  borrowerPhone: string;
  address: string;
  debtAmount: string;
  loanOrderNo: string;
  companyName: string;
  loanAmount: string;
  loanBalance: string;
  overdueAmount: string;
  status: 'pending_assign' | 'pending_visit' | 'following' | 'closed';
  batchNumber: string;
  homeAddress: string;
  companyAddress: string;
  otherAddress: string;
  riskLevel: string;
  salesPerson: string;
  postLoanManager: string;
  fundingSource: string;
  platform: string;
  productName: string;
  overdueDays: number;
  assignee: {
    id: string;
    name: string;
    username: string;
    department: string;
  } | null;
  followups: Array<{
    id: string;
    visitTime: string;
    visitResult: string;
    communicationContent: string;
    repaymentIntention: string;
    nextPlan: string;
    visitorName: string;
    followupType: string;
    createdAt: string;
  }>;
  closures: Array<{
    id: string;
    closureType: string;
    closureNote: string;
    actualRepaymentAmount: string;
    closedAt: string;
  }>;
  riskAssessments: Array<{
    id: string;
    riskLevel: string;
    shopStatusTags: string[];
    assetTags: string[];
    repaymentTags: string[];
    result: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function CaseDetailPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [followupDialogOpen, setFollowupDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  // Followup form
  const [followupType, setFollowupType] = useState('');
  const [visitResult, setVisitResult] = useState('');
  const [communicationContent, setCommunicationContent] = useState('');
  const [repaymentIntention, setRepaymentIntention] = useState('');
  const [nextPlan, setNextPlan] = useState('');

  // Close form
  const [closureType, setClosureType] = useState('');
  const [closureNote, setClosureNote] = useState('');
  const [actualRepaymentAmount, setActualRepaymentAmount] = useState('');

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const res = await fetch(`/api/cases/${params.id}`);
        const data = await res.json();
        if (data.success) {
          setCaseData(data.data);
        }
      } catch (error) {
        toast.error('获取案件详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [params.id]);

  const handleCreateFollowup = async () => {
    try {
      const res = await fetch(`/api/cases/${params.id}/followups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followupType,
          visitResult,
          communicationContent,
          repaymentIntention,
          nextPlan,
          visitTime: new Date(),
        }),
      });

      if (res.ok) {
        toast.success('跟进记录创建成功');
        setFollowupDialogOpen(false);
        // Refresh data
        const refreshRes = await fetch(`/api/cases/${params.id}`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setCaseData(refreshData.data);
        }
      }
    } catch (error) {
      toast.error('创建跟进记录失败');
    }
  };

  const handleCloseCase = async () => {
    try {
      const res = await fetch(`/api/cases/${params.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closureType,
          closureNote,
          actualRepaymentAmount,
        }),
      });

      if (res.ok) {
        toast.success('案件已结案');
        setCloseDialogOpen(false);
        // Refresh data
        const refreshRes = await fetch(`/api/cases/${params.id}`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setCaseData(refreshData.data);
        }
      }
    } catch (error) {
      toast.error('结案操作失败');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-[200px]" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-[400px]" />
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">案件不存在</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/cases">返回列表</Link>
        </Button>
      </div>
    );
  }

  const statusConfig = CASE_STATUS_CONFIG[caseData.status];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/cases">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{caseData.caseNo}</h1>
            <p className="text-sm text-muted-foreground">
              创建于 {formatDateTime(caseData.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge style={{ backgroundColor: statusConfig?.color }} className="text-white text-base px-3 py-1">
            {statusConfig?.label}
          </Badge>
          {caseData.status !== 'closed' && (
            <>
              <Button variant="outline" onClick={() => setFollowupDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                添加跟进
              </Button>
              <Button onClick={() => setCloseDialogOpen(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                结案
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                基本信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">借款人姓名</p>
                  <p className="font-medium">{caseData.borrowerName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">身份证号</p>
                  <p className="font-mono text-sm">{caseData.borrowerIdCard || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">联系电话</p>
                  <p className="font-mono">{caseData.borrowerPhone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">贷款单号</p>
                  <p className="font-mono text-sm">{caseData.loanOrderNo || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">公司名称</p>
                  <p className="text-sm">{caseData.companyName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">批次号</p>
                  <p className="font-mono text-sm">{caseData.batchNumber || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                财务信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">欠款金额</p>
                  <p className="text-xl font-bold font-data text-[hsl(0,75%,50%)]">
                    {formatCurrency(caseData.debtAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">贷款金额</p>
                  <p className="font-data">{formatCurrency(caseData.loanAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">贷款余额</p>
                  <p className="font-data">{formatCurrency(caseData.loanBalance)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">逾期金额</p>
                  <p className="font-data text-[hsl(0,75%,50%)]">
                    {formatCurrency(caseData.overdueAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">逾期天数</p>
                  <p className="font-data">{caseData.overdueDays || 0} 天</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">风险等级</p>
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: RISK_LEVEL_CONFIG[caseData.riskLevel as keyof typeof RISK_LEVEL_CONFIG]?.color,
                      color: RISK_LEVEL_CONFIG[caseData.riskLevel as keyof typeof RISK_LEVEL_CONFIG]?.color,
                    }}
                  >
                    {RISK_LEVEL_CONFIG[caseData.riskLevel as keyof typeof RISK_LEVEL_CONFIG]?.label || caseData.riskLevel || '-'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">资金来源</p>
                  <p>{caseData.fundingSource || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">平台</p>
                  <p>{caseData.platform || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                地址信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">家庭地址</p>
                  <p>{caseData.homeAddress || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">公司地址</p>
                  <p>{caseData.companyAddress || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">其他地址</p>
                  <p>{caseData.otherAddress || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Followup Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                跟进记录
              </CardTitle>
            </CardHeader>
            <CardContent>
              {caseData.followups.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  暂无跟进记录
                </p>
              ) : (
                <div className="space-y-4">
                  {caseData.followups.map((followup, index) => (
                    <div key={followup.id} className="relative pl-6 pb-4 border-l border-border last:pb-0">
                      <div className="absolute left-0 top-0 w-2 h-2 rounded-full bg-[hsl(210,95%,40%)]" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{followup.visitorName || '未知'}</span>
                          <Badge variant="outline">{followup.followupType || '跟进'}</Badge>
                          <span className="text-muted-foreground">
                            {formatDateTime(followup.visitTime)}
                          </span>
                        </div>
                        {followup.visitResult && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">结果：</span>
                            {followup.visitResult}
                          </p>
                        )}
                        {followup.communicationContent && (
                          <p className="text-sm">{followup.communicationContent}</p>
                        )}
                        {followup.repaymentIntention && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">还款意向：</span>
                            {followup.repaymentIntention}
                          </p>
                        )}
                        {followup.nextPlan && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">下一步计划：</span>
                            {followup.nextPlan}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Assignee */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                负责人
              </CardTitle>
            </CardHeader>
            <CardContent>
              {caseData.assignee ? (
                <div className="space-y-2">
                  <p className="font-medium">{caseData.assignee.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {caseData.assignee.department || '贷后部门'}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">未分配</p>
              )}
            </CardContent>
          </Card>

          {/* Closure Info */}
          {caseData.closures.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  结案信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                {caseData.closures.map((closure) => (
                  <div key={closure.id} className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">结案类型</p>
                      <Badge variant="outline">
                        {closure.closureType === 'full_repayment' && '全额回款'}
                        {closure.closureType === 'partial_repayment' && '部分回款'}
                        {closure.closureType === 'no_repayment' && '无回款'}
                        {closure.closureType === 'other' && '其他'}
                      </Badge>
                    </div>
                    {closure.actualRepaymentAmount && (
                      <div>
                        <p className="text-sm text-muted-foreground">实际回款</p>
                        <p className="font-data font-bold text-[hsl(145,65%,38%)]">
                          {formatCurrency(closure.actualRepaymentAmount)}
                        </p>
                      </div>
                    )}
                    {closure.closureNote && (
                      <div>
                        <p className="text-sm text-muted-foreground">备注</p>
                        <p className="text-sm">{closure.closureNote}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">结案时间</p>
                      <p className="text-sm">{formatDateTime(closure.closedAt)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Risk Assessments */}
          {caseData.riskAssessments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  风险评定
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {caseData.riskAssessments.map((assessment) => (
                    <div key={assessment.id} className="space-y-2 pb-4 border-b last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <Badge
                          style={{
                            backgroundColor: RISK_LEVEL_CONFIG[assessment.riskLevel as keyof typeof RISK_LEVEL_CONFIG]?.color,
                          }}
                          className="text-white"
                        >
                          {RISK_LEVEL_CONFIG[assessment.riskLevel as keyof typeof RISK_LEVEL_CONFIG]?.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(assessment.createdAt)}
                        </span>
                      </div>
                      {assessment.result && (
                        <p className="text-sm">{assessment.result}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Followup Dialog */}
      <Dialog open={followupDialogOpen} onOpenChange={setFollowupDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加跟进记录</DialogTitle>
            <DialogDescription>记录本次跟进内容</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>跟进类型</Label>
                <Select value={followupType} onValueChange={setFollowupType}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">电话跟进</SelectItem>
                    <SelectItem value="visit">上门外访</SelectItem>
                    <SelectItem value="document">文件跟进</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>跟进结果</Label>
                <Select value={visitResult} onValueChange={setVisitResult}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="success">成功联系</SelectItem>
                    <SelectItem value="no_answer">无人接听</SelectItem>
                    <SelectItem value="rejected">拒接</SelectItem>
                    <SelectItem value="wrong_number">号码错误</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>沟通内容</Label>
              <Textarea
                value={communicationContent}
                onChange={(e) => setCommunicationContent(e.target.value)}
                placeholder="请描述本次沟通内容..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>还款意向</Label>
                <Select value={repaymentIntention} onValueChange={setRepaymentIntention}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="willing">有意愿</SelectItem>
                    <SelectItem value="considering">考虑中</SelectItem>
                    <SelectItem value="reluctant">不情愿</SelectItem>
                    <SelectItem value="refuse">拒绝</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>下一步计划</Label>
                <Input
                  value={nextPlan}
                  onChange={(e) => setNextPlan(e.target.value)}
                  placeholder="请输入下一步计划"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowupDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateFollowup}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Case Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>结案处理</DialogTitle>
            <DialogDescription>请填写结案信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>结案类型</Label>
              <Select value={closureType} onValueChange={setClosureType}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_repayment">全额回款</SelectItem>
                  <SelectItem value="partial_repayment">部分回款</SelectItem>
                  <SelectItem value="no_repayment">无回款</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>实际回款金额</Label>
              <Input
                type="number"
                value={actualRepaymentAmount}
                onChange={(e) => setActualRepaymentAmount(e.target.value)}
                placeholder="请输入回款金额"
              />
            </div>
            <div className="space-y-2">
              <Label>结案备注</Label>
              <Textarea
                value={closureNote}
                onChange={(e) => setClosureNote(e.target.value)}
                placeholder="请输入备注信息..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCloseCase}>确认结案</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
