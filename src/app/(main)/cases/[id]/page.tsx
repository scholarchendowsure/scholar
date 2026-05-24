'use client';

// 案件详情页 - 二分法调试 - 简化版
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Edit, Eye, ChevronDown, ChevronLeft, ChevronRight, Plus, Upload, Bell, Download, Store } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FOLLOWUP_TYPE_OPTIONS, CONTACT_OPTIONS, FOLLOWUP_RESULT_OPTIONS, FollowUp, CaseFile, isImageFile, isDocumentFile, CaseHistory } from '@/types/case';
import { Button } from '@/components/ui/button';
import LegalLitigationTab from '@/components/legal-litigation-tab';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Case } from '@/types/case';
import { toast } from 'sonner';

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('legal');

  // 获取案件数据
  const fetchCase = async (caseId: string) => {
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      if (!res.ok) throw new Error('案件不存在');
      const data = await res.json();
      console.log('案件数据:', data);
      console.log('案件ID:', data.id);
      setCaseData(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载案件失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载案件数据
  useEffect(() => {
    if (params.id) {
      fetchCase(params.id as string);
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
    <div className="min-h-screen bg-slate-50">
      {/* 测试用最简单的文件上传 - 页面最顶部 */}
      <div className="p-4 border-b-4 border-red-500 bg-red-50">
        <h3 className="font-bold text-red-700 mb-2">测试文件上传（页面最顶部）</h3>
        <input 
          type="file" 
          onChange={(e) => {
            console.log('页面最顶部 - 文件选择成功:', e.target.files?.[0]?.name);
            alert('页面最顶部 - 文件选择成功: ' + e.target.files?.[0]?.name);
          }}
          className="block w-full text-sm text-slate-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-red-50 file:text-red-700
            hover:file:bg-red-100"
        />
      </div>

      {/* 头部 */}
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
                <h1 className="text-2xl font-bold text-slate-900">案件详情</h1>
                <p className="text-sm text-slate-500 mt-1">
                  贷款单号：{caseData.loanNo}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Card>
          {/* 标签栏 */}
          <div className="flex flex-wrap border-b border-slate-200 bg-slate-50">
            <button
              key="legal"
              onClick={() => setActiveTab('legal')}
              className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                activeTab === 'legal'
                  ? 'bg-red-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              法律诉讼
            </button>
          </div>

          {/* 内容区域 */}
          <div className="bg-white border-t border-slate-200">
            <div className="p-6">
              {/* 测试用最简单的文件上传 */}
              <div className="mb-6 p-4 border-2 border-dashed border-blue-500 bg-blue-50 rounded-lg">
                <h3 className="font-bold text-blue-700 mb-2">测试文件上传（简化版 - 仅法律诉讼）</h3>
                <input 
                  type="file" 
                  onChange={(e) => {
                    console.log('简化版 - 文件选择成功:', e.target.files?.[0]?.name);
                    alert('简化版 - 文件选择成功: ' + e.target.files?.[0]?.name);
                  }}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>
              <LegalLitigationTab caseId={caseData?.id || ''} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}