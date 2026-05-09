'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface CaseEvaluationFormProps {
  caseId: string;
}

// 默认空数据
const defaultData = {
  // (一) 企业信息
  legalPerson: '',
  receptionist: '',
  receptionistPosition: '',
  receptionistId: '',
  lastRepaymentDate: '',
  lastRepaymentAmount: '',
  lastContactTime: '',
  repaymentPlan: '',
  repaymentPlanAmount: '',
  storeValue: '',
  lastStoreValue: '',

  // (二) 访谈记录
  interviewIdentity: '',
  interviewReason: '',
  interviewStoreValue: '',
  interviewTeamSize: '',
  interviewCashFlow: '',
  interviewFinancing: '',
  interviewRisk: '',
  interviewMeasures: '',
  interviewFollowUp: '',
  interviewEvaluation: '',

  // (三) 经营情况
  companyYears: '',
  employeeCount: '',
  mainCategory: '',
  platform: '',
  monthlySales: '',
  monthlyProfit: '',
  inventoryValue: '',
  accountReceivable: '',

  // (四) 融资情况
  financingChannel: '',
  financingType: '',
  creditLimit: '',
  creditUsed: '',
  creditRemaining: '',
  otherFinancing: '',
  otherFinancingAmount: '',
  otherFinancingDate: '',
  otherFinancingRepayment: '',

  // (五) 店铺数据
  storeMainCategory: '',
  storeMonthlySales: '',
  storeMonthlyRepayment: '',
  storeSalesTrend: '',
  storeReturnRate: '',
  storeReviewScore: '',
  storeViolationCount: '',
  storeComplaintCount: '',

  // (六) 承诺条款
  commitmentSignature: '',
  commitmentDate: '',

  // (七) 评估定级
  evaluationScore: '',
  evaluationLevel: '',

  // 跟进记录
  followUpRecords: [] as Array<{
    sequence: string;
    followUpPerson: string;
    followUpDate: string;
    repaymentAmount: string;
    followUpMethod: string;
    repaymentMethod: string;
    followUpResult: string;
    nextFollowUpDate: string;
  }>,
};

type DataType = typeof defaultData;

export default function CaseEvaluationForm({ caseId }: CaseEvaluationFormProps) {
  const [data, setData] = useState<DataType>(defaultData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 加载已保存的数据
  useEffect(() => {
    if (!caseId) return;

    const loadSavedData = async () => {
      try {
        const response = await fetch(`/api/case-evaluation?caseId=${caseId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setData(prev => ({ ...prev, ...result.data }));
          }
        }
      } catch (error) {
        console.error('加载评估表数据失败:', error);
      }
    };

    loadSavedData();
  }, [caseId]);

  // 保存数据
  const handleSave = useCallback(async () => {
    if (!caseId) {
      toast.error('案件ID不存在');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/case-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, data }),
      });

      if (response.ok) {
        toast.success('评估表保存成功');
      } else {
        const error = await response.json();
        toast.error(error.message || '保存失败');
      }
    } catch (error) {
      console.error('保存评估表失败:', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  }, [caseId, data]);

  // 更新字段
  const updateField = useCallback((field: keyof DataType, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <div className="space-y-6">
      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              保存评估表
            </>
          )}
        </Button>
      </div>

      {/* (一) 企业信息 */}
      <Card>
        <CardHeader className="bg-slate-50">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            （一）企业信息
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>法人/实控人</Label>
              <Input
                value={data.legalPerson}
                onChange={e => updateField('legalPerson', e.target.value)}
                placeholder="请输入法人/实控人姓名"
              />
            </div>
            <div className="space-y-2">
              <Label>接待人</Label>
              <Input
                value={data.receptionist}
                onChange={e => updateField('receptionist', e.target.value)}
                placeholder="请输入接待人姓名"
              />
            </div>
            <div className="space-y-2">
              <Label>接待人职位</Label>
              <Input
                value={data.receptionistPosition}
                onChange={e => updateField('receptionistPosition', e.target.value)}
                placeholder="请输入职位"
              />
            </div>
            <div className="space-y-2">
              <Label>接待人身份证号</Label>
              <Input
                value={data.receptionistId}
                onChange={e => updateField('receptionistId', e.target.value)}
                placeholder="请输入身份证号"
              />
            </div>
            <div className="space-y-2">
              <Label>最近还款日</Label>
              <Input
                type="date"
                value={data.lastRepaymentDate}
                onChange={e => updateField('lastRepaymentDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>最近还款金额（元）</Label>
              <Input
                type="number"
                value={data.lastRepaymentAmount}
                onChange={e => updateField('lastRepaymentAmount', e.target.value)}
                placeholder="请输入金额"
              />
            </div>
            <div className="space-y-2">
              <Label>最近联系时间</Label>
              <Input
                type="datetime-local"
                value={data.lastContactTime}
                onChange={e => updateField('lastContactTime', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>还款计划</Label>
              <Input
                value={data.repaymentPlan}
                onChange={e => updateField('repaymentPlan', e.target.value)}
                placeholder="请输入还款计划"
              />
            </div>
            <div className="space-y-2">
              <Label>还款计划金额（元）</Label>
              <Input
                type="number"
                value={data.repaymentPlanAmount}
                onChange={e => updateField('repaymentPlanAmount', e.target.value)}
                placeholder="请输入金额"
              />
            </div>
            <div className="space-y-2">
              <Label>店铺估值（元）</Label>
              <Input
                type="number"
                value={data.storeValue}
                onChange={e => updateField('storeValue', e.target.value)}
                placeholder="请输入估值"
              />
            </div>
            <div className="space-y-2">
              <Label>上次店铺估值（元）</Label>
              <Input
                type="number"
                value={data.lastStoreValue}
                onChange={e => updateField('lastStoreValue', e.target.value)}
                placeholder="请输入上次估值"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* (二) 访谈记录 */}
      <Card>
        <CardHeader className="bg-slate-50">
          <CardTitle className="text-lg">（二）访谈记录</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>表明身份</Label>
              <Textarea
                value={data.interviewIdentity}
                onChange={e => updateField('interviewIdentity', e.target.value)}
                placeholder="请输入表明身份情况"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>了解逾期原因</Label>
              <Textarea
                value={data.interviewReason}
                onChange={e => updateField('interviewReason', e.target.value)}
                placeholder="请输入了解到的逾期原因"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>店铺价值评估</Label>
              <Textarea
                value={data.interviewStoreValue}
                onChange={e => updateField('interviewStoreValue', e.target.value)}
                placeholder="请输入店铺价值评估"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>团队规模</Label>
              <Input
                value={data.interviewTeamSize}
                onChange={e => updateField('interviewTeamSize', e.target.value)}
                placeholder="请输入团队规模"
              />
            </div>
            <div className="space-y-2">
              <Label>现金流情况</Label>
              <Textarea
                value={data.interviewCashFlow}
                onChange={e => updateField('interviewCashFlow', e.target.value)}
                placeholder="请输入现金流情况"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>融资情况</Label>
              <Textarea
                value={data.interviewFinancing}
                onChange={e => updateField('interviewFinancing', e.target.value)}
                placeholder="请输入融资情况"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>风险点识别</Label>
              <Textarea
                value={data.interviewRisk}
                onChange={e => updateField('interviewRisk', e.target.value)}
                placeholder="请输入风险点"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>改善措施</Label>
              <Textarea
                value={data.interviewMeasures}
                onChange={e => updateField('interviewMeasures', e.target.value)}
                placeholder="请输入改善措施"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>后续跟进计划</Label>
              <Textarea
                value={data.interviewFollowUp}
                onChange={e => updateField('interviewFollowUp', e.target.value)}
                placeholder="请输入后续跟进计划"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>访谈评价</Label>
              <Textarea
                value={data.interviewEvaluation}
                onChange={e => updateField('interviewEvaluation', e.target.value)}
                placeholder="请输入访谈评价"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* (三) 经营情况 */}
      <Card>
        <CardHeader className="bg-slate-50">
          <CardTitle className="text-lg">（三）经营情况</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>公司经营年限</Label>
              <Input
                value={data.companyYears}
                onChange={e => updateField('companyYears', e.target.value)}
                placeholder="请输入年限"
              />
            </div>
            <div className="space-y-2">
              <Label>员工人数</Label>
              <Input
                type="number"
                value={data.employeeCount}
                onChange={e => updateField('employeeCount', e.target.value)}
                placeholder="请输入人数"
              />
            </div>
            <div className="space-y-2">
              <Label>主营品类</Label>
              <Input
                value={data.mainCategory}
                onChange={e => updateField('mainCategory', e.target.value)}
                placeholder="请输入主营品类"
              />
            </div>
            <div className="space-y-2">
              <Label>经营平台</Label>
              <Input
                value={data.platform}
                onChange={e => updateField('platform', e.target.value)}
                placeholder="请输入平台"
              />
            </div>
            <div className="space-y-2">
              <Label>月均销售额（元）</Label>
              <Input
                type="number"
                value={data.monthlySales}
                onChange={e => updateField('monthlySales', e.target.value)}
                placeholder="请输入金额"
              />
            </div>
            <div className="space-y-2">
              <Label>月均利润（元）</Label>
              <Input
                type="number"
                value={data.monthlyProfit}
                onChange={e => updateField('monthlyProfit', e.target.value)}
                placeholder="请输入金额"
              />
            </div>
            <div className="space-y-2">
              <Label>库存价值（元）</Label>
              <Input
                type="number"
                value={data.inventoryValue}
                onChange={e => updateField('inventoryValue', e.target.value)}
                placeholder="请输入金额"
              />
            </div>
            <div className="space-y-2">
              <Label>应收账款（元）</Label>
              <Input
                type="number"
                value={data.accountReceivable}
                onChange={e => updateField('accountReceivable', e.target.value)}
                placeholder="请输入金额"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* (四) 融资情况 */}
      <Card>
        <CardHeader className="bg-slate-50">
          <CardTitle className="text-lg">（四）融资情况</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>融资渠道</Label>
              <Input
                value={data.financingChannel}
                onChange={e => updateField('financingChannel', e.target.value)}
                placeholder="请输入渠道"
              />
            </div>
            <div className="space-y-2">
              <Label>融资类型</Label>
              <Input
                value={data.financingType}
                onChange={e => updateField('financingType', e.target.value)}
                placeholder="请输入类型"
              />
            </div>
            <div className="space-y-2">
              <Label>授信额度（元）</Label>
              <Input
                type="number"
                value={data.creditLimit}
                onChange={e => updateField('creditLimit', e.target.value)}
                placeholder="请输入额度"
              />
            </div>
            <div className="space-y-2">
              <Label>已使用额度（元）</Label>
              <Input
                type="number"
                value={data.creditUsed}
                onChange={e => updateField('creditUsed', e.target.value)}
                placeholder="请输入已使用额度"
              />
            </div>
            <div className="space-y-2">
              <Label>剩余额度（元）</Label>
              <Input
                type="number"
                value={data.creditRemaining}
                onChange={e => updateField('creditRemaining', e.target.value)}
                placeholder="请输入剩余额度"
              />
            </div>
            <div className="space-y-2">
              <Label>其他融资渠道</Label>
              <Input
                value={data.otherFinancing}
                onChange={e => updateField('otherFinancing', e.target.value)}
                placeholder="请输入渠道"
              />
            </div>
            <div className="space-y-2">
              <Label>其他融资金额（元）</Label>
              <Input
                type="number"
                value={data.otherFinancingAmount}
                onChange={e => updateField('otherFinancingAmount', e.target.value)}
                placeholder="请输入金额"
              />
            </div>
            <div className="space-y-2">
              <Label>其他融资日期</Label>
              <Input
                type="date"
                value={data.otherFinancingDate}
                onChange={e => updateField('otherFinancingDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>其他融资还款情况</Label>
              <Textarea
                value={data.otherFinancingRepayment}
                onChange={e => updateField('otherFinancingRepayment', e.target.value)}
                placeholder="请输入还款情况"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* (五) 店铺数据 */}
      <Card>
        <CardHeader className="bg-slate-50">
          <CardTitle className="text-lg">（五）店铺数据</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>主营品类</Label>
              <Input
                value={data.storeMainCategory}
                onChange={e => updateField('storeMainCategory', e.target.value)}
                placeholder="请输入品类"
              />
            </div>
            <div className="space-y-2">
              <Label>月均销售额（元）</Label>
              <Input
                type="number"
                value={data.storeMonthlySales}
                onChange={e => updateField('storeMonthlySales', e.target.value)}
                placeholder="请输入金额"
              />
            </div>
            <div className="space-y-2">
              <Label>月均回款额（元）</Label>
              <Input
                type="number"
                value={data.storeMonthlyRepayment}
                onChange={e => updateField('storeMonthlyRepayment', e.target.value)}
                placeholder="请输入金额"
              />
            </div>
            <div className="space-y-2">
              <Label>销售趋势</Label>
              <Input
                value={data.storeSalesTrend}
                onChange={e => updateField('storeSalesTrend', e.target.value)}
                placeholder="上升/下降/平稳"
              />
            </div>
            <div className="space-y-2">
              <Label>退货率（%）</Label>
              <Input
                type="number"
                value={data.storeReturnRate}
                onChange={e => updateField('storeReturnRate', e.target.value)}
                placeholder="请输入百分比"
              />
            </div>
            <div className="space-y-2">
              <Label>评分</Label>
              <Input
                value={data.storeReviewScore}
                onChange={e => updateField('storeReviewScore', e.target.value)}
                placeholder="请输入评分"
              />
            </div>
            <div className="space-y-2">
              <Label>违规次数</Label>
              <Input
                type="number"
                value={data.storeViolationCount}
                onChange={e => updateField('storeViolationCount', e.target.value)}
                placeholder="请输入次数"
              />
            </div>
            <div className="space-y-2">
              <Label>投诉次数</Label>
              <Input
                type="number"
                value={data.storeComplaintCount}
                onChange={e => updateField('storeComplaintCount', e.target.value)}
                placeholder="请输入次数"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* (六) 承诺条款 */}
      <Card>
        <CardHeader className="bg-slate-50">
          <CardTitle className="text-lg">（六）企业资产评估资料真实性承诺及确认条款</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-yellow-50 p-4 rounded-lg mb-4 text-sm text-yellow-800">
            <p className="mb-2">本人/本公司郑重承诺：所提供的所有资料和信息真实、准确、完整，不存在任何虚假陈述或重大遗漏。</p>
            <p className="mb-2">本人/本公司确认：理解并同意贷款机构基于上述资料进行评估，并愿意承担因提供虚假资料而产生的一切法律责任。</p>
            <p>本人/本公司确认：已仔细阅读并理解本评估表的所有条款，无异议。</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>承诺人签名</Label>
              <Input
                value={data.commitmentSignature}
                onChange={e => updateField('commitmentSignature', e.target.value)}
                placeholder="请输入签名"
              />
            </div>
            <div className="space-y-2">
              <Label>承诺日期</Label>
              <Input
                type="date"
                value={data.commitmentDate}
                onChange={e => updateField('commitmentDate', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* (七) 评估定级 */}
      <Card>
        <CardHeader className="bg-slate-50">
          <CardTitle className="text-lg">（七）企业评估定级报告</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>评估得分</Label>
              <Input
                type="number"
                value={data.evaluationScore}
                onChange={e => updateField('evaluationScore', e.target.value)}
                placeholder="请输入得分"
              />
            </div>
            <div className="space-y-2">
              <Label>评估等级</Label>
              <Input
                value={data.evaluationLevel}
                onChange={e => updateField('evaluationLevel', e.target.value)}
                placeholder="A/B/C/D"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
