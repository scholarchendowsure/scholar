'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Edit, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Case } from '@/types/case';
import { toast } from 'sonner';
import LegalLitigationTab from '@/components/legal-litigation-tab';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('legal');

  useEffect(() => {
    if (params.id) {
      fetchCase(params.id as string);
    }
  }, [params.id]);

  const fetchCase = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cases/${id}?_t=${Date.now()}&includeFiles=true`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
        },
      });
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

  const renderTabContent = () => {
    if (!caseData) return null;

    switch (activeTab) {
      case 'legal':
        return (
          <LegalLitigationTab caseId={caseData.id} />
        );
      default:
        return (
          <div className="p-6">
            <div className="text-center text-slate-500 py-12">
              其他标签页内容已简化，仅保留法律诉讼标签页进行测试
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-slate-500">案件不存在</p>
        <Button onClick={() => router.back()}>返回</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部操作栏 */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">案件详情</h1>
                <p className="text-slate-500">贷款单号: {caseData.loanNo}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => fetchCase(caseData.id)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 标签页导航 */}
        <div className="bg-white rounded-lg border border-slate-200 mb-6">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('legal')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'legal'
                  ? 'bg-red-600 text-white border-b-2 border-transparent'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              法律诉讼
            </button>
          </div>
        </div>

        {/* 标签页内容 */}
        <div className="bg-white rounded-lg border border-slate-200">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}