'use client';

// 案件详情页 - 二分法调试 - 前1000行
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
  // 默认标签设为legal
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
            <div className="mb-6 p-4 border-2 border-dashed border-green-500 bg-green-50 rounded-lg">
              <h3 className="font-bold text-green-700 mb-2">测试文件上传（前1000行代码）</h3>
              <input 
                type="file" 
                onChange={(e) => {
                  console.log('前1000行代码 - 文件选择成功:', e.target.files?.[0]?.name);
                  alert('前1000行代码 - 文件选择成功: ' + e.target.files?.[0]?.name);
                }}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-green-50 file:text-green-700
                  hover:file:bg-green-100"
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