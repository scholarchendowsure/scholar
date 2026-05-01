'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Edit, Eye, ChevronDown } from 'lucide-react';
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
const Field = ({ label, value, highlight = false }: { label: string; value: string | number | React.ReactNode; highlight?: boolean }) => (
  <div className="space-y-1">
    <dt className="text-sm font-medium text-slate-500">{label}</dt>
    <dd className={`text-sm ${highlight ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
      {value !== undefined && value !== null && value !== '' ? value : '-'}
    </dd>
  </div>
);

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('core');

  useEffect(() => {
    if (params.id) {
      fetchCase(params.id as string);
    }
  }, [params.id]);

  const fetchCase = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cases/${id}`);
      const json: { success: boolean; data: Case } = await res.json();

      if (json.success) {
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

  const tabs = [
    { id: 'core', label: '核心信息', color: 'bg-blue-600 text-white' },
    { id: 'finance', label: '金额信息', color: 'bg-amber-500 text-white' },
    { id: 'timeline', label: '贷款记录', color: 'bg-emerald-600 text-white' },
    { id: 'borrower', label: '信息详情', color: 'bg-slate-600 text-white' },
    { id: 'ownership', label: '案件归属', color: 'bg-purple-600 text-white' },
  ];

  const renderTabContent = () => {
    if (!caseData) return null;

    switch (activeTab) {
      case 'core':
        return (
          <div className="p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Field label="用户ID" value={caseData.userId} highlight />
              <Field label="借款人姓名" value={caseData.borrowerName} highlight />
              <Field label="币种" value={caseData.currency} />
              <Field label="在贷金额" value={formatMoney(caseData.outstandingBalance)} highlight />
              <Field label="逾期金额" value={
                <span className={caseData.overdueAmount > 0 ? 'text-red-600 font-semibold' : ''}>
                  {formatMoney(caseData.overdueAmount)}
                </span>
              } highlight />
              <Field label="借款人手机号" value={caseData.borrowerPhone} highlight />
              <Field label="资金方" value={caseData.funder} />
              <Field label="支付公司" value={caseData.paymentCompany} />
              <Field label="逾期天数" value={
                <span className={caseData.overdueDays > 90 ? 'text-red-600 font-semibold' : caseData.overdueDays > 0 ? 'text-orange-600' : ''}>
                  {caseData.overdueDays}天
                </span>
              } highlight />
              <Field label="产品名称" value={caseData.productName} />
              <Field label="所属销售" value={caseData.assignedSales} highlight />
              <Field label="所属贷后" value={caseData.assignedPostLoan} highlight />
              <Field label="风险等级" value={caseData.riskLevel} highlight />
            </dl>
          </div>
        );
      
      case 'finance':
        return (
          <div className="p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Field label="币种" value={caseData.currency} />
              <Field label="贷款金额" value={formatMoney(caseData.loanAmount)} highlight />
              <Field label="总贷款金额" value={formatMoney(caseData.totalLoanAmount)} highlight />
              <Field label="总在贷余额" value={formatMoney(caseData.totalOutstandingBalance)} highlight />
              <Field label="已还款总额" value={formatMoney(caseData.totalRepaidAmount)} />
              <Field label="在贷余额" value={formatMoney(caseData.outstandingBalance)} highlight />
              <Field label="逾期金额" value={
                <span className={caseData.overdueAmount > 0 ? 'text-red-600 font-semibold' : ''}>
                  {formatMoney(caseData.overdueAmount)}
                </span>
              } highlight />
              <Field label="逾期本金" value={formatMoney(caseData.overduePrincipal)} />
              <Field label="逾期利息" value={formatMoney(caseData.overdueInterest)} />
              <Field label="已还金额" value={formatMoney(caseData.repaidAmount)} />
              <Field label="已还本金" value={formatMoney(caseData.repaidPrincipal)} />
              <Field label="已还利息" value={formatMoney(caseData.repaidInterest)} />
              <Field label="代偿总额" value={formatMoney(caseData.compensationAmount)} />
            </dl>
          </div>
        );
      
      case 'timeline':
        return (
          <div className="p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Field label="贷款期限" value={`${caseData.loanTerm} ${caseData.loanTermUnit}`} />
              <Field label="贷款日期" value={caseData.loanDate} />
              <Field label="到期日" value={caseData.dueDate} />
              <Field label="逾期天数" value={
                <span className={caseData.overdueDays > 90 ? 'text-red-600 font-semibold' : caseData.overdueDays > 0 ? 'text-orange-600' : ''}>
                  {caseData.overdueDays}天
                </span>
              } highlight />
              <Field label="逾期开始时间" value={caseData.overdueStartTime} />
              <Field label="首次逾期时间" value={caseData.firstOverdueTime} />
              <Field label="代偿日期" value={caseData.compensationDate} />
            </dl>
          </div>
        );
      
      case 'borrower':
        return (
          <div className="p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Field label="公司名称" value={caseData.companyName} />
              <Field label="公司地址" value={caseData.companyAddress} />
              <Field label="家庭地址" value={caseData.homeAddress} />
              <Field label="户籍地址" value={caseData.householdAddress} />
              <Field label="借款人手机号" value={caseData.borrowerPhone} highlight />
              <Field label="注册手机号" value={caseData.registeredPhone} />
              <Field label="联系方式" value={caseData.contactInfo} />
            </dl>
          </div>
        );
      
      case 'ownership':
        return (
          <div className="p-6">
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field label="所属销售" value={caseData.assignedSales} highlight />
              <Field label="所属风控" value={caseData.assignedRiskControl} highlight />
              <Field label="所属贷后" value={caseData.assignedPostLoan} highlight />
            </dl>
            <Separator className="my-6" />
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field label="创建时间" value={new Date(caseData.createdAt).toLocaleString('zh-CN')} />
              <Field label="更新时间" value={new Date(caseData.updatedAt).toLocaleString('zh-CN')} />
            </dl>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400" />
          <p className="mt-2 text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">案件不存在</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            返回
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* 头部 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">案件详情</h1>
              <p className="text-sm text-slate-500 mt-1">
                贷款单号：{caseData.loanNo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <Eye className="w-4 h-4" />
              查看历史
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Edit className="w-4 h-4" />
              编辑
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* 顶部状态标签 */}
        <div className="flex items-center gap-4 mb-6">
          <Badge className={STATUS_CONFIG[caseData.status as keyof typeof STATUS_CONFIG]?.color || 'bg-gray-100'}>
            {STATUS_CONFIG[caseData.status as keyof typeof STATUS_CONFIG]?.label || caseData.status}
          </Badge>
          <Badge className={RISK_CONFIG[caseData.riskLevel as keyof typeof RISK_CONFIG]?.color || 'bg-gray-100'}>
            {RISK_CONFIG[caseData.riskLevel as keyof typeof RISK_CONFIG]?.label || caseData.riskLevel}
          </Badge>
          {caseData.isLocked && (
            <Badge variant="destructive">已锁定</Badge>
          )}
          {caseData.isExtended && (
            <Badge className="bg-purple-100 text-purple-800">已展期</Badge>
          )}
        </div>

        {/* 折叠标签卡片 */}
        <Card>
          {/* 标签栏 */}
          <div className="flex flex-wrap border-b border-slate-200 bg-slate-50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? `${tab.color} text-white`
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <ChevronDown className="w-4 h-4 inline ml-1" />
                )}
              </button>
            ))}
          </div>

          {/* 内容区域 */}
          <div className="bg-white border-t border-slate-200">
            {renderTabContent()}
          </div>
        </Card>
      </div>
    </div>
  );
}
