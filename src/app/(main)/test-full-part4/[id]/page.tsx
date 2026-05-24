'use client';

// 案件详情页 - 二分法调试 - 完整版后半部分2
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

const NAVIGATION_KEY = 'cases-navigation-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Case } from '@/types/case';
import { toast } from 'sonner';
import LegalLitigationTab from '@/components/legal-litigation-tab';

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
const Field = ({ label, value, highlight = false, action }: { 
  label: string; 
  value: string | number | React.ReactNode; 
  highlight?: boolean;
  action?: React.ReactNode;
}) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      {action}
    </div>
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
  const [activeTab, setActiveTab] = useState<string>('legal');
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [relatedLoans, setRelatedLoans] = useState<Case[]>([]);
  const [relatedLoansLoading, setRelatedLoansLoading] = useState(false);
  const [showFollowupDialog, setShowFollowupDialog] = useState(false);
  const [newFollowup, setNewFollowup] = useState<Partial<FollowUp>>({
    follower: '',
    followType: 'online',
    contact: 'legal_representative',
    followResult: 'normal_repayment',
    followRecord: '',
    fileInfo: [],
  });

  // 单独存上传的CaseFile[]
  const [uploadedCaseFiles, setUploadedCaseFiles] = useState<CaseFile[]>([]);

  // 导航状态
  const [navigationState, setNavigationState] = useState<{
    caseIds: string[];
    currentIndex: number;
  } | null>(null);

  const tabs = [
    { id: 'legal', label: '法律诉讼', color: 'bg-red-600 text-white' },
  ];

  // 文件上传处理
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const files = Array.from(e.target.files);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result as string;
        const fileName = file.name;
        const isImage = isImageFile(fileName);
        
        setUploadedCaseFiles(prev => [...prev, {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: fileName,
          type: isImage ? 'image' : isDocumentFile(fileName) ? 'document' : 'other',
          uploadTime: new Date().toISOString(),
          uploadBy: '未登记人',
          data: base64Data
        }]);
      };
      reader.onerror = () => {
        toast.error('文件读取失败');
      };
      reader.readAsDataURL(file);
    }
  };

  // 当前案件在导航列表中的位置
  const { hasPrev, hasNext, prevCaseId, nextCaseId } = useMemo(() => {
    if (!navigationState) {
      return { hasPrev: false, hasNext: false, prevCaseId: null, nextCaseId: null };
    }
    const { caseIds, currentIndex } = navigationState;
    return {
      hasPrev: currentIndex > 0,
      hasNext: currentIndex < caseIds.length - 1,
      prevCaseId: caseIds[currentIndex - 1] || null,
      nextCaseId: caseIds[currentIndex + 1] || null,
    };
  }, [navigationState]);

  // 导航到上一个案件
  const goToPrev = () => {
    if (prevCaseId && navigationState) {
      const newState = {
        ...navigationState,
        currentIndex: navigationState.currentIndex - 1,
      };
      setNavigationState(newState);
      router.push(`/cases/${prevCaseId}`);
    }
  };

  // 导航到下一个案件
  const goToNext = () => {
    if (nextCaseId && navigationState) {
      const newState = {
        ...navigationState,
        currentIndex: navigationState.currentIndex + 1,
      };
      setNavigationState(newState);
      router.push(`/cases/${nextCaseId}`);
    }
  };

  const renderTabContent = () => {
    if (!caseData) return null;

    switch (activeTab) {
      case 'legal':
        return (
          <div className="p-6">
            {/* 测试用最简单的文件上传 */}
            <div className="mb-6 p-4 border-2 border-dashed border-pink-500 bg-pink-50 rounded-lg">
              <h3 className="font-bold text-pink-700 mb-2">测试文件上传（完整版后半部分2）</h3>
              <input 
                type="file" 
                onChange={(e) => {
                  console.log('完整版后半部分2 - 文件选择成功:', e.target.files?.[0]?.name);
                  alert('完整版后半部分2 - 文件选择成功: ' + e.target.files?.[0]?.name);
                }}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-pink-50 file:text-pink-700
                  hover:file:bg-pink-100"
              />
            </div>
            <LegalLitigationTab caseId={caseData?.id || ''} />
          </div>
        );
      
      default:
        return null;
    }
  };

  // 读取导航状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(NAVIGATION_KEY);
      if (saved) {
        try {
          const state = JSON.parse(saved);
          setNavigationState(state);
        } catch {
          console.error('解析导航状态失败');
        }
      }
    }
  }, []);

  // 页面获得焦点时自动刷新数据
  useEffect(() => {
    const handleFocus = () => {
      if (params.id) {
        // 模拟刷新
      }
    };
    window.addEventListener('focus', handleFocus);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && params.id) {
        // 模拟刷新
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      // 模拟加载
      setTimeout(() => {
        setCaseData({
          id: params.id as string,
          loanNo: 'DSL17421023520618258',
        } as any);
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

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">案件不存在</p>
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
            <div className="flex items-center gap-3">
              {/* 上下案件导航 */}
              {navigationState && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToPrev}
                    disabled={!hasPrev}
                    title="上一个案件"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="text-sm text-slate-500 px-2 min-w-[120px] text-center">
                    {navigationState.currentIndex + 1} / {navigationState.caseIds.length}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToNext}
                    disabled={!hasNext}
                    title="下一个案件"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-8" />
                </>
              )}
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

        {/* 跟进记录卡片 */}
        <Card className="mt-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-red-500 rounded-full" />
                <h3 className="text-xl font-bold text-slate-900">跟进记录</h3>
                <span className="text-sm text-slate-500">(0条)</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setNewFollowup({
                      follower: '未登记人',
                      followType: 'online',
                      contact: 'legal_representative',
                      followResult: 'normal_repayment',
                      followRecord: '',
                      fileInfo: [],
                      followTime: new Date().toISOString(),
                    });
                    setShowFollowupDialog(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新增跟进记录
                </Button>
              </div>
            </div>

            <p className="text-slate-500">暂无跟进记录</p>
          </div>
        </Card>
      </div>

      {/* 跟进记录对话框 */}
      <Dialog open={showFollowupDialog} onOpenChange={setShowFollowupDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>新增跟进记录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>跟进人</Label>
                <Input 
                  value={newFollowup.follower || ''}
                  onChange={(e) => setNewFollowup({ ...newFollowup, follower: e.target.value })}
                  placeholder="请输入跟进人"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>跟进记录</Label>
              <Textarea
                value={newFollowup.followRecord || ''}
                onChange={(e) => setNewFollowup({ ...newFollowup, followRecord: e.target.value })}
                placeholder="请输入跟进记录"
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label>上传文件 (可选)</Label>
              <div className="flex gap-2">
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e)}
                  className="hidden"
                  id="file-upload-test"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => document.getElementById('file-upload-test')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  选择文件
                </Button>
              </div>
              {uploadedCaseFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-sm text-slate-600">已选择 {uploadedCaseFiles.length} 个文件：</div>
                  <div className="flex flex-wrap gap-2">
                    {uploadedCaseFiles.map((file, index) => (
                      <div key={file.id} className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-sm">
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <button
                          onClick={() => setUploadedCaseFiles(prev => prev.filter((_, i) => i !== index))}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setShowFollowupDialog(false)}>
              取消
            </Button>
            <Button 
              type="button"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setShowFollowupDialog(false);
              }}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}