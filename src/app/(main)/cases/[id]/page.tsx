'use client';

// 案件详情页 - 二分法调试 - 完整原始代码 - 从最后面开始注释掉
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
  const [activeTab, setActiveTab] = useState<string>('info');
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
  
  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // 编辑和历史对话框状态
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [editData, setEditData] = useState<Partial<Case>>({});
  const [caseHistory, setCaseHistory] = useState<CaseHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  
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

  // 导航功能函数
  const goToPrev = () => {
    if (prevCaseId && navigationState) {
      router.push(`/cases/${prevCaseId}`);
    }
  };

  const goToNext = () => {
    if (nextCaseId && navigationState) {
      router.push(`/cases/${nextCaseId}`);
    }
  };

  // 获取案件数据
  const fetchCase = async (caseId: string) => {
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      if (!res.ok) throw new Error('案件不存在');
      const data = await res.json();
      setCaseData(data);
      
      // 更新导航状态中的当前索引
      if (navigationState && navigationState.caseIds.includes(caseId)) {
        const newIndex = navigationState.caseIds.indexOf(caseId);
        setNavigationState({
          ...navigationState,
          currentIndex: newIndex,
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载案件失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取相关贷款
  const fetchRelatedLoans = async () => {
    if (!caseData?.userId) return;

    setRelatedLoansLoading(true);
    try {
      const res = await fetch(`/api/cases?userId=${caseData.userId}&excludeCaseId=${caseData.id}`);
      if (!res.ok) throw new Error('获取相关贷款失败');
      const data = await res.json();
      setRelatedLoans(data);
    } catch (error) {
      console.error('获取相关贷款失败:', error);
    } finally {
      setRelatedLoansLoading(false);
    }
  };

  // 编辑案件
  const handleEditCase = () => {
    if (caseData) {
      setEditData({ ...caseData });
      setShowEditDialog(true);
    }
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!caseData) return;

    setSavingEdit(true);
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

      const res = await fetch(`/api/cases/${caseData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editData,
          operatorId,
          operatorName,
        }),
      });

      if (!res.ok) throw new Error('保存失败');

      const updatedCase = await res.json();
      setCaseData(updatedCase);
      setShowEditDialog(false);
      toast.success('保存成功');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSavingEdit(false);
    }
  };

  // 查看历史
  const handleViewHistory = async () => {
    if (!caseData) return;

    setHistoryLoading(true);
    setShowHistoryDialog(true);
    try {
      const res = await fetch(`/api/cases/${caseData.id}/history`);
      if (res.ok) {
        const data = await res.json();
        setCaseHistory(data);
      }
    } catch (error) {
      console.error('获取历史记录失败:', error);
      toast.error('获取历史记录失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  // 获取店铺数据
  const fetchShopData = async () => {
    if (!caseData) return;

    setShopDataLoading(true);
    try {
      const res = await fetch(`/api/shop-data?userId=${caseData.userId}`);
      if (res.ok) {
        const data = await res.json();
        setShopData(data);
      }
    } catch (error) {
      console.error('获取店铺数据失败:', error);
      toast.error('获取店铺数据失败');
    } finally {
      setShopDataLoading(false);
    }
  };

  // 分组后的历史记录
  const groupedHistory = useMemo(() => {
    if (!caseHistory.length) return [];
    return caseHistory;
  }, [caseHistory]);

  // 加载案件数据
  useEffect(() => {
    if (params.id) {
      fetchCase(params.id as string);
    }
  }, [params.id]);

  // 案件加载后获取相关贷款
  useEffect(() => {
    if (caseData) {
      fetchRelatedLoans();
    }
  }, [caseData]);

  const tabs = [
    { id: 'info', label: '基本信息', color: 'bg-blue-600 text-white' },
    { id: 'details', label: '详细信息', color: 'bg-teal-600 text-white' },
    { id: 'files', label: '文件信息', color: 'bg-cyan-600 text-white' },
    { id: 'ownership', label: '权属信息', color: 'bg-emerald-600 text-white' },
    { id: 'shop', label: '店铺详情', color: 'bg-violet-600 text-white' },
    { id: 'evaluation', label: '风险评估', color: 'bg-amber-600 text-white' },
    { id: 'legal', label: '法律诉讼', color: 'bg-red-600 text-white' },
  ];
  
  const renderTabContent = () => {
    if (!caseData) return null;

    switch (activeTab) {
      case 'info':
        return (
          <div className="p-6">
            {/* 状态标签区域 */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-slate-600 mb-4">案件状态</h4>
              <div className="flex items-center gap-4">
                <Badge className={STATUS_CONFIG[caseData.status as keyof typeof STATUS_CONFIG]?.color || 'bg-gray-100'}>
                  {STATUS_CONFIG[caseData.status as keyof typeof STATUS_CONFIG]?.label || caseData.status}
                </Badge>
                <Badge className={RISK_CONFIG[caseData.riskLevel as keyof typeof RISK_CONFIG]?.color || 'bg-gray-100'}>
                  {RISK_CONFIG[caseData.riskLevel as keyof typeof RISK_CONFIG]?.label || caseData.riskLevel}
                </Badge>
                {caseData.isLocked && (
                  <Badge variant="destructive">已锁定</Badge>
                )}
                {caseData.isExtended && (
                  <Badge className="bg-purple-100 text-purple-800">已展期</Badge>
                )}
              </div>
            </div>
            
            {/* 核心信息 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="col-span-full md:col-span-2 space-y-4">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field 
                    label="借款人姓名" 
                    value={(caseData as any).borrowerName || (caseData as any).customerName || '-'} 
                    highlight 
                  />
                  <Field 
                    label="公司名称" 
                    value={(caseData as any).companyName || '-'} 
                  />
                  <Field 
                    label="联系电话" 
                    value={(caseData as any).borrowerPhone || (caseData as any).phone || '-'} 
                  />
                  <Field 
                    label="产品名称" 
                    value={caseData.productName || '-'} 
                  />
                  <Field 
                    label="资金方" 
                    value={caseData.funder || '-'} 
                  />
                  <Field 
                    label="渠道方" 
                    value={(caseData as any).channelPartner || '-'} 
                  />
                  <Field 
                    label="风险等级" 
                    value={caseData.riskLevel || '-'} 
                  />
                  <Field 
                    label="案件状态" 
                    value={STATUS_CONFIG[caseData.status as keyof typeof STATUS_CONFIG]?.label || caseData.status} 
                  />
                </dl>
              </div>
              
              {/* 相关贷款 */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-600">相关贷款</h4>
                {relatedLoansLoading ? (
                  <div className="text-center py-8 text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                    <p className="mt-2 text-sm">加载中...</p>
                  </div>
                ) : relatedLoans.length > 0 ? (
                  <div className="space-y-2">
                    {relatedLoans.map((loan) => (
                      <div 
                        key={loan.id}
                        className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/cases/${loan.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-slate-900">{loan.loanNo}</div>
                          <Badge className={STATUS_CONFIG[loan.status as keyof typeof STATUS_CONFIG]?.color || 'bg-gray-100'}>
                            {STATUS_CONFIG[loan.status as keyof typeof STATUS_CONFIG]?.label || loan.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          {formatMoney((loan as any).outstandingBalance || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    暂无相关贷款
                  </div>
                )}
              </div>
            </div>
            
            {/* 金额信息 */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-slate-600 mb-4">金额信息</h4>
              <dl className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Field 
                  label="未结余额" 
                  value={formatMoney((caseData as any).outstandingBalance || 0)} 
                  highlight 
                />
                <Field 
                  label="逾期金额" 
                  value={formatMoney((caseData as any).overdueAmount || 0)} 
                />
                <Field 
                  label="逾期天数" 
                  value={`${(caseData as any).overdueDays || 0}天`} 
                />
                <Field 
                  label="贷款金额" 
                  value={formatMoney((caseData as any).loanAmount || 0)} 
                />
              </dl>
            </div>
            
            <Separator />
            
            {/* 其他信息 */}
            <div className="mt-8">
              <dl className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Field label="创建时间" value={new Date(caseData.createdAt).toLocaleString('zh-CN')} />
                <Field label="更新时间" value={new Date(caseData.updatedAt).toLocaleString('zh-CN')} />
                <Field label="创建人" value={caseData.createdBy || '-'} />
              </dl>
            </div>
          </div>
        );
      
      case 'details':
        return (
          <div className="p-6">
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field label="用户ID" value={caseData.userId || '-'} />
              <Field label="贷款单号" value={caseData.loanNo} highlight />
              <Field label="币种" value={caseData.currency || 'CNY'} />
              <Field label="身份证号" value={(caseData as any).idNumber || '-'} />
              <Field label="居住地址" value={(caseData as any).residenceAddress || '-'} />
              <Field label="注册地址" value={(caseData as any).registeredAddress || '-'} />
              <Field label="分配销售" value={caseData.assignedSales || '-'} />
              <Field label="分配风控" value={caseData.assignedRiskControl || '-'} />
              <Field label="分配贷后" value={caseData.assignedPostLoan || '-'} />
              <Field label="到期日" value={(caseData as any).dueDate ? new Date((caseData as any).dueDate).toLocaleDateString('zh-CN') : '-'} />
              <Field label="还款日" value={(caseData as any).repaymentDate ? new Date((caseData as any).repaymentDate).toLocaleDateString('zh-CN') : '-'} />
              <Field label="首次逾期日" value={(caseData as any).firstOverdueTime ? new Date((caseData as any).firstOverdueTime).toLocaleDateString('zh-CN') : '-'} />
              <Field label="展期到期日" value={(caseData as any).extensionDueDate ? new Date((caseData as any).extensionDueDate).toLocaleDateString('zh-CN') : '-'} />
              <Field label="代偿日" value={(caseData as any).compensationDate ? new Date((caseData as any).compensationDate).toLocaleDateString('zh-CN') : '-'} />
              <Field label="备注" value={(caseData as any).notes || '-'} />
            </dl>
          </div>
        );
      
      case 'files':
        return (
          <div className="p-6">
            {/* 所有文件列表 */}
            <h4 className="text-sm font-semibold text-slate-600 mb-4">所有文件</h4>
            
            {/* 从跟进记录中提取所有文件 */}
            {(() => {
              // 收集所有跟进记录中的文件
              const allFiles: CaseFile[] = [];
              if (caseData?.followups) {
                caseData.followups.forEach((followup) => {
                  if (followup.fileInfo && followup.fileInfo.length > 0) {
                    followup.fileInfo.forEach((file) => {
                      const caseFile = typeof file === 'string' 
                        ? { id: `${followup.id}-${file}`, name: file, type: isImageFile(file) ? 'image' : 'document', uploadTime: followup.followTime || followup.createdAt || new Date().toISOString(), uploadBy: followup.follower || '未登记人' }
                        : file;
                      allFiles.push(caseFile);
                    });
                  }
                });
              }
              
              if (allFiles.length > 0) {
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allFiles.map((file: any) => (
                      <div key={file.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium ${
                            file.type === 'image' ? 'bg-green-100 text-green-800' :
                            file.type === 'document' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {file.type === 'image' ? '图' :
                             file.type === 'document' ? '文' : '其'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{file.name}</div>
                            <div className="text-xs text-slate-500">
                              {new Date(file.uploadTime).toLocaleString('zh-CN')} · {file.uploadBy}
                            </div>
                          </div>
                        </div>
                        
                        {file.type === 'image' && (
                          <div className="mt-2">
                            <div className="w-full h-32 bg-slate-200 rounded border border-slate-300 flex items-center justify-center text-slate-400 text-sm">
                              图片预览
                            </div>
                          </div>
                        )}
                        
                        <button
                          onClick={() => toast.info(`正在下载: ${file.name}`)}
                          className="mt-3 w-full px-3 py-1.5 bg-cyan-100 text-cyan-800 rounded text-sm hover:bg-cyan-200"
                        >
                          下载文件
                        </button>
                      </div>
                    ))}
                  </div>
                );
              } else {
                return (
                  <div className="text-center py-12 text-slate-400">
                    暂无文件信息，在跟进记录中上传文件后会显示在这里
                  </div>
                );
              }
            })()}
          </div>
        );
      
      case 'ownership':
        return (
          <div className="p-6">
            {/* 状态标签区域 */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-slate-600 mb-4">案件状态</h4>
              <div className="flex items-center gap-4">
                <Badge className={STATUS_CONFIG[caseData.status as keyof typeof STATUS_CONFIG]?.color || 'bg-gray-100'}>
                  {STATUS_CONFIG[caseData.status as keyof typeof STATUS_CONFIG]?.label || caseData.status}
                </Badge>
                <Badge className={RISK_CONFIG[caseData.riskLevel as keyof typeof RISK_CONFIG]?.color || 'bg-gray-100'}>
                  {RISK_CONFIG[caseData.riskLevel as keyof typeof RISK_CONFIG]?.label || caseData.riskLevel}
                </Badge>
                {caseData.isLocked && (
                  <Badge variant="destructive">已锁定</Badge>
                )}
                {caseData.isExtended && (
                  <Badge className="bg-purple-100 text-purple-800">已展期</Badge>
                )}
              </div>
            </div>
            
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field 
                label="所属销售" 
                value={caseData.assignedSales} 
                highlight 
                action={
                  caseData.assignedSales && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleSendReminder('sales', caseData.assignedSales!)}
                      disabled={sendingReminder === 'sales'}
                    >
                      <Bell className="w-3 h-3 mr-1" />
                      {sendingReminder === 'sales' ? '发送中...' : '提醒跟进'}
                    </Button>
                  )
                }
              />
              <Field 
                label="所属风控" 
                value={caseData.assignedRiskControl} 
                highlight 
                action={
                  caseData.assignedRiskControl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleSendReminder('risk', caseData.assignedRiskControl!)}
                      disabled={sendingReminder === 'risk'}
                    >
                      <Bell className="w-3 h-3 mr-1" />
                      {sendingReminder === 'risk' ? '发送中...' : '提醒跟进'}
                    </Button>
                  )
                }
              />
              <Field 
                label="所属贷后" 
                value={caseData.assignedPostLoan} 
                highlight 
                action={
                  caseData.assignedPostLoan && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleSendReminder('postLoan', caseData.assignedPostLoan!)}
                      disabled={sendingReminder === 'postLoan'}
                    >
                      <Bell className="w-3 h-3 mr-1" />
                      {sendingReminder === 'postLoan' ? '发送中...' : '提醒跟进'}
                    </Button>
                  )
                }
              />
            </dl>
            <Separator className="my-6" />
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field label="创建时间" value={new Date(caseData.createdAt).toLocaleString('zh-CN')} />
              <Field label="更新时间" value={new Date(caseData.updatedAt).toLocaleString('zh-CN')} />
            </dl>
          </div>
        );

      case 'shop':
        return (
          <div className="p-6 space-y-6">
            {/* 一键获取按钮 */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">店铺详情</h3>
                <p className="text-sm text-slate-500 mt-1">点击一键获取店铺运营资料</p>
              </div>
              <Button 
                className="bg-violet-600 hover:bg-violet-700"
                onClick={fetchShopData}
                disabled={shopDataLoading}
              >
                <Download className="w-4 h-4 mr-2" />
                {shopDataLoading ? '获取中...' : '一键获取店铺运营资料'}
              </Button>
            </div>

            {shopData ? (
              <>
                {/* 数据解析和健康评分 */}
                <ShopDataParser data={shopData} />
                
                {/* 可视化图表 */}
                <ShopCharts data={shopData} />
              </>
            ) : (
              <div className="text-center py-12">
                <div className="bg-slate-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                  <Store className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 mt-4">暂无店铺数据</p>
                <p className="text-sm text-slate-400 mt-1">点击上方按钮获取店铺运营资料</p>
              </div>
            )}
          </div>
        );
      
      case 'evaluation':
        return (
          <div className="p-6">
            <CaseEvaluationForm caseId={caseData.id} />
          </div>
        );
      
      case 'legal':
        return (
          <div className="p-6">
            {/* 测试用最简单的文件上传 */}
            <div className="mb-6 p-4 border-2 border-dashed border-blue-500 bg-blue-50 rounded-lg">
              <h3 className="font-bold text-blue-700 mb-2">测试文件上传（原始完整代码 - 从最后面开始注释掉）</h3>
              <input 
                type="file" 
                onChange={(e) => {
                  console.log('原始完整代码 - 文件选择成功:', e.target.files?.[0]?.name);
                  alert('原始完整代码 - 文件选择成功: ' + e.target.files?.[0]?.name);
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
        );
      
      default:
        return null;
    }
  };

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
              <Button variant="outline" className="gap-2" onClick={handleViewHistory}>
                <Eye className="w-4 h-4" />
                查看历史
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={handleEditCase}>
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
                {activeTab === tab.id && (
                  <ChevronDown className="w-4 h-4 inline ml-1" />
                )}
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
                <span className="text-sm text-slate-500">({caseData?.followups?.length || 0}条)</span>
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

            {/* 跟进记录列表 */}
            {caseData?.followups && caseData.followups.length > 0 ? (
              <div className="space-y-3">
                {/* 最新记录排序，最新在最上面，无效日期排底部 */}
                {[...caseData.followups].sort((a, b) => {
                  const getTime = (f: any) => {
                    const t = new Date(f.followTime || f.createdAt || '').getTime();
                    return isNaN(t) ? 0 : t;
                  };
                  return getTime(b) - getTime(a);
                }).map((followup) => (
                  <div key={followup.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    {/* 所有内容都在一行显示 */}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {/* 基本字段 */}
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">跟进人:</span>
                        <span className="font-medium">{followup.follower}</span>
                      </div>
                      <div className="text-slate-300">|</div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">跟进时间:</span>
                        <span className="font-medium">{new Date(followup.followTime).toLocaleString('zh-CN')}</span>
                      </div>
                      <div className="text-slate-300">|</div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">跟进类型:</span>
                        <span className="font-medium">
                          {FOLLOWUP_TYPE_OPTIONS.find(opt => opt.value === followup.followType)?.label}
                        </span>
                      </div>
                      <div className="text-slate-300">|</div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">联系人:</span>
                        <span className="font-medium">
                          {CONTACT_OPTIONS.find(opt => opt.value === followup.contact)?.label}
                        </span>
                      </div>
                      <div className="text-slate-300">|</div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">跟进结果:</span>
                        <span className="font-medium">
                          {FOLLOWUP_RESULT_OPTIONS.find(opt => opt.value === followup.followResult)?.label}
                        </span>
                      </div>
                      
                      {/* 跟进记录（在一行显示，全部显示） */}
                      {followup.followRecord && (
                        <>
                          <div className="text-slate-300">|</div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">记录:</span>
                            <span className="text-slate-800">
                              {followup.followRecord}
                            </span>
                          </div>
                        </>
                      )}
                      
                      {/* 文件信息（在一行显示，图片可点击放大） */}
                      {followup.fileInfo && followup.fileInfo.length > 0 && (
                        <>
                          <div className="text-slate-300">|</div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">文件:</span>
                            <div className="flex gap-1">
                              {followup.fileInfo.map((caseFile) => {
                                // caseFile 现在已经是 CaseFile 类型
                                const file = typeof caseFile === 'string' 
                                  ? { id: Math.random().toString(), name: caseFile, type: isImageFile(caseFile) ? 'image' : 'document', uploadTime: new Date().toISOString(), uploadBy: '未登记人' } as CaseFile
                                  : caseFile;
                                return (
                                  <div key={file.id} className="flex items-center gap-1">
                                    {file.type === 'image' ? (
                                      // 图片类型：显示缩略图，可点击放大
                                      <button
                                        onClick={() => setPreviewImage(file.data || file.url || null)}
                                        className="w-10 h-10 bg-slate-200 rounded border border-slate-300 flex items-center justify-center text-slate-400 text-xs hover:border-blue-400 hover:bg-blue-50 transition-colors overflow-hidden"
                                        title={`点击放大: ${file.name}`}
                                      >
                                        {file.data ? (
                                          <img src={file.data} alt={file.name} className="w-full h-full object-cover" />
                                        ) : (
                                          '图'
                                        )}
                                      </button>
                                    ) : (
                                      // 文件类型：提供下载
                                      <button
                                        onClick={() => {
                                          if (file.data) {
                                            // 有data的话，直接下载
                                            const link = document.createElement('a');
                                            link.href = file.data;
                                            link.download = file.name;
                                            link.click();
                                          } else {
                                            toast.info(`正在下载: ${file.name}`);
                                          }
                                        }}
                                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs hover:bg-blue-200"
                                        title={`下载: ${file.name}`}
                                      >
                                        {file.name.length > 8 ? `${file.name.substring(0, 6)}...` : file.name}
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                暂无跟进记录
              </div>
            )}
          </div>
        </Card>

        {/* 跟进记录对话框 */}
        <Dialog open={showFollowupDialog} onOpenChange={setShowFollowupDialog}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>新增跟进记录</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>跟进人</Label>
                  <Input 
                    value={newFollowup.follower || ''}
                    onChange={(e) => setNewFollowup({...newFollowup, follower: e.target.value})}
                    placeholder="请输入跟进人姓名"
                  />
                </div>
                <div className="space-y-2">
                  <Label>跟进时间</Label>
                  <Input 
                    type="datetime-local"
                    value={newFollowup.followTime ? new Date(newFollowup.followTime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      setNewFollowup({...newFollowup, followTime: date.toISOString()});
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>跟进类型</Label>
                  <Select 
                    value={newFollowup.followType || ''}
                    onValueChange={(val) => setNewFollowup({...newFollowup, followType: val})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FOLLOWUP_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>联系人</Label>
                  <Select 
                    value={newFollowup.contact || ''}
                    onValueChange={(val) => setNewFollowup({...newFollowup, contact: val})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTACT_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>跟进结果</Label>
                  <Select 
                    value={newFollowup.followResult || ''}
                    onValueChange={(val) => setNewFollowup({...newFollowup, followResult: val})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FOLLOWUP_RESULT_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>跟进记录</Label>
                <Textarea 
                  value={newFollowup.followRecord || ''}
                  onChange={(e) => setNewFollowup({...newFollowup, followRecord: e.target.value})}
                  placeholder="请输入跟进记录"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>附件（支持多文件上传）</Label>
                <div className="space-y-2">
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    选择文件
                  </Button>
                
                {uploadedCaseFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-sm text-slate-600">已选择 {uploadedCaseFiles.length} 个文件：</div>
                    <div className="flex flex-wrap gap-2">
                      {uploadedCaseFiles.map((file, index) => (
                        <div key={file.id} className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-sm">
                          <span className="truncate max-w-[150px]">{file.name}</span>
                          <button
                            onClick={() => setUploadedCaseFiles(prev => prev.filter((_, i) => i !== index))}
                            className="text-red-500 hover:text-red-700"
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
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!newFollowup.follower || !newFollowup.followRecord) {
                    toast.error('请填写跟进人和跟进记录');
                    return;
                  }
                  // 先关闭弹窗！
                  setShowFollowupDialog(false);
                  try {
                    const followup: FollowUp = {
                      id: Date.now().toString(),
                      follower: newFollowup.follower || '未登记人',
                      followTime: newFollowup.followTime || new Date().toISOString(),
                      followType: newFollowup.followType as any,
                      contact: newFollowup.contact as any,
                      followResult: newFollowup.followResult as any,
                      followRecord: newFollowup.followRecord || '',
                      fileInfo: uploadedCaseFiles,
                      createdAt: new Date().toISOString(),
                      createdBy: newFollowup.follower || '未登记人',
                    };
                    
                    // 立即更新本地状态，让用户第一时间看到新增的记录
                    if (caseData) {
                      const immediateUpdatedCase: Case = {
                        ...caseData,
                        followups: [...(caseData.followups || []), followup],
                        updatedAt: new Date().toISOString(),
                      };
                      setCaseData(immediateUpdatedCase);
                    }
                    
                    // 使用 followups API 保存（自动同步到同用户ID的所有案件）
                    const followupRes = await fetch(`/api/cases/${caseData?.id}/followups`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        followup,
                        syncToSameUser: true,
                      }),
                    });
                    
                    const followupResult = await followupRes.json();
                    
                    if (!followupResult.success) {
                      toast.error(followupResult.error || '跟进记录添加失败');
                      return;
                    }
                    
                    const syncedCount = followupResult.syncedCount || 0;
                    
                    // 调用后端API同步到飞书Webhook（避免CORS问题）
                    // 时间格式化
                    const formatDateTime = (dateStr: string) => {
                      const date = new Date(dateStr);
                      const year = date.getFullYear();
                      const month = date.getMonth() + 1;
                      const day = date.getDate();
                      const hours = String(date.getHours()).padStart(2, '0');
                      const minutes = String(date.getMinutes()).padStart(2, '0');
                      const seconds = String(date.getSeconds()).padStart(2, '0');
                      return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
                    };
                    
                    // 枚举值转中文
                    const getFollowTypeText = (type: string) => {
                      switch(type) {
                        case 'online': return '线上';
                        case 'offline': return '线下';
                        case 'other': return '其他';
                        default: return type;
                      }
                    };
                    
                    const getContactText = (contact: string) => {
                      switch(contact) {
                        case 'legal_representative': return '法人';
                        case 'actual_controller': return '实控人';
                        case 'other': return '其他';
                        default: return contact;
                      }
                    };
                    
                    const getFollowResultText = (result: string) => {
                      switch(result) {
                        case 'normal_repayment': return '正常还款';
                        case 'warning_rise': return '预警上升';
                        case 'overdue_promise': return '逾期承诺';
                        case 'other': return '其他';
                        default: return result;
                      }
                    };
                    
                    // 文件信息生成短链接
                    const formatFileInfo = (files: any, caseId: string) => {
                      if (!files || files.length === 0) return [];
                      return (files as any[]).map((file: any) => {
                        let fileName = '';
                        let fileType = 'file';
                        
                        if (file.name) {
                          fileName = file.name;
                          fileType = file.type || 'file';
                        } else if (typeof file === 'string') {
                          fileName = file;
                        }
                        
                        // 生成短链接：/api/files/[caseId]/[fileName]
                        const shortUrl = `/api/files/${caseId}/${encodeURIComponent(fileName)}`;
                        
                        return { 
                          name: fileName, 
                          type: fileType,
                          url: shortUrl
                        };
                      });
                    };
                    
                    fetch('/api/webhook/feishu', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        event_type: 'follow_up_created',
                        case_data: {
                          user_id: caseData.userId,
                          loan_number: caseData.loanNo
                        },
                        followup_data: {
                          follower: followup.follower,
                          follow_time: formatDateTime(followup.followTime),
                          follow_type: getFollowTypeText(followup.followType),
                          contact: getContactText(followup.contact),
                          follow_result: getFollowResultText(followup.followResult),
                          follow_record: followup.followRecord,
                          file_info: formatFileInfo(followup.fileInfo, params.id as string)
                        }
                      })
                    }).catch((webhookError) => {
                      console.error('Webhook调用失败:', webhookError);
                      // 不影响主流程，只记录日志
                    });
                    
                    // 同步到飞书多维表格
                    fetch('/api/feishu-bitable/followup', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        followup: followup,
                        caseData: caseData
                      }),
                    }).catch((bitableError) => {
                      console.error('飞书多维表格同步失败:', bitableError);
                      // 不影响主流程，只记录日志
                    });
                    
                    setUploadedCaseFiles([]);
                    toast.success(`跟进记录添加成功，已同步到 ${syncedCount + 1} 个案件`);
                    
                    // 强制重新获取案件数据，确保页面显示最新跟进记录
                    fetchCase(params.id as string);
                  } catch (error) {
                    console.error('保存跟进记录失败:', error);
                    toast.error('跟进记录添加失败');
                  }
                }}
              >
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        

        {/* 记录内容查看弹窗 */}
        <Dialog open={viewFullRecord !== null} onOpenChange={(open) => !open && setViewFullRecord(null)}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>跟进记录详情</DialogTitle>
            </DialogHeader>
            {viewFullRecord && (
              <div className="space-y-4">
                <div className="p-6 bg-slate-50 rounded-lg">
                  <p className="text-slate-800 whitespace-pre-wrap break-words">
                    {viewFullRecord}
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button 
                    variant="secondary"
                    onClick={() => setViewFullRecord(null)}
                  >
                    关闭
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 从这里开始注释掉！ */}
        {/*
        {/* 图片预览弹窗 */}
        {/*
        <Dialog open={previewImage !== null} onOpenChange={(open) => !open && setPreviewImage(null)}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>图片预览</DialogTitle>
            </DialogHeader>
            {previewImage && (
              <div className="flex flex-col items-center">
                <div className="w-full max-h-[60vh] overflow-hidden flex items-center justify-center bg-slate-100 rounded-lg">
                  <img 
                    src={previewImage} 
                    alt="预览图片"
                    className="max-w-full max-h-[60vh] object-contain"
                  />
                </div>
                <div className="mt-4 flex gap-2">
                  <Button 
                    onClick={() => toast.info('正在下载图片')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    下载图片
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => setPreviewImage(null)}
                  >
                    关闭
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* 编辑案件对话框 */}
        {/*
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑案件信息</DialogTitle>
            </DialogHeader>
            {caseData && (
              <div className="space-y-6 py-4">
                {/* 核心信息 */}
                {/*
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">核心信息</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>借款人姓名</Label>
                      <Input 
                        value={editData.borrowerName || ''} 
                        onChange={(e) => setEditData({...editData, borrowerName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>公司名称</Label>
                      <Input 
                        value={editData.companyName || ''} 
                        onChange={(e) => setEditData({...editData, companyName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>联系电话</Label>
                      <Input 
                        value={editData.borrowerPhone || ''} 
                        onChange={(e) => setEditData({...editData, borrowerPhone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>案件状态</Label>
                      <Select 
                        value={editData.status || ''} 
                        onValueChange={(val) => setEditData({...editData, status: val})}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="待分配">待分配</SelectItem>
                          <SelectItem value="待外访">待外访</SelectItem>
                          <SelectItem value="跟进中">跟进中</SelectItem>
                          <SelectItem value="已结案">已结案</SelectItem>
                          <SelectItem value="逾期">逾期</SelectItem>
                          <SelectItem value="正常">正常</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>风险等级</Label>
                      <Select 
                        value={editData.riskLevel || ''} 
                        onValueChange={(val) => setEditData({...editData, riskLevel: val})}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="低风险">低风险</SelectItem>
                          <SelectItem value="中风险">中风险</SelectItem>
                          <SelectItem value="高风险">高风险</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                {/* 金额信息 */}
                {/*
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">金额信息</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>未结余额</Label>
                      <Input 
                        type="number" 
                        value={editData.outstandingBalance || ''} 
                        onChange={(e) => setEditData({...editData, outstandingBalance: Number(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>逾期金额</Label>
                      <Input 
                        type="number" 
                        value={editData.overdueAmount || ''} 
                        onChange={(e) => setEditData({...editData, overdueAmount: Number(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>逾期天数</Label>
                      <Input 
                        type="number" 
                        value={editData.overdueDays || ''} 
                        onChange={(e) => setEditData({...editData, overdueDays: Number(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>贷款金额</Label>
                      <Input 
                        type="number" 
                        value={editData.loanAmount || ''} 
                        onChange={(e) => setEditData({...editData, loanAmount: Number(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                </div>
                
                {/* 信息详情 */}
                {/*
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">信息详情</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>分配销售</Label>
                      <Input 
                        value={editData.assignedSales || ''} 
                        onChange={(e) => setEditData({...editData, assignedSales: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>分配贷后</Label>
                      <Input 
                        value={editData.assignedPostLoan || ''} 
                        onChange={(e) => setEditData({...editData, assignedPostLoan: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>产品名称</Label>
                      <Input 
                        value={editData.productName || ''} 
                        onChange={(e) => setEditData({...editData, productName: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                取消
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* 查看历史对话框 */}
        {/*
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>修改历史记录</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="py-12 text-center text-slate-500">
                  加载中...
                </div>
              ) : caseHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  暂无修改历史
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedHistory.map((record) => (
                    <div key={record.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-slate-900">
                            {record.modifiedBy}
                          </span>
                          <span className="text-sm text-slate-500">
                            {new Date(record.modifiedAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      </div>
                      
                      {record.changes && record.changes.length > 0 && (
                        <div className="space-y-2 mt-3 border-t border-slate-100 pt-3">
                          <h4 className="text-sm font-medium text-slate-700">修改详情：</h4>
                          <div className="space-y-2">
                            {record.changes.map((change: any, idx: number) => (
                              <div key={idx} className="grid grid-cols-12 gap-2 items-center text-sm">
                                <div className="col-span-3 font-medium text-slate-600">
                                  {change.field}
                                </div>
                                <div className="col-span-4 text-slate-500 line-through bg-red-50 px-2 py-1 rounded text-xs">
                                  {change.oldValue}
                                </div>
                                <div className="col-span-1 text-center text-slate-400">→</div>
                                <div className="col-span-4 text-emerald-700 bg-emerald-50 px-2 py-1 rounded text-xs">
                                  {change.newValue}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter className="border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        */}
      </div>
    </div>
  );
}