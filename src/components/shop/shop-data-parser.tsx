'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// 字段映射表（英文→中文）
const FIELD_MAP: Record<string, string> = {
  sellerStatus: '店铺状态',
  amazonTenure: '店铺年龄',
  marketplaceCountry: '市场',
  reportCardDataDate: '报告日期',
  year1SalesValue: '本年度销售额',
  year2SalesValue: '上年度销售额',
  year1DisbursementsValue: '本年度回款',
  year2DisbursementsValue: '上年度回款',
  latestFbaInventoryValue: '最新库存价值',
  last3MonthFbaInventoryValue: '近3个月库存价值',
  last13WeekFbaRate: '近13周FBA率',
  ttmOrders: '总订单数',
  ttmReturns: '退货数',
  ttmLateShipments: '迟发数',
  ttmCancellations: '取消数',
  ttmOrderDefects: '订单缺陷',
  ttmNegativeFeedback: '负面反馈',
  ttmSellerWarnings: '卖家警告',
  ttmFeedback: '反馈数',
  primaryProductCategory: '主要品类',
  month1SalesValue: '1月销售额',
  month2SalesValue: '2月销售额',
  month3SalesValue: '3月销售额',
  month4SalesValue: '4月销售额',
  month5SalesValue: '5月销售额',
  month6SalesValue: '6月销售额',
  month7SalesValue: '7月销售额',
  month8SalesValue: '8月销售额',
  month9SalesValue: '9月销售额',
  month10SalesValue: '10月销售额',
  month11SalesValue: '11月销售额',
  month12SalesValue: '12月销售额',
  month1DisbursementsValue: '1月回款',
  month2DisbursementsValue: '2月回款',
  month3DisbursementsValue: '3月回款',
  month4DisbursementsValue: '4月回款',
  month5DisbursementsValue: '5月回款',
  month6DisbursementsValue: '6月回款',
  month7DisbursementsValue: '7月回款',
  month8DisbursementsValue: '8月回款',
  month9DisbursementsValue: '9月回款',
  month10DisbursementsValue: '10月回款',
  month11DisbursementsValue: '11月回款',
  month12DisbursementsValue: '12月回款',
  quarter1SalesValue: 'Q1销售额',
  quarter2SalesValue: 'Q2销售额',
  quarter3SalesValue: 'Q3销售额',
  quarter4SalesValue: 'Q4销售额',
  quarter5SalesValue: 'Q5销售额',
  quarter6SalesValue: 'Q6销售额',
  quarter7SalesValue: 'Q7销售额',
  quarter8SalesValue: 'Q8销售额',
  quarter1DisbursementsValue: 'Q1回款',
  quarter2DisbursementsValue: 'Q2回款',
  quarter3DisbursementsValue: 'Q3回款',
  quarter4DisbursementsValue: 'Q4回款',
  quarter5DisbursementsValue: 'Q5回款',
  quarter6DisbursementsValue: 'Q6回款',
  quarter7DisbursementsValue: 'Q7回款',
  quarter8DisbursementsValue: 'Q8回款',
  week1SalesValue: '第1周销售额',
  week2SalesValue: '第2周销售额',
  week3SalesValue: '第3周销售额',
  week4SalesValue: '第4周销售额',
  week5SalesValue: '第5周销售额',
  week6SalesValue: '第6周销售额',
  week1DisbursementsValue: '第1周回款',
  week2DisbursementsValue: '第2周回款',
  week3DisbursementsValue: '第3周回款',
  week4DisbursementsValue: '第4周回款',
  week5DisbursementsValue: '第5周回款',
  week6DisbursementsValue: '第6周回款',
};

// 店铺状态映射
const SELLER_STATUS_MAP: Record<string, string> = {
  ACTIVE: '正常',
  NORMAL: '正常',
  BLOCKED: '已封禁',
  SUSPENDED: '已暂停',
  INACTIVE: '未激活',
  PENDING: '待审核',
  CLOSED: '已关闭',
  TERMINATED: '已终止',
  DEACTIVATED: '已停用',
  UNDER_REVIEW: '审核中',
};

// 市场映射
const MARKETPLACE_MAP: Record<string, string> = {
  US: '美国',
  CA: '加拿大',
  UK: '英国',
  DE: '德国',
  FR: '法国',
  IT: '意大利',
  ES: '西班牙',
  JP: '日本',
};

interface ShopData {
  [key: string]: any;
}

interface ShopDataParserProps {
  data: ShopData;
}

// 格式化金额
export const formatMoney = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

// 格式化天数
const formatDays = (value: string | number): string => {
  const num = typeof value === 'string' ? parseInt(value) : value;
  if (isNaN(num)) return '-';
  const years = Math.floor(num / 365);
  const days = num % 365;
  if (years > 0) {
    return `${years}年${days}天`;
  }
  return `${days}天`;
};

// 格式化百分比
const formatPercent = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return `${num.toFixed(1)}%`;
};

export const ShopDataParser: React.FC<ShopDataParserProps> = ({ data }) => {
  // 字段显示组件
  const Field = ({ label, value, highlight = false }: { 
    label: string; 
    value: string | number | React.ReactNode; 
    highlight?: boolean;
  }) => (
    <div className="space-y-1">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className={`text-sm ${highlight ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
        {value !== undefined && value !== null && value !== '' ? value : '-'}
      </dd>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 核心经营指标 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">核心经营指标</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Field label="店铺状态" value={
              <Badge className={['ACTIVE', 'NORMAL'].includes(data.sellerStatus) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {SELLER_STATUS_MAP[data.sellerStatus] || data.sellerStatus}
              </Badge>
            } highlight />
            <Field label="市场" value={MARKETPLACE_MAP[data.marketplaceCountry] || data.marketplaceCountry} />
            <Field label="店铺年龄" value={formatDays(data.amazonTenure)} />
            <Field label="报告日期" value={
              data.reportCardDataDate ? new Date(data.reportCardDataDate).toLocaleDateString('zh-CN') : '-'
            } />
            <Field label="本年度销售额" value={formatMoney(data.year1SalesValue)} highlight />
            <Field label="上年度销售额" value={formatMoney(data.year2SalesValue)} />
            <Field label="本年度回款" value={formatMoney(data.year1DisbursementsValue)} highlight />
            <Field label="上年度回款" value={formatMoney(data.year2DisbursementsValue)} />
            <Field label="最新库存价值" value={formatMoney(data.latestFbaInventoryValue)} />
            <Field label="近3个月库存价值" value={formatMoney(data.last3MonthFbaInventoryValue)} />
            <Field label="近13周FBA率" value={formatPercent(data.last13WeekFbaRate)} highlight />
            <Field label="主要品类" value={data.primaryProductCategory} />
          </dl>
        </CardContent>
      </Card>

      {/* 账户健康指标 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">账户健康指标</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Field label="总订单数" value={data.ttmOrders || '0'} highlight />
            <Field label="退货数" value={
              <span className={parseInt(data.ttmReturns || '0') > 100 ? 'text-red-600 font-semibold' : ''}>
                {data.ttmReturns || '0'}
              </span>
            } />
            <Field label="迟发数" value={
              <span className={parseInt(data.ttmLateShipments || '0') > 0 ? 'text-orange-600 font-semibold' : ''}>
                {data.ttmLateShipments || '0'}
              </span>
            } />
            <Field label="取消数" value={
              <span className={parseInt(data.ttmCancellations || '0') > 0 ? 'text-orange-600 font-semibold' : ''}>
                {data.ttmCancellations || '0'}
              </span>
            } />
            <Field label="订单缺陷" value={
              <span className={parseInt(data.ttmOrderDefects || '0') > 0 ? 'text-red-600 font-semibold' : ''}>
                {data.ttmOrderDefects || '0'}
              </span>
            } />
            <Field label="负面反馈" value={
              <span className={parseInt(data.ttmNegativeFeedback || '0') > 0 ? 'text-red-600 font-semibold' : ''}>
                {data.ttmNegativeFeedback || '0'}
              </span>
            } />
            <Field label="卖家警告" value={
              <span className={parseInt(data.ttmSellerWarnings || '0') > 0 ? 'text-red-600 font-semibold' : ''}>
                {data.ttmSellerWarnings || '0'}
              </span>
            } />
            <Field label="反馈数" value={data.ttmFeedback || '0'} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
};
