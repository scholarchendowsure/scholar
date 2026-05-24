'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Edit, Eye, ChevronLeft, ChevronRight, Upload, Download, Trash2, X, Check, Copy, AlertCircle, Clock, User, MapPin, Phone, Calendar, FileText, Building, ShoppingBag, Scale, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CaseStatusBadge } from '@/components/case-status-badge';
import { PriorityBadge } from '@/components/priority-badge';
import { FileUpload } from '@/components/file-upload';
import { FileList } from '@/components/file-list';
import { CaseFile } from '@/types/file';
import { Case } from '@/types/case';
import { FollowUp } from '@/types/followup';
import { useAuth } from '@/components/auth-provider';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { formatDateTime } from '@/lib/date-utils';
import { getUserFromCookie } from '@/lib/auth';
import LegalLitigationTab from '@/components/legal-litigation-tab';
import ShopTab from '@/components/shop-tab';

// 导航状态类型
interface NavigationState {
  caseIds: string[];
  currentIndex: number;
}

// sessionStorage key for navigation state
const NAVIGATION_KEY = 'case-navigation-state';

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('legal');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showFollowupDialog, setShowFollowupDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editData, setEditData] = useState<Partial<Case>>({});
  const [caseHistory, setCaseHistory] = useState<any[]>([]);
  const [newFollowup, setNewFollowup] = useState<Partial<FollowUp>>({
    followTime: new Date().toISOString().split('T')[0]
  });
  const [uploadedCaseFiles, setUploadedCaseFiles] = useState<CaseFile[]>([]);
  const [savingFollowup, setSavingFollowup] = useState(false);
  const [relatedLoans, setRelatedLoans] = useState<Case[]>([]);
  const [relatedLoansLoading, setRelatedLoansLoading] = useState(false);
  
  // 预览图片
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  
  // 店铺数据
  const [shopData, setShopData] = useState<any>(null);
  const [shopDataLoading, setShopDataLoading] = useState(false);
  
  // 导航状态
  const [navigationState, setNavigationState] = useState<NavigationState | null>(null);
  
  // 编辑案件数据
  const handleEdit = () => {
    if (caseData) {
      setEditData({ ...caseData });
      setShowEditDialog(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!caseData?.id) return;
    
    setSavingEdit(true);
    try {
      // 计算修改内容
      const changes: string[] = [];
      if (editData.borrowerName && editData.borrowerName !== caseData.borrowerName) {
        changes.push(`借款人姓名: ${caseData.borrowerName} → ${editData.borrowerName}`);
      }
      if (editData.companyName && editData.companyName !== caseData.companyName) {
        changes.push(`公司名称: ${caseData.companyName} → ${editData.companyName}`);
      }
      if (editData.borrowerPhone && editData.borrowerPhone !== caseData.borrowerPhone) {
        changes.push(`联系电话: ${caseData.borrowerPhone} → ${editData.borrowerPhone}`);
      }
      if (editData.status && editData.status !== caseData.status) {
        changes.push(`案件状态: ${caseData.status} → ${editData.status}`);
      }
      
      const res = await fetch(`/api/cases/${caseData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: editData,
          modifiedBy: currentUser,
          changeSummary: `修改了 ${changes.length} 个字段`
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success('保存成功');
        setShowEditDialog(false);
        // 直接更新本地数据，不依赖重新获取API
        setCaseData(prev => prev ? { ...prev, ...editData } : null);
      } else {
        toast.error(data.error || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败');
    } finally {
      setSavingEdit(false);
    }
  };
  
  // 查看完整记录内容状态
  const [viewFullRecord, setViewFullRecord] = useState<string | null>(null);
  
  // 保存文件上传，包含数据
  const [uploadingFiles, setUploadingFiles] = useState<{ [key: string]: string }>({});

  // 监听对话框打开，清空上传文件
  useEffect(() => {
    if (showFollowupDialog) {
      setUploadedCaseFiles([]);
    }
  }, [showFollowupDialog]);

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
      // 更新导航状态
      const newState = {
        ...navigationState,
        currentIndex: navigationState.currentIndex - 1,
      };
      sessionStorage.setItem(NAVIGATION_KEY, JSON.stringify(newState));
      setNavigationState(newState);
      router.push(`/cases/${prevCaseId}`);
    }
  };

  // 导航到下一个案件
  const goToNext = () => {
    if (nextCaseId && navigationState) {
      // 更新导航状态
      const newState = {
        ...navigationState,
        currentIndex: navigationState.currentIndex + 1,
      };
      sessionStorage.setItem(NAVIGATION_KEY, JSON.stringify(newState));
      setNavigationState(newState);
      router.push(`/cases/${nextCaseId}`);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchCase(params.id as string);
    }
  }, [params.id]);

  // 页面获得焦点时自动刷新数据（确保从提醒链接保存后能看到最新跟进记录）
  // 暂时禁用此功能，因为它会导致文件上传功能失败
  // 用户可以通过点击刷新按钮手动更新案件数据
  /* useEffect(() => {
    let isMounted = true;
    let isPageLoaded = false;
    
    // 页面加载完成后设置标志
    const timer = setTimeout(() => {
      if (isMounted) {
        isPageLoaded = true;
      }
    }, 1000);

    const handleFocus = () => {
      if (isMounted && isPageLoaded && params.id) {
        fetchCase(params.id as string);
      }
    };
    window.addEventListener('focus', handleFocus);
    
    // 同时监听 visibilitychange，处理移动端场景
    const handleVisibilityChange = () => {
      if (isMounted && isPageLoaded && document.visibilityState === 'visible' && params.id) {
        fetchCase(params.id as string);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [params.id]); */

  const fetchCase = async (id: string) => {
    try {
      setLoading(true);
      // 添加时间戳参数防止任何级别的缓存，同时请求完整文件数据
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

  const fetchRelatedLoans = async (userId: string | number) => {
    try {
      setRelatedLoansLoading(true);
      const res = await fetch(`/api/cases/user/${userId}`);
      const json: { success: boolean; data: Case[] } = await res.json();

      if (json.success) {
        setRelatedLoans(json.data);
      }
    } catch (error) {
      console.error('获取相关贷款失败:', error);
    } finally {
      setRelatedLoansLoading(false);
    }
  };

  // 当activeTab切换到timeline且有caseData时，获取相关贷款
  useEffect(() => {
    if (activeTab === 'timeline' && caseData?.userId) {
      fetchRelatedLoans(caseData.userId);
    }
  }, [activeTab, caseData?.userId]);

  // 当activeTab切换到shop且有caseData时，自动加载已保存的店铺数据
  useEffect(() => {
    if (activeTab === 'shop' && caseData?.userId && !shopData) {
      loadSavedShopData();
    }
  }, [activeTab, caseData?.userId]);



  const tabs = [
    { id: 'core', label: '核心信息', color: 'bg-blue-600 text-white' },
    { id: 'finance', label: '金额信息', color: 'bg-amber-500 text-white' },
    { id: 'timeline', label: '贷款记录', color: 'bg-emerald-600 text-white' },
    { id: 'borrower', label: '信息详情', color: 'bg-slate-600 text-white' },
    { id: 'repayment', label: '还款记录', color: 'bg-rose-600 text-white' },
    { id: 'files', label: '文件信息', color: 'bg-cyan-600 text-white' },
    { id: 'ownership', label: '案件标签', color: 'bg-purple-600 text-white' },
    { id: 'shop', label: '店铺详情', color: 'bg-violet-600 text-white' },
    { id: 'legal', label: '法律诉讼', color: 'bg-red-600 text-white' },
  ];
  
  // 获取店铺数据（从数据库加载已保存的数据，按用户ID同步）
  const loadSavedShopData = async () => {
    if (!caseData?.userId) return;
    
    try {
      const savedRes = await fetch(`/api/shop-data?userId=${encodeURIComponent(caseData.userId)}`);
      const savedJson = await savedRes.json();
      
      if (savedJson.success && savedJson.data) {
        try {
          const parsedData = typeof savedJson.data.latestDataset === 'string'
            ? JSON.parse(savedJson.data.latestDataset)
            : savedJson.data.latestDataset;
          setShopData({
            ...parsedData,
            _updateTime: savedJson.data.updateTime
          });
        } catch (e) {
          console.error('解析已保存的店铺数据失败:', e);
        }
      }
    } catch (error) {
      console.error('加载已保存的店铺数据失败:', error);
    }
  };

  // 一键获取店铺运营资料（强制从贷款查询API重新获取，不走缓存）
  const fetchShopData = async () => {
    if (!caseData?.loanNo) {
      toast.error('缺少贷款单号');
      return;
    }
    
    setShopDataLoading(true);
    try {
      // 直接调用贷款查询API重新获取，不读缓存
      const res = await fetch('/api/complex-loan-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanCode: caseData.loanNo })
      });
      
      const json = await res.json();
      
      if (json.success) {
        // 找到最新的记录
        const allRecords = json.data?.step3?.allRecords || [];
        if (allRecords.length > 0) {
          // 按时间倒序排序，取最新的
          const sortedRecords = [...allRecords].sort((a: any, b: any) => {
            return new Date(b.update_time).getTime() - new Date(a.update_time).getTime();
          });
          
          const latestRecord = sortedRecords[0];
          if (latestRecord?.latest_dataset) {
            try {
              const parsedData = typeof latestRecord.latest_dataset === 'string' 
                ? JSON.parse(latestRecord.latest_dataset)
                : latestRecord.latest_dataset;
              setShopData({
                ...parsedData,
                _updateTime: latestRecord.update_time,
                _allRecords: allRecords
              });
              
              // 保存到数据库，按用户ID同步，相同用户ID的所有案件共享同一店铺数据
              try {
                await fetch('/api/shop-data', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: caseData.userId,
                    updateTime: latestRecord.update_time,
                    latestDataset: latestRecord.latest_dataset
                  })
                });
                console.log('✅ 店铺数据已按用户ID保存到数据库');
              } catch (saveErr) {
                console.error('保存店铺数据到数据库失败:', saveErr);
              }
              
              toast.success('获取店铺数据成功');
            } catch (e) {
              toast.error('解析店铺数据失败');
            }
          } else {
            toast.info('暂无店铺数据');
          }
        } else {
          toast.info('暂无店铺数据');
        }
      } else {
        toast.error(json.message || '获取店铺数据失败');
      }
    } catch (error) {
      console.error('获取店铺数据失败:', error);
      toast.error('获取店铺数据失败');
    } finally {
      setShopDataLoading(false);
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
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? tab.color + ' border-b-2 border-transparent'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
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