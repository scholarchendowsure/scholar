'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { CASE_STATUS_CONFIG, RISK_LEVEL_CONFIG, CLOSURE_TYPE_CONFIG } from '@/lib/constants';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  FileText,
  MessageSquare,
  AlertTriangle,
  Clock,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

interface CaseDetail {
  id: string;
  caseNo: string;
  borrowerName: string;
  borrowerPhone: string;
  address: string;
  debtAmount: string;
  loanAmount: string;
  loanBalance: string;
  overdueAmount: string;
  loanOrderNo: string;
  companyName: string;
  status: string;
  riskLevel: string;
  fundingSource: string;
  assigneeName: string | null;
  createdAt: string;
  followups: Array<{
    id: string;
    visitTime: string;
    visitResult: string;
    communicationContent: string;
    repaymentIntention: string;
    nextPlan: string;
    visitUser: string;
  }>;
  riskAssessments: Array<{
    id: string;
    riskLevel: string;
    shopStatusTags: string[];
    assetTags: string[];
    repaymentTags: string[];
    createdAt: string;
  }>;
}

export default function CaseDetailPage() {
  const params = useParams();
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const res = await fetch(`/api/cases/${params.id}`);
        const json = await res.json();
        if (json.success) {
          setCaseData(json.data);
        }
      } catch (error) {
        console.error('获取案件详情失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <p className="text-slate-500">案件不存在</p>
      </div>
    );
  }

  const statusConfig = CASE_STATUS_CONFIG[caseData.status as keyof typeof CASE_STATUS_CONFIG];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* 头部 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/cases">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                {caseData.caseNo}
              </h1>
              <Badge className={`mt-1 ${statusConfig?.color}`}>
                {statusConfig?.label}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">编辑</Button>
            <Button className="bg-blue-600 hover:bg-blue-700">新建跟进</Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* 基本信息 */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-slate-400" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-slate-500">借款人</p>
                <p className="font-medium">{caseData.borrowerName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-500">联系电话</p>
                <p className="font-mono">{caseData.borrowerPhone}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-500">贷款单号</p>
                <p className="font-mono text-sm">{caseData.loanOrderNo}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-500">外访员</p>
                <p className="font-medium">{caseData.assigneeName || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-500">公司名称</p>
                <p className="text-sm">{caseData.companyName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-500">资金来源</p>
                <p className="text-sm">{caseData.fundingSource}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-500">风险等级</p>
                <Badge className={RISK_LEVEL_CONFIG[caseData.riskLevel as keyof typeof RISK_LEVEL_CONFIG]?.color}>
                  {RISK_LEVEL_CONFIG[caseData.riskLevel as keyof typeof RISK_LEVEL_CONFIG]?.label}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-500">创建时间</p>
                <p className="text-sm">{formatDate(caseData.createdAt)}</p>
              </div>
            </div>
            <Separator className="my-6" />
            <div className="space-y-1">
              <p className="text-sm text-slate-500">联系地址</p>
              <p className="text-sm flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                {caseData.address}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 财务信息 */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-slate-400" />
              财务信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="p-4 bg-slate-50 rounded-lg text-center">
                <p className="text-sm text-slate-500">贷款金额</p>
                <p className="text-xl font-bold font-mono mt-1">{formatCurrency(caseData.loanAmount)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg text-center">
                <p className="text-sm text-slate-500">贷款余额</p>
                <p className="text-xl font-bold font-mono mt-1">{formatCurrency(caseData.loanBalance)}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <p className="text-sm text-red-500">逾期金额</p>
                <p className="text-xl font-bold font-mono text-red-600 mt-1">{formatCurrency(caseData.overdueAmount)}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg text-center">
                <p className="text-sm text-amber-500">欠款总额</p>
                <p className="text-xl font-bold font-mono text-amber-600 mt-1">{formatCurrency(caseData.debtAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 跟进记录 */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-slate-400" />
              跟进记录 ({caseData.followups?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {caseData.followups && caseData.followups.length > 0 ? (
              <div className="space-y-4">
                {caseData.followups.map((followup, index) => (
                  <div key={followup.id} className="relative pl-6 pb-4 border-l-2 border-slate-200 last:pb-0">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-white" />
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-medium">{followup.visitUser}</span>
                        <span className="text-slate-400">{formatDateTime(followup.visitTime)}</span>
                        <Badge variant="outline" className="text-xs">{followup.visitResult}</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{followup.communicationContent}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>还款意向: {followup.repaymentIntention}</span>
                        <span>下一步: {followup.nextPlan}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p>暂无跟进记录</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 风险评定 */}
        {caseData.riskAssessments && caseData.riskAssessments.length > 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-slate-400" />
                风险评定
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {caseData.riskAssessments.map((assessment) => (
                  <div key={assessment.id} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className={RISK_LEVEL_CONFIG[assessment.riskLevel as keyof typeof RISK_LEVEL_CONFIG]?.color}>
                        {RISK_LEVEL_CONFIG[assessment.riskLevel as keyof typeof RISK_LEVEL_CONFIG]?.label}
                      </Badge>
                      <span className="text-xs text-slate-500">{formatDate(assessment.createdAt)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {assessment.shopStatusTags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                      {assessment.assetTags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                      {assessment.repaymentTags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
