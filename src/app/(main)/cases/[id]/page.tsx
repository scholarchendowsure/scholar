'use client';

// 案件详情页 - 最简单测试版本
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import LegalLitigationTab from '@/components/legal-litigation-tab';

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('legal');
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const tabs = [
    { id: 'legal', label: '法律诉讼', color: 'bg-red-600 text-white' },
  ];

  const renderTabContent = () => {
    if (!caseData) return null;

    switch (activeTab) {
      case 'legal':
        return (
          <div className="p-6">
            {/* 测试用最简单的文件上传 */}
            <div className="mb-6 p-4 border-2 border-dashed border-orange-500 bg-orange-50 rounded-lg">
              <h3 className="font-bold text-orange-700 mb-2">测试文件上传（真实页面简化版）</h3>
              <input 
                type="file" 
                onChange={(e) => {
                  console.log('真实页面简化版 - 文件选择成功:', e.target.files?.[0]?.name);
                  alert('真实页面简化版 - 文件选择成功: ' + e.target.files?.[0]?.name);
                }}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-orange-50 file:text-orange-700
                  hover:file:bg-orange-100"
              />
            </div>
            <LegalLitigationTab caseId={caseData?.id || ''} />
          </div>
        );
      
      default:
        return null;
    }
  };

  useEffect(() => {
    if (params.id) {
      // 模拟加载
      setTimeout(() => {
        setCaseData({
          id: params.id as string,
          loanNo: 'DSL17421023520618258',
        });
        setLoading(false);
      }, 500);
    }
  }, [params.id]);

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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 头部 - 可折叠 */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 py-4">
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
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900">案件详情</h1>
                  {/* 折叠按钮 - 放在标题旁边 */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setHeaderCollapsed(!headerCollapsed)}
                    className="ml-2"
                  >
                    <ChevronDown className={`w-5 h-5 transition-transform ${headerCollapsed ? '' : 'rotate-180'}`} />
                  </Button>
                </div>
                {/* 可折叠的贷款单号 */}
                {!headerCollapsed && (
                  <p className="text-sm text-slate-500 mt-1">
                    贷款单号：{caseData.loanNo}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
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