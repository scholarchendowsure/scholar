'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Edit, Eye, ChevronDown, ChevronLeft, ChevronRight, Plus, Upload, Camera, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FOLLOWUP_TYPE_OPTIONS, CONTACT_OPTIONS, FOLLOWUP_RESULT_OPTIONS, FollowUp, CaseFile, isImageFile, isDocumentFile } from '@/types/case';
import { Button } from '@/components/ui/button';

const NAVIGATION_KEY = 'cases-navigation-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Case } from '@/types/case';
import { toast } from 'sonner';

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
  const [activeTab, setActiveTab] = useState<string>('core');
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

  // 发送飞书提醒消息
  const handleSendReminder = async (roleType: string, roleName: string) => {
    if (!caseData || !roleName) {
      toast.error('缺少必要信息');
      return;
    }

    setSendingReminder(roleType);
    try {
      // 1. 先从已保存用户列表中查找
      let openId: string | null = null;
      
      try {
        const usersRes = await fetch('/api/feishu-users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          const userList = usersData.data || usersData.users || usersData;
          if (userList && Array.isArray(userList)) {
            const foundUser = userList.find((u: any) => u.name === roleName);
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
      const followLink = `${window.location.origin}/followup/${caseData.loanNo}`;
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
      
      const message = `【案件跟进提醒】
${roleName}，辛苦留意：用户 ${caseData.userId} 有 ${Number(balance).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}${currencySymbol} 待还款，还款日为 ${dueDate}，请及时跟进处理。点击下方链接即可完成登记：${followLink}`;

      // 4. 发送消息
      const sendResponse = await fetch('/api/feishu-personal/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openId: openId,
          message: message
        })
      });

      const sendResult = await sendResponse.json();

      if (sendResult.success) {
        toast.success(`已发送提醒给 ${roleName}`);
      } else {
        toast.error(sendResult.error || '发送失败');
      }

    } catch (error) {
      console.error('发送提醒失败:', error);
      toast.error(error instanceof Error ? error.message : '发送提醒失败');
    } finally {
      setSendingReminder(null);
    }
  };
  
  // 文件上传处理
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          const caseFile: CaseFile = {
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: isImageFile(file.name) ? 'image' : 
                  isDocumentFile(file.name) ? 'document' : 'other',
            data: result,
            uploadTime: new Date().toISOString(),
            uploadBy: '未登记人',
          };
          
          setUploadedCaseFiles(prev => [...prev, caseFile]);
        };
        reader.readAsDataURL(file);
      });
      
      toast.success(`已选择 ${files.length} 个文件`);
    }
  };
  
  const handleCameraUpload = () => {
    toast.info('拍照功能正在开发中');
  };
  
  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
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

  const fetchCase = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cases/${id}`);
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

  const tabs = [
    { id: 'core', label: '核心信息', color: 'bg-blue-600 text-white' },
    { id: 'finance', label: '金额信息', color: 'bg-amber-500 text-white' },
    { id: 'timeline', label: '贷款记录', color: 'bg-emerald-600 text-white' },
    { id: 'borrower', label: '信息详情', color: 'bg-slate-600 text-white' },
    { id: 'repayment', label: '还款记录', color: 'bg-rose-600 text-white' },
    { id: 'files', label: '文件信息', color: 'bg-cyan-600 text-white' },
    { id: 'ownership', label: '案件标签', color: 'bg-purple-600 text-white' },
  ];

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
              <Field label="资金方" value={caseData.funder || '-'} />
              <Field label="支付公司" value={caseData.paymentCompany || '-'} />
              <Field label="逾期天数" value={
                <span className={(caseData.overdueDays || 0) > 90 ? 'text-red-600 font-semibold' : (caseData.overdueDays || 0) > 0 ? 'text-orange-600' : ''}>
                  {caseData.overdueDays || 0}天
                </span>
              } highlight />
              <Field label="产品名称" value={caseData.productName || '-'} />
              <Field label="所属销售" value={caseData.assignedSales || '-'} highlight />
              <Field label="所属贷后" value={caseData.assignedPostLoan || '-'} highlight />
              <Field label="风险等级" value={caseData.riskLevel || '-'} highlight />
              <Field label="贷款期限" value={caseData.loanTerm ? `${caseData.loanTerm}${caseData.loanTermUnit || ''}` : '-'} />
              <Field label="贷款期限单位" value={caseData.loanTermUnit || '-'} />
              <Field label="贷款日期" value={caseData.loanDate ? new Date(caseData.loanDate).toLocaleDateString('zh-CN') : '-'} />
              <Field label="到期日" value={caseData.dueDate ? new Date(caseData.dueDate).toLocaleDateString('zh-CN') : '-'} />
              <Field label="逾期开始时间" value={caseData.overdueStartTime ? new Date(caseData.overdueStartTime).toLocaleString('zh-CN') : '-'} />
              <Field label="首次逾期时间" value={caseData.firstOverdueTime ? new Date(caseData.firstOverdueTime).toLocaleString('zh-CN') : '-'} />
              <Field label="代偿日期" value={caseData.compensationDate ? new Date(caseData.compensationDate).toLocaleDateString('zh-CN') : '-'} />
            </dl>
          </div>
        );
      
      case 'finance':
        // 计算金额统计
        const stats = relatedLoans.reduce((acc, loan) => {
          const key = `${loan.funder || '-'}-${loan.currency || '-'}`;
          if (!acc[key]) {
            acc[key] = {
              funder: loan.funder || '-',
              currency: loan.currency || '-',
              loanCount: 0,
              totalLoanAmount: 0,
              totalOutstandingBalance: 0,
              totalOverdueAmount: 0,
              totalRepaidAmount: 0,
              totalCompensationAmount: 0
            };
          }
          acc[key].loanCount++;
          acc[key].totalLoanAmount += loan.totalLoanAmount || 0;
          acc[key].totalOutstandingBalance += loan.totalOutstandingBalance || 0;
          acc[key].totalOverdueAmount += loan.overdueAmount || 0;
          acc[key].totalRepaidAmount += loan.totalRepaidAmount || 0;
          acc[key].totalCompensationAmount += loan.compensationAmount || 0;
          return acc;
        }, {} as Record<string, any>);
        
        const statsList = Object.values(stats);
        
        return (
          <div className="p-6">
            {/* 原有的金额信息字段 */}
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Field label="币种" value={caseData.currency || '-'} />
              <Field label="贷款金额" value={formatMoney(caseData.loanAmount || 0)} highlight />
              <Field label="总贷款金额" value={formatMoney(caseData.totalLoanAmount || 0)} highlight />
              <Field label="总在贷余额" value={formatMoney(caseData.totalOutstandingBalance)} highlight />
              <Field label="已还款总额" value={formatMoney(caseData.totalRepaidAmount || 0)} />
              <Field label="在贷余额" value={formatMoney(caseData.outstandingBalance || 0)} highlight />
              <Field label="逾期金额" value={
                <span className={(caseData.overdueAmount || 0) > 0 ? 'text-red-600 font-semibold' : ''}>
                  {formatMoney(caseData.overdueAmount || 0)}
                </span>
              } highlight />
              <Field label="逾期本金" value={formatMoney(caseData.overduePrincipal || 0)} />
              <Field label="逾期利息" value={formatMoney(caseData.overdueInterest || 0)} />
              <Field label="已还金额" value={formatMoney(caseData.repaidAmount || 0)} />
              <Field label="已还本金" value={formatMoney(caseData.repaidPrincipal || 0)} />
              <Field label="已还利息" value={formatMoney(caseData.repaidInterest || 0)} />
              <Field label="代偿总额" value={formatMoney(caseData.compensationAmount || 0)} />
            </dl>
            
            {/* 金额统计表 */}
            <Separator className="mb-8" />
            <div className="mb-4 flex items-center gap-3">
              <div className="w-1 h-6 bg-amber-500 rounded"></div>
              <h3 className="text-lg font-bold text-slate-900">金额统计</h3>
              <span className="text-sm text-slate-500">
                ({statsList.length}组)
              </span>
            </div>
            
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr className="text-left text-sm font-medium text-slate-600">
                    <th className="px-4 py-3">贷款单号数量</th>
                    <th className="px-4 py-3">资金方</th>
                    <th className="px-4 py-3">币种</th>
                    <th className="px-4 py-3">总贷款金额</th>
                    <th className="px-4 py-3">总在贷金额</th>
                    <th className="px-4 py-3">总逾期金额</th>
                    <th className="px-4 py-3">总已还金额</th>
                    <th className="px-4 py-3">总代偿金额</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {statsList.map((stat, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                        {stat.loanCount}条
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {stat.funder}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {stat.currency}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 font-mono">
                        {formatMoney(stat.totalLoanAmount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-600 font-semibold font-mono">
                        {formatMoney(stat.totalOutstandingBalance)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={stat.totalOverdueAmount > 0 ? 'text-red-600 font-semibold' : 'text-slate-700'}>
                          {formatMoney(stat.totalOverdueAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 font-mono">
                        {formatMoney(stat.totalRepaidAmount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 font-mono">
                        {formatMoney(stat.totalCompensationAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {statsList.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  暂无金额统计数据
                </div>
              )}
            </div>
          </div>
        );
      
      case 'timeline':
        return (
          <div className="p-0">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-red-500 rounded"></div>
                <h3 className="text-lg font-bold text-slate-900">相关贷款记录</h3>
                <span className="text-sm text-slate-500">
                  ({relatedLoans.length}条)
                </span>
              </div>
            </div>
            
            {relatedLoansLoading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                <p className="mt-2 text-slate-500">加载中...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-sm font-medium text-slate-600">
                      <th className="px-6 py-4">贷款编号</th>
                      <th className="px-6 py-4">用户ID</th>
                      <th className="px-6 py-4">资金方</th>
                      <th className="px-6 py-4">产品名称</th>
                      <th className="px-6 py-4">借款人姓名</th>
                      <th className="px-6 py-4">逾期金额</th>
                      <th className="px-6 py-4">币种</th>
                      <th className="px-6 py-4">逾期天数</th>
                      <th className="px-6 py-4">所属贷后</th>
                      <th className="px-6 py-4">所属销售</th>
                      <th className="px-6 py-4 text-red-600 font-bold">在贷金额</th>
                      <th className="px-6 py-4">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {relatedLoans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-900 font-mono">{loan.loanNo}</td>
                        <td className="px-6 py-4 text-sm text-slate-900">{loan.userId}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{loan.funder || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{loan.productName || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-900">{loan.borrowerName}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={loan.overdueAmount > 0 ? 'text-red-600 font-semibold' : 'text-slate-700'}>
                            {formatMoney(loan.overdueAmount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{loan.currency || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={loan.overdueDays > 0 ? 'text-orange-600' : 'text-slate-700'}>
                            {loan.overdueDays}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{loan.assignedPostLoan || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{loan.assignedSales || '-'}</td>
                        <td className="px-6 py-4 text-sm text-red-600 font-bold">
                          {formatMoney(loan.outstandingBalance || 0)}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              // 保存导航状态
                              const allCaseIds = relatedLoans.map(c => c.id);
                              const currentIndex = allCaseIds.indexOf(loan.id);
                              if (typeof window !== 'undefined') {
                                sessionStorage.setItem(NAVIGATION_KEY, JSON.stringify({
                                  caseIds: allCaseIds,
                                  currentIndex,
                                }));
                              }
                              router.push(`/cases/${loan.id}`);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            查看详情
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {relatedLoans.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    暂无相关贷款记录
                  </div>
                )}
              </div>
            )}
          </div>
        );
      
      case 'borrower':
        return (
          <div className="p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Field label="公司名称" value={caseData.companyName} />
              <Field label="公司地址" value={caseData.companyAddress} />
              <Field label="家庭地址" value={caseData.homeAddress} />
              <Field label="户籍地址" value={caseData.householdAddress} />
              <Field label="借款人手机号" value={caseData.borrowerPhone} highlight />
              <Field label="注册手机号" value={caseData.registeredPhone} />
              <Field label="联系方式" value={caseData.contactInfo} />
            </dl>
          </div>
        );
      
      case 'repayment':
        return (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 bg-rose-500 rounded"></div>
              <h3 className="text-lg font-bold text-slate-900">还款记录</h3>
              <span className="text-sm text-slate-500">(暂无记录)</span>
            </div>
            <div className="text-center py-12 text-slate-400">
              暂无还款记录
            </div>
          </div>
        );
      
      case 'files':
        const files = caseData?.files || [];
        return (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 bg-cyan-500 rounded"></div>
              <h3 className="text-lg font-bold text-slate-900">文件信息</h3>
              {files.length > 0 && (
                <span className="text-sm text-slate-500">({files.length} 个文件)</span>
              )}
            </div>
            
            {files.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map((file) => (
                  <div key={file.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="flex items-center gap-2 mb-2">
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
            ) : (
              <div className="text-center py-12 text-slate-400">
                暂无文件信息，在跟进记录中上传文件后会显示在这里
              </div>
            )}
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

            {/* 跟进记录列表 */}
            {caseData?.followups && caseData.followups.length > 0 ? (
              <div className="space-y-3">
                {/* 最新记录排序，最新在最上面 */}
                {[...caseData.followups].sort((a, b) => 
                  new Date(b.followTime || b.createdAt || '').getTime() - 
                  new Date(a.followTime || a.createdAt || '').getTime()
                ).map((followup) => (
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
                暂无跟进记录，点击"新增跟进记录"添加第一条记录
              </div>
            )}
          </div>
        </Card>

        {/* 新增跟进记录对话框 */}
        <Dialog open={showFollowupDialog} onOpenChange={setShowFollowupDialog}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>新增跟进记录</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>跟进人</Label>
                <Input 
                  value={newFollowup.follower || ''}
                  onChange={(e) => setNewFollowup({ ...newFollowup, follower: e.target.value })}
                  placeholder="请输入跟进人"
                />
              </div>
              <div className="space-y-2">
                <Label>跟进时间</Label>
                <Input 
                  value={newFollowup.followTime ? new Date(newFollowup.followTime).toLocaleString('zh-CN') : new Date().toLocaleString('zh-CN')}
                  disabled
                  className="bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label>跟进类型</Label>
                <Select 
                  value={newFollowup.followType} 
                  onValueChange={(value: any) => setNewFollowup({ ...newFollowup, followType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择跟进类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLLOWUP_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>联系人</Label>
                <Select 
                  value={newFollowup.contact} 
                  onValueChange={(value: any) => setNewFollowup({ ...newFollowup, contact: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择联系人" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>跟进结果</Label>
                <Select 
                  value={newFollowup.followResult} 
                  onValueChange={(value: any) => setNewFollowup({ ...newFollowup, followResult: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择跟进结果" />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLLOWUP_RESULT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>跟进记录</Label>
                <Textarea 
                  value={newFollowup.followRecord || ''}
                  onChange={(e) => setNewFollowup({ ...newFollowup, followRecord: e.target.value })}
                  placeholder="请输入跟进记录内容"
                  rows={6}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>文件信息</Label>
                <div className="flex gap-2">
                  <input 
                    type="file" 
                    id="file-upload" 
                    multiple 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                  <Button variant="outline" type="button" onClick={() => document.getElementById('file-upload')?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    选择文件上传
                  </Button>
                  <Button variant="outline" type="button" onClick={handleCameraUpload}>
                    <Camera className="w-4 h-4 mr-2" />
                    拍照上传
                  </Button>
                </div>
                {uploadedCaseFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {uploadedCaseFiles.map((file, idx) => (
                      <div key={file.id} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2">
                        {file.name}
                        <button 
                          onClick={() => setUploadedCaseFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFollowupDialog(false)}>
                取消
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={async () => {
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
                    
                    // 同步保存文件信息到案件中
                    const currentFiles = caseData?.files || [];
                    const newFiles: CaseFile[] = uploadedCaseFiles.map(file => ({
                      ...file,
                      id: file.id || `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    }));
                    
                    // 获取所有相同用户ID的案件
                    const userId = caseData?.userId;
                    let relatedCases: Case[] = [];
                    if (userId) {
                      const relatedRes = await fetch(`/api/cases/user/${userId}`);
                      const relatedJson = await relatedRes.json();
                      if (relatedJson.success) {
                        relatedCases = relatedJson.data;
                      }
                    }
                    
                    // 对每个相同用户ID的案件都添加跟进记录，并行处理提高速度
                    const updatePromises = relatedCases.map(async (relatedCase) => {
                      const updatedCase: Case = {
                        ...relatedCase,
                        followups: [...(relatedCase.followups || []), followup],
                        files: [...(relatedCase.files || []), ...newFiles],
                        updatedAt: new Date().toISOString(),
                      };
                      
                      const res = await fetch(`/api/cases/${relatedCase.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedCase),
                      });
                      
                      if (res.ok && relatedCase.id === params.id) {
                        // 如果是当前案件，更新本地状态
                        setCaseData(updatedCase);
                      }
                      
                      return res.ok;
                    });
                    
                    const results = await Promise.all(updatePromises);
                    const updatedCount = results.filter(Boolean).length;
                    
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
                    
                    setUploadedCaseFiles([]);
                    toast.success(`跟进记录添加成功，已同步到 ${updatedCount + 1} 个案件`);
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
        
        {/* 图片预览弹窗 */}
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
      </div>
    </div>
  );
}
