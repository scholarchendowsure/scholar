'use client';

// 案件详情页
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
import { ShopDataParser } from '@/components/shop/shop-data-parser';
import { ShopCharts } from '@/components/shop/shop-charts';
import CaseEvaluationForm from '@/components/case-evaluation-form';
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
  const [relatedLoans, setRelatedLoans] = useState<Case[]>([]);
  const [relatedLoansLoading, setRelatedLoansLoading] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
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

  // 提醒跟进状态
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  
  // 店铺详情相关状态
  const [shopData, setShopData] = useState<any>(null);
  const [shopDataLoading, setShopDataLoading] = useState(false);
  const [shopActiveTab, setShopActiveTab] = useState<string>('overview');

  // 发送飞书提醒消息
  const handleSendReminder = async (roleType: string, roleName: string) => {
    if (!caseData || !roleName) {
      toast.error('缺少必要信息');
      return;
    }

    setSendingReminder(roleType);
    try {
      // 获取当前用户信息
      let operatorId = 'system';
      let operatorName = '系统';
      try {
        const authRes = await fetch('/api/auth/session');
        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData?.user) {
            operatorId = authData.user.id || authData.user.name || 'system';
            operatorName = authData.user.name || '系统';
          }
        }
      } catch {}
      
      // 1. 先从已保存用户列表中查找
      let openId: string | null = null;
      
      try {
        const usersRes = await fetch('/api/feishu-users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          const userList = usersData.data || usersData.users || usersData;
          if (userList && Array.isArray(userList)) {
            // 更灵活的用户匹配逻辑
            const foundUser = userList.find((u: any) => {
              const userName = (u.name || '').toLowerCase().trim();
              const targetName = roleName.toLowerCase().trim();
              
              // 1. 精确匹配
              if (userName === targetName) return true;
              
              // 2. 包含匹配（目标名称是用户名的一部分）
              if (userName.includes(targetName)) return true;
              
              // 3. 反过来：用户名是目标名称的一部分
              if (targetName.includes(userName)) return true;
              
              // 4. 处理特殊格式："高乐｜Scholar(陈伟旭)" 匹配 "高乐"
              const namePart = userName.split('｜')[0].split('|')[0].trim();
              if (namePart === targetName) return true;
              
              return false;
            });
            if (foundUser?.openId) {
              openId = foundUser.openId;
            }
          }
        }
      } catch (e) {
        console.log('从已保存用户列表查找失败，继续搜索');
      }
      
      // 2. 如果没找到，再搜索用户
      if (!openId) {
        try {
          const searchRes = await fetch(`/api/feishu-personal/search-user?keyword=${encodeURIComponent(roleName)}`);
          
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            
            if (searchData.success && searchData.user?.openId) {
              openId = searchData.user.openId;
            }
          }
        } catch (searchError) {
          console.log('搜索用户失败，继续尝试发送消息或跳过:', searchError);
        }
      }
      
      // 如果还是没找到 openId，给出提示
      if (!openId) {
        toast.warning(`未找到用户 ${roleName} 的飞书账号，请先在数据存储表中保存该用户信息`);
        return;
      }

      // 3. 构造消息内容
      const dateStr = (caseData as any).firstOverdueTime || (caseData as any).dueDate || (caseData as any).compensationDate || (caseData as any).repaymentDate;
      const dueDate = dateStr ? new Date(dateStr).toLocaleDateString('zh-CN') : '未知';
      const followLink = `${window.location.origin}/followup/${caseData.loanNo}?follower=${encodeURIComponent(roleName)}`;
      const balance = (caseData as any).outstandingBalance || (caseData as any).overdueAmount || (caseData as any).inLoanBalance || 0;
      
      // 处理币种显示
      let currency = caseData.currency || 'CNY';
      let currencySymbol = '';
      if (currency === 'CNY') {
        currencySymbol = '元';
      } else if (currency === 'USD') {
        currencySymbol = '美元';
      } else {
        currencySymbol = currency;
      }
      
      // 4. 发送飞书卡片（字段映射已正确配置）
      const dueAmount = `${Number(caseData.overdueAmount || balance).toLocaleString('zh-CN', { minimumFractionDigits: 2 })} ${currencySymbol}`;
      
      const sendRes = await fetch('/api/feishu-personal/send-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openId: openId,
          caseId: caseData.id,
          operatorId: operatorId,
          operatorName: operatorName,
          followerName: roleName,
          title: '案件跟进提醒',
          fields: [
            { label: '产品名称', value: caseData.productName },
            { label: '资金方', value: caseData.funder },
            { label: '风险等级', value: caseData.riskLevel },
            { label: '借款人姓名', value: (caseData as any).borrowerName || '-' },
            { label: '用户ID', value: caseData.userId },
            { label: '贷款单号', value: caseData.loanNo },
            { label: '待还金额', value: dueAmount },
            { label: '到期日', value: dueDate }
          ]
        })
      });
      
      const sendData = await sendRes.json();
      
      if (sendData.success) {
        toast.success(`已发送飞书卡片提醒给 ${roleName}`);
      } else {
        toast.error(sendData.error || '发送失败');
      }

    } catch (error) {
      console.error('发送提醒失败:', error);
      toast.error(error instanceof Error ? error.message : '发送提醒失败');
    } finally {
      setSendingReminder(null);
    }
  };
  
  // 文件上传处理 - 和免登录页面保持一致
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
  
  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // 编辑和历史对话框状态
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [editData, setEditData] = useState<Partial<Case>>({});
  const [caseHistory, setCaseHistory] = useState<CaseHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  
  // 编辑和历史处理函数
  const handleEditCase = () => {
    if (!caseData) return;
    setEditData({ ...caseData });
    setShowEditDialog(true);
  };
  
  const handleViewHistory = async () => {
    if (!caseData?.id) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseData.id}/history`);
      const data = await res.json();
      if (data.success) {
        setCaseHistory(data.history || []);
        setShowHistoryDialog(true);
      } else {
        toast.error(data.error || '获取历史记录失败');
      }
    } catch (error) {
      console.error('获取历史记录失败:', error);
      toast.error('获取历史记录失败');
    } finally {
      setHistoryLoading(false);
    }
  };
  
  const handleCompareChanges = (oldData: any, newData: any, modifiedBy: string) => {
    const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];
    const allFields = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
    
    const fieldLabels: Record<string, string> = {
      borrowerName: '借款人姓名',
      companyName: '公司名称',
      borrowerPhone: '联系电话',
      status: '案件状态',
      riskLevel: '风险等级',
      outstandingBalance: '未结余额',
      overdueAmount: '逾期金额',
      overdueDays: '逾期天数',
      caseTags: '案件标签',
      assignedSales: '分配销售',
      assignedPostLoan: '分配贷后'
    };
    
    allFields.forEach(field => {
      const oldValue = oldData?.[field];
      const newValue = newData?.[field];
      const oldStr = JSON.stringify(oldValue);
      const newStr = JSON.stringify(newValue);
      
      if (oldStr !== newStr) {
        changes.push({
          field: fieldLabels[field] || field,
          oldValue: oldStr,
          newValue: newStr
        });
      }
    });
    
    return changes;
  };
  
  // 计算历史记录的展示格式（按时间分组）
  const groupedHistory = useMemo(() => {
    const groups: Record<string, any[]> = {};
    caseHistory.forEach(record => {
      const key = record.modifiedAt + '-' + record.userName;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(record);
    });
    // 转换为数组并排序
    return Object.values(groups).map(group => ({
      id: group[0].modifiedAt + '-' + group[0].userName,
      modifiedBy: group[0].userName,
      modifiedAt: group[0].modifiedAt,
      changes: group.map(g => ({
        field: g.fieldLabel || g.fieldName,
        oldValue: String(g.oldValue || ''),
        newValue: String(g.newValue || '')
      }))
    })).sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
  }, [caseHistory]);
  
  const handleSaveEdit = async () => {
    if (!caseData?.id) return;
    setSavingEdit(true);
    try {
      // 获取当前用户
      let currentUser = '系统';
      try {
        const authRes = await fetch('/api/auth/session');
        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData?.user?.name) {
            currentUser = authData.user.name;
          }
        }
      } catch {}
      
      const changes = handleCompareChanges(caseData, editData, currentUser);
      
      if (changes.length === 0) {
        toast.info('没有修改内容');
        setShowEditDialog(false);
        return;
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
  useEffect(() => {
    const handleFocus = () => {
      if (params.id) {
        fetchCase(params.id as string);
      }
    };
    window.addEventListener('focus', handleFocus);
    // 同时监听 visibilitychange，处理移动端场景
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && params.id) {
        fetchCase(params.id as string);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [params.id]);

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
              {/* 导航按钮 */}
              {(hasPrev || hasNext) && (
                <div className="flex items-center gap-1 mr-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToPrev}
                    disabled={!hasPrev}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToNext}
                    disabled={!hasNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <Button variant="ghost" onClick={() => fetchCase(caseData.id)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新
              </Button>
              <Button variant="ghost" onClick={handleEditCase}>
                <Edit className="h-4 w-4 mr-2" />
                编辑
              </Button>
              <Button variant="ghost" onClick={handleViewHistory}>
                <Eye className="h-4 w-4 mr-2" />
                历史
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
                    ? `${tab.color} border-b-2 border-transparent`
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

      {/* 编辑对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑案件</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>借款人姓名</Label>
              <Input
                value={editData.borrowerName || ''}
                onChange={(e) => setEditData({ ...editData, borrowerName: e.target.value })}
              />
            </div>
            <div>
              <Label>联系电话</Label>
              <Input
                value={editData.borrowerPhone || ''}
                onChange={(e) => setEditData({ ...editData, borrowerPhone: e.target.value })}
              />
            </div>
            <div>
              <Label>案件状态</Label>
              <Select
                value={editData.status || ''}
                onValueChange={(value) => setEditData({ ...editData, status: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>风险等级</Label>
              <Select
                value={editData.riskLevel || ''}
                onValueChange={(value) => setEditData({ ...editData, riskLevel: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RISK_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>未结余额</Label>
              <Input
                type="number"
                value={editData.outstandingBalance || ''}
                onChange={(e) => setEditData({ ...editData, outstandingBalance: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>逾期金额</Label>
              <Input
                type="number"
                value={editData.overdueAmount || ''}
                onChange={(e) => setEditData({ ...editData, overdueAmount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>分配销售</Label>
              <Input
                value={editData.assignedSales || ''}
                onChange={(e) => setEditData({ ...editData, assignedSales: e.target.value })}
              />
            </div>
            <div>
              <Label>分配贷后</Label>
              <Input
                value={editData.assignedPostLoan || ''}
                onChange={(e) => setEditData({ ...editData, assignedPostLoan: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 历史对话框 */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>修改历史</DialogTitle>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : caseHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              暂无修改记录
            </div>
          ) : (
            <div className="space-y-6">
              {groupedHistory.map((group) => (
                <div key={group.id} className="border-l-2 border-blue-200 pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-slate-900">{group.modifiedBy}</span>
                    <span className="text-sm text-slate-500">
                      {new Date(group.modifiedAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.changes.map((change, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-4 text-sm">
                        <span className="font-medium text-slate-700">{change.field}</span>
                        <span className="text-slate-500 line-through">{change.oldValue || '-'}</span>
                        <span className="text-green-600">{change.newValue || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 图片预览对话框 */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          {previewImage && (
            <img
              src={previewImage}
              alt="预览"
              className="w-full h-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}