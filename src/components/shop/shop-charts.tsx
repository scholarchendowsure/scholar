'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface ChartDataPoint {
  month: string;
  value: number;
}

interface ShopChartsProps {
  data: { [key: string]: any };
}

// 格式化金额
const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// 自定义Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-slate-900">{label}</p>
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
  // 从 data 中提取销售数据
  const getSalesData = (): ChartDataPoint[] => {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    return months.map((month, index) => {
      const key = `month${index + 1}SalesValue`;
      const value = typeof data[key] === 'string' ? parseFloat(data[key]) : data[key];
      return {
        month,
        value: isNaN(value) ? 0 : value
      };
    });
  };

  // 从 data 中提取回款数据
  const getDisbursementsData = (): ChartDataPoint[] => {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    return months.map((month, index) => {
      const key = `month${index + 1}DisbursementsValue`;
      const value = typeof data[key] === 'string' ? parseFloat(data[key]) : data[key];
      return {
        month,
        value: isNaN(value) ? 0 : value
      };
    });
  };

  const salesData = getSalesData();
  const disbursementsData = getDisbursementsData();
  
  // 合并销售和回款数据
  const combinedData = salesData.map((item, index) => ({
    month: item.month,
    销售额: item.value,
    回款: disbursementsData[index]?.value || 0,
  }));

  return (
    <div className="space-y-6">
      {/* 月度销售趋势图 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">月度销售与回款趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="month" 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line 
                  type="monotone" 
                  dataKey="销售额" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="回款" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 月度销售柱状图 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">月度销售额对比</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="month" 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]}
                  name="销售额"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 月度回款柱状图 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">月度回款对比</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={disbursementsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="month" 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]}
                  name="回款"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
