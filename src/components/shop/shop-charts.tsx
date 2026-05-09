'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface ShopData {
  [key: string]: any;
}

interface ShopChartsProps {
  data: ShopData;
}

// 格式化金额
const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// 获取月度销售数据
const getMonthlySalesData = (data: ShopData) => {
  return [
    { month: '1月', 销售额: parseFloat(data.month1SalesValue || '0'), 回款: parseFloat(data.month1DisbursementsValue || '0') },
    { month: '2月', 销售额: parseFloat(data.month2SalesValue || '0'), 回款: parseFloat(data.month2DisbursementsValue || '0') },
    { month: '3月', 销售额: parseFloat(data.month3SalesValue || '0'), 回款: parseFloat(data.month3DisbursementsValue || '0') },
    { month: '4月', 销售额: parseFloat(data.month4SalesValue || '0'), 回款: parseFloat(data.month4DisbursementsValue || '0') },
    { month: '5月', 销售额: parseFloat(data.month5SalesValue || '0'), 回款: parseFloat(data.month5DisbursementsValue || '0') },
    { month: '6月', 销售额: parseFloat(data.month6SalesValue || '0'), 回款: parseFloat(data.month6DisbursementsValue || '0') },
    { month: '7月', 销售额: parseFloat(data.month7SalesValue || '0'), 回款: parseFloat(data.month7DisbursementsValue || '0') },
    { month: '8月', 销售额: parseFloat(data.month8SalesValue || '0'), 回款: parseFloat(data.month8DisbursementsValue || '0') },
    { month: '9月', 销售额: parseFloat(data.month9SalesValue || '0'), 回款: parseFloat(data.month9DisbursementsValue || '0') },
    { month: '10月', 销售额: parseFloat(data.month10SalesValue || '0'), 回款: parseFloat(data.month10DisbursementsValue || '0') },
    { month: '11月', 销售额: parseFloat(data.month11SalesValue || '0'), 回款: parseFloat(data.month11DisbursementsValue || '0') },
    { month: '12月', 销售额: parseFloat(data.month12SalesValue || '0'), 回款: parseFloat(data.month12DisbursementsValue || '0') },
  ];
};

// 自定义Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-slate-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatMoney(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const ShopCharts: React.FC<ShopChartsProps> = ({ data }) => {
  const chartData = getMonthlySalesData(data);

  return (
    <div className="space-y-6">
      {/* 月度销售与回款图表（融合成一个卡片） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">月度销售与回款趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：数据表格 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-slate-500">月份</th>
                    <th className="text-right py-2 px-3 text-slate-500">销售额</th>
                    <th className="text-right py-2 px-3 text-slate-500">回款</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((item) => (
                    <tr key={item.month} className="border-b">
                      <td className="py-2 px-3">{item.month}</td>
                      <td className="py-2 px-3 text-right font-mono text-blue-600">{formatMoney(item.销售额)}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-600">{formatMoney(item.回款)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* 右侧：图表 */}
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(value) => `$${value.toLocaleString()}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="销售额" fill="#2563eb" name="销售额" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="回款" fill="#10b981" name="回款" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
