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
  // 暂时禁用此功能，因为它会导致文件上传功能失败
  // 用户可以通过点击刷新按钮手动更新案件数据
  /* useEffect(() => {
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
      case 'core':
        return (
          <div className="p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Field label="用户ID" value={caseData.userId} highlight />
              <Field label="借款人姓名" value={caseData.borrowerName} highlight />
              <Field label="币种" value={caseData.currency || '-'} />
              <Field label="在贷金额" value={formatMoney(caseData.outstandingBalance || 0)} highlight />
              <Field label="逾期金额" value={
                <span className={(caseData.overdueAmount || 0) > 0 ? 'text-red-600 font-semibold' : ''}>
                  {formatMoney(caseData.overdueAmount || 0)}
                </span>
              } highlight />
              <Field label="借款人手机号" value={caseData.borrowerPhone || '-'} highlight />
              <Field label="状态" value={
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[caseData.status as keyof typeof STATUS_CONFIG]?.color || 'bg-slate-100 text-slate-800'}`}>
                  {STATUS_CONFIG[caseData.status as keyof typeof STATUS_CONFIG]?.label || caseData.status}
                </span>
              } />
              <Field label="风险等级" value={
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${RISK_CONFIG[caseData.riskLevel as keyof typeof RISK_CONFIG]?.color || 'bg-slate-100 text-slate-800'}`}>
                  {RISK_CONFIG[caseData.riskLevel as keyof typeof RISK_CONFIG]?.label || caseData.riskLevel}
                </span>
              } />
            </dl>
          </div>
        );
      case 'finance':
        return (
          <div className="p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Field label="贷款金额" value={formatMoney((caseData as any).loanAmount || 0)} />
              <Field label="未结余额" value={formatMoney(caseData.outstandingBalance || 0)} highlight />
              <Field label="逾期金额" value={formatMoney(caseData.overdueAmount || 0)} highlight />
              <Field label="逾期天数" value={(caseData as any).overdueDays || 0} />
              <Field label="应还日期" value={(caseData as any).dueDate ? new Date((caseData as any).dueDate).toLocaleDateString('zh-CN') : '-'} />
              <Field label="首逾日期" value={(caseData as any).firstOverdueTime ? new Date((caseData as any).firstOverdueTime).toLocaleDateString('zh-CN') : '-'} />
            </dl>
          </div>
        );
      case 'timeline':
        return (
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">相关贷款记录</h3>
            {relatedLoansLoading ? (
              <div className="text-center py-8 text-slate-500">加载中...</div>
            ) : relatedLoans.length > 0 ? (
              <div className="space-y-4">
                {relatedLoans.map((loan) => (
                  <div key={loan.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">贷款单号: {loan.loanNo}</div>
                        <div className="text-sm text-slate-500 mt-1">
                          在贷金额: {formatMoney(loan.outstandingBalance || 0)}
                        </div>
                        <div className="text-sm text-slate-500">
                          状态: <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[loan.status as keyof typeof STATUS_CONFIG]?.color || 'bg-slate-100 text-slate-800'}`}>
                            {STATUS_CONFIG[loan.status as keyof typeof STATUS_CONFIG]?.label || loan.status}
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/cases/${loan.id}`)}>
                        <Eye className="w-4 h-4 mr-2" />
                        查看
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">暂无相关贷款记录</div>
            )}
          </div>
        );
      case 'borrower':
        return (
          <div className="p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="公司名称" value={(caseData as any).companyName || '-'} />
              <Field label="公司地址" value={(caseData as any).companyAddress || '-'} />
              <Field label="法定代表人" value={(caseData as any).legalRepresentative || '-'} />
              <Field label="实际控制人" value={(caseData as any).actualController || '-'} />
              <Field label="联系人" value={(caseData as any).contactPerson || '-'} />
              <Field label="联系电话" value={(caseData as any).contactPhone || '-'} />
            </dl>
          </div>
        );
      case 'repayment':
        return (
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">还款记录</h3>
            {(caseData as any).repaymentRecords && (caseData as any).repaymentRecords.length > 0 ? (
              <div className="space-y-4">
                {(caseData as any).repaymentRecords.map((record: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="还款日期" value={record.repaymentDate ? new Date(record.repaymentDate).toLocaleDateString('zh-CN') : '-'} />
                      <Field label="还款金额" value={formatMoney(record.repaymentAmount || 0)} highlight />
                      <Field label="还款方式" value={record.repaymentMethod || '-'} />
                      <Field label="备注" value={record.remark || '-'} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">暂无还款记录</div>
            )}
          </div>
        );
      case 'files':
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">文件信息</h3>
              <Button onClick={() => setShowFollowupDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                添加文件
              </Button>
            </div>
            {(caseData as any).files && (caseData as any).files.length > 0 ? (
              <div className="space-y-4">
                {(caseData as any).files.map((file: CaseFile) => (
                  <div key={file.id} className="border rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      {file.type === 'image' && file.data && (
                        <div 
                          className="w-12 h-12 bg-slate-100 rounded mr-4 cursor-pointer flex items-center justify-center"
                          onClick={() => setPreviewImage(file.data as string)}
                        >
                          <img 
                            src={file.data as string} 
                            alt={file.name}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                      )}
                      {file.type === 'document' && (
                        <div className="w-12 h-12 bg-blue-100 rounded mr-4 flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      )}
                      {file.type === 'other' && (
                        <div className="w-12 h-12 bg-slate-100 rounded mr-4 flex items-center justify-center">
                          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{file.name}</div>
                        <div className="text-sm text-slate-500">
                          {file.uploadBy} · {file.uploadTime ? new Date(file.uploadTime).toLocaleString('zh-CN') : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">暂无文件</div>
            )}
          </div>
        );
      case 'ownership':
        return (
          <div className="p-6">
            <div className="space-y-4">
              <Field label="分配销售" value={(caseData as any).assignedSales || '-'} />
              <Field label="分配贷后" value={(caseData as any).assignedPostLoan || '-'} />
              <div>
                <dt className="text-sm font-medium text-slate-500 mb-2">案件标签</dt>
                <dd className="flex flex-wrap gap-2">
                  {caseData.caseTags && caseData.caseTags.length > 0 ? (
                    caseData.caseTags.map((tag: string, index: number) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </dd>
              </div>
            </div>
          </div>
        );
      case 'shop':
        return (
          <div className="p-6">
            {shopData ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium">店铺详情</h3>
                  <div className="flex items-center gap-2">
                    {shopData._updateTime && (
                      <span className="text-sm text-slate-500">
                        更新时间: {new Date(shopData._updateTime).toLocaleString('zh-CN')}
                      </span>
                    )}
                    <Button onClick={fetchShopData} disabled={shopDataLoading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${shopDataLoading ? 'animate-spin' : ''}`} />
                      重新获取
                    </Button>
                  </div>
                </div>
                <div className="border-b mb-6">
                  <nav className="flex space-x-4">
                    <button
                      onClick={() => setShopActiveTab('overview')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        shopActiveTab === 'overview'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      概览
                    </button>
                    <button
                      onClick={() => setShopActiveTab('charts')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        shopActiveTab === 'charts'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      图表
                    </button>
                    <button
                      onClick={() => setShopActiveTab('data')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        shopActiveTab === 'data'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      数据明细
                    </button>
                  </nav>
                </div>
                {shopActiveTab === 'overview' && (
                  <ShopDataParser shopData={shopData} />
                )}
                {shopActiveTab === 'charts' && (
                  <ShopCharts shopData={shopData} />
                )}
                {shopActiveTab === 'data' && (
                  <div className="bg-slate-50 p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm font-mono whitespace-pre-wrap">
                      {JSON.stringify(shopData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">暂无店铺数据</h3>
                <p className="text-slate-500 mb-6">点击下方按钮获取店铺运营资料</p>
                <Button onClick={fetchShopData} disabled={shopDataLoading}>
                  {shopDataLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      获取中...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      获取店铺运营资料
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        );
      case 'legal':
        return (
          <LegalLitigationTab caseId={caseData.id} />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">未找到案件</p>
          <Button onClick={() => router.push('/cases')}>返回案件列表</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => router.push('/cases')} className="mr-4">
                <ArrowLeft className="w-5 h-5 mr-2" />
                返回
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{caseData.loanNo}</h1>
                <p className="text-sm text-slate-500">贷款单号: {caseData.loanNo}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 上一个/下一个案件导航 */}
              {hasPrev && (
                <Button variant="ghost" size="sm" onClick={goToPrev} title="上一个案件">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              {hasNext && (
                <Button variant="ghost" size="sm" onClick={goToNext} title="下一个案件">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => fetchCase(params.id as string)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>
              <Button variant="ghost" size="sm" onClick={handleViewHistory}>
                <Eye className="w-4 h-4 mr-2" />
                历史
              </Button>
              <Button variant="ghost" size="sm" onClick={handleEditCase}>
                <Edit className="w-4 h-4 mr-2" />
                编辑
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 案件信息头 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[caseData.status as keyof typeof STATUS_CONFIG]?.color || 'bg-slate-100 text-slate-800'}`}>
                {STATUS_CONFIG[caseData.status as keyof typeof STATUS_CONFIG]?.label || caseData.status}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${RISK_CONFIG[caseData.riskLevel as keyof typeof RISK_CONFIG]?.color || 'bg-slate-100 text-slate-800'}`}>
                {RISK_CONFIG[caseData.riskLevel as keyof typeof RISK_CONFIG]?.label || caseData.riskLevel}
              </span>
              {/* 提醒跟进按钮 - 仅对有法定代表人的案件显示 */}
              {((caseData as any).legalRepresentative) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleSendReminder('legal_representative', (caseData as any).legalRepresentative)}
                  disabled={sendingReminder === 'legal_representative'}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  {sendingReminder === 'legal_representative' ? '发送中...' : `提醒 ${(caseData as any).legalRepresentative} 跟进`}
                </Button>
              )}
              {/* 提醒跟进按钮 - 实际控制人 */}
              {((caseData as any).actualController) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleSendReminder('actual_controller', (caseData as any).actualController)}
                  disabled={sendingReminder === 'actual_controller'}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  {sendingReminder === 'actual_controller' ? '发送中...' : `提醒 ${(caseData as any).actualController} 跟进`}
                </Button>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setHeaderCollapsed(!headerCollapsed)}>
              {headerCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 rotate-180" />}
            </Button>
          </div>
          
          {!headerCollapsed && (
            <dl className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Field label="借款人姓名" value={caseData.borrowerName} highlight />
              <Field label="在贷金额" value={formatMoney(caseData.outstandingBalance || 0)} highlight />
              <Field label="逾期金额" value={
                <span className={(caseData.overdueAmount || 0) > 0 ? 'text-red-600 font-semibold' : ''}>
                  {formatMoney(caseData.overdueAmount || 0)}
                </span>
              } highlight />
              <Field label="用户ID" value={caseData.userId} />
              <Field label="产品名称" value={caseData.productName || '-'} />
              <Field label="资金方" value={caseData.funder || '-'} />
            </dl>
          )}
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? tab.color
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 标签页内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardContent className="p-0">
            {renderTabContent()}
          </CardContent>
        </Card>
      </div>

      {/* 跟进记录对话框 */}
      <Dialog open={showFollowupDialog} onOpenChange={setShowFollowupDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加跟进记录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>跟进人</Label>
                <Input
                  value={newFollowup.follower || ''}
                  onChange={(e) => setNewFollowup(prev => ({ ...prev, follower: e.target.value }))}
                  placeholder="请输入跟进人姓名"
                />
              </div>
              <div className="space-y-2">
                <Label>跟进方式</Label>
                <Select
                  value={newFollowup.followType || 'online'}
                  onValueChange={(value) => setNewFollowup(prev => ({ ...prev, followType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLLOWUP_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>联系对象</Label>
                <Select
                  value={newFollowup.contact || 'legal_representative'}
                  onValueChange={(value) => setNewFollowup(prev => ({ ...prev, contact: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>跟进结果</Label>
                <Select
                  value={newFollowup.followResult || 'normal_repayment'}
                  onValueChange={(value) => setNewFollowup(prev => ({ ...prev, followResult: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLLOWUP_RESULT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>跟进记录</Label>
              <Textarea
                value={newFollowup.followRecord || ''}
                onChange={(e) => setNewFollowup(prev => ({ ...prev, followRecord: e.target.value }))}
                placeholder="请输入跟进记录内容"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>上传文件</Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="followup-file-upload"
                />
                <label htmlFor="followup-file-upload" className="cursor-pointer">
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">点击或拖拽文件到此处上传</p>
                  </div>
                </label>
                {uploadedCaseFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedCaseFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                        <span className="text-sm">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUploadedCaseFiles(prev => prev.filter(f => f.id !== file.id))}
                        >
                          移除
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowFollowupDialog(false)}>
              取消
            </Button>
            <Button
              onClick={async () => {
                if (!newFollowup.follower || !newFollowup.followRecord) {
                  toast.error('请填写跟进人和跟进记录');
                  return;
                }
                
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

                  const followup: FollowUp = {
                    id: Date.now().toString(),
                    followTime: new Date().toISOString(),
                    follower: newFollowup.follower,
                    followType: newFollowup.followType as any,
                    contact: newFollowup.contact as any,
                    followResult: newFollowup.followResult as any,
                    followRecord: newFollowup.followRecord,
                    fileInfo: uploadedCaseFiles,
                    createdBy: currentUser,
                  };

                  const res = await fetch(`/api/cases/${caseData.id}/followups`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ followup }),
                  });

                  const data = await res.json();
                  if (data.success) {
                    toast.success('添加成功');
                    setShowFollowupDialog(false);
                    setNewFollowup({
                      follower: '',
                      followType: 'online',
                      contact: 'legal_representative',
                      followResult: 'normal_repayment',
                      followRecord: '',
                      fileInfo: [],
                    });
                    setUploadedCaseFiles([]);
                    fetchCase(params.id as string);
                  } else {
                    toast.error(data.error || '添加失败');
                  }
                } catch (error) {
                  toast.error('添加失败');
                }
              }}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑案件</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>借款人姓名</Label>
                <Input
                  value={editData.borrowerName || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, borrowerName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>公司名称</Label>
                <Input
                  value={(editData as any).companyName || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, companyName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>联系电话</Label>
                <Input
                  value={editData.borrowerPhone || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, borrowerPhone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>案件状态</Label>
                <Select
                  value={editData.status || ''}
                  onValueChange={(value) => setEditData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>风险等级</Label>
                <Select
                  value={editData.riskLevel || ''}
                  onValueChange={(value) => setEditData(prev => ({ ...prev, riskLevel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RISK_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>在贷金额</Label>
                <Input
                  type="number"
                  value={editData.outstandingBalance || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, outstandingBalance: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>逾期金额</Label>
                <Input
                  type="number"
                  value={editData.overdueAmount || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, overdueAmount: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>逾期天数</Label>
                <Input
                  type="number"
                  value={(editData as any).overdueDays || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, overdueDays: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>分配销售</Label>
                <Input
                  value={(editData as any).assignedSales || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, assignedSales: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>分配贷后</Label>
                <Input
                  value={(editData as any).assignedPostLoan || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, assignedPostLoan: e.target.value }))}
                />
              </div>
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

      {/* 历史记录对话框 */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>修改历史</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {historyLoading ? (
              <div className="text-center py-8">加载中...</div>
            ) : groupedHistory.length > 0 ? (
              <div className="space-y-6">
                {groupedHistory.map((group) => (
                  <div key={group.id} className="border-l-2 border-slate-200 pl-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">{group.modifiedBy}</div>
                      <div className="text-sm text-slate-500">
                        {new Date(group.modifiedAt).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {group.changes.map((change: any, index: number) => (
                        <div key={index} className="bg-slate-50 p-3 rounded">
                          <div className="text-sm font-medium text-slate-900">{change.field}</div>
                          <div className="mt-1 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-slate-500">修改前</div>
                              <div className="text-slate-700 break-all">{change.oldValue}</div>
                            </div>
                            <div>
                              <div className="text-slate-500">修改后</div>
                              <div className="text-slate-700 break-all">{change.newValue}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">暂无修改记录</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 图片预览对话框 */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>图片预览</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex justify-center">
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}