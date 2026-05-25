'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, RefreshCw, Upload, Camera, ArrowLeft, Store, Download, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Case, FollowUp } from '@/types/case';
import { formatCurrency } from '@/lib/utils';
import { ShopDataParser } from '@/components/shop/shop-data-parser';
import { ShopCharts } from '@/components/shop/shop-charts';
import LegalLitigationTab from '@/components/legal-litigation-tab';

// 检查是否为图片文件
function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext || '');
}

// 跟进类型选项
const FOLLOWUP_TYPE_OPTIONS = [
  { label: '线上', value: 'online' },
  { label: '线下', value: 'offline' },
  { label: '其他', value: 'other' },
  { label: '未跟进', value: 'pending' }
];

// 联系人选项
const CONTACT_OPTIONS = [
  { label: '法人', value: 'legal_representative' },
  { label: '实控人', value: 'actual_controller' },
  { label: '其他', value: 'other' }
];

// 跟进结果选项
const FOLLOWUP_RESULT_OPTIONS = [
  { label: '正常还款', value: 'normal_repayment' },
  { label: '预警上升', value: 'warning_rise' },
  { label: '逾期承诺', value: 'overdue_promise' },
  { label: '其他', value: 'other' }
];

// 状态配置
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_assign: { label: '待分配', color: 'bg-yellow-100 text-yellow-800' },
  pending_visit: { label: '待外访', color: 'bg-blue-100 text-blue-800' },
  following: { label: '跟进中', color: 'bg-indigo-100 text-indigo-800' },
  closed: { label: '已结案', color: 'bg-green-100 text-green-800' }
};

// 风险等级配置
const RISK_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: '高风险', color: 'bg-red-100 text-red-800' },
  medium: { label: '中风险', color: 'bg-orange-100 text-orange-800' },
  low: { label: '低风险', color: 'bg-green-100 text-green-800' },
  normal: { label: '正常', color: 'bg-green-100 text-green-800' }
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

// Field组件
const Field = ({ label, value, highlight, action }: { label: string; value: any; highlight?: boolean; action?: React.ReactNode }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <Label className="text-sm font-medium text-slate-600">{label}</Label>
      {action}
    </div>
    <div className={`text-sm ${highlight ? 'font-semibold text-slate-900' : 'text-slate-700'} bg-slate-50 px-3 py-2 rounded-lg border border-slate-200`}>
      {value ?? '-'}
    </div>
  </div>
);

export default function SharedCasePage() {
  const params = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('core');
  
  // 相关贷款记录相关状态
  const [relatedLoans, setRelatedLoans] = useState<Case[]>([]);
  const [relatedLoansLoading, setRelatedLoansLoading] = useState(false);
  
  // 店铺详情相关状态
  const [shopData, setShopData] = useState<any>(null);
  const [shopDataLoading, setShopDataLoading] = useState(false);
  
  const [showFollowupDialog, setShowFollowupDialog] = useState(false);
  const [newFollowup, setNewFollowup] = useState<Partial<FollowUp>>({
    follower: '免登录用户',
    followType: 'online',
    contact: 'legal_representative',
    followResult: 'normal_repayment',
    followRecord: '',
    fileInfo: [],
    followTime: new Date().toISOString(),
  });
  const [uploadingFiles, setUploadingFiles] = useState<{ [key: string]: string }>({});
  const [uploadedCaseFiles, setUploadedCaseFiles] = useState<any[]>([]);
  const [viewFullRecord, setViewFullRecord] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 标签页定义
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

  // 获取案件数据
  const fetchCase = async () => {
    try {
      const res = await fetch(`/api/cases/${params.id}?includeFiles=true`);
      const json = await res.json();
      if (json.success) {
        setCaseData(json.data);
      } else {
        toast.error(json.error || '获取案件失败');
      }
    } catch (e) {
      toast.error('获取案件失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取相关贷款记录
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

  // 加载已保存的店铺数据
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

  // 一键获取店铺运营资料
  const fetchShopData = async () => {
    if (!caseData?.loanNo) {
      toast.error('缺少贷款单号');
      return;
    }
    
    setShopDataLoading(true);
    try {
      const res = await fetch('/api/complex-loan-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanCode: caseData.loanNo })
      });
      
      const json = await res.json();
      
      if (json.success) {
        const allRecords = json.data?.step3?.allRecords || [];
        if (allRecords.length > 0) {
          const sortedRecords = [...allRecords].sort((a: any, b: any) => {
            return new Date(b.update_time).getTime() - new Date(a.update_time).getTime();
          });
          
          const latestRecord = sortedRecords[0];
          if (latestRecord?.latest_dataset) {
            try {
              const parsedData = typeof latestRecord.latest_dataset === 'string' 
                ? JSON.parse(latestRecord.latest_dataset)
                : latestRecord.latest_dataset;
              
              setShopData(parsedData);
              
              // 保存到数据库
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
              } catch (saveError) {
                console.error('保存店铺数据失败:', saveError);
              }
              
              toast.success('获取店铺数据成功');
            } catch (parseError) {
              console.error('解析店铺数据失败:', parseError);
              toast.error('解析店铺数据失败');
            }
          } else {
            toast.error('暂无店铺数据');
          }
        } else {
          toast.error('暂无店铺数据');
        }
      } else {
        toast.error(json.error || '获取店铺数据失败');
      }
    } catch (error) {
      console.error('获取店铺数据失败:', error);
      toast.error('获取店铺数据失败');
    } finally {
      setShopDataLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchCase();
    }
  }, [params.id]);

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

  // 监听对话框打开，清空上传文件
  useEffect(() => {
    if (showFollowupDialog) {
      setUploadedCaseFiles([]);
    }
  }, [showFollowupDialog]);

  // 文件上传处理
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        const fileName = file.name;
        const isImage = file.type.startsWith('image/');
        
        setUploadedCaseFiles(prev => [...prev, {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: fileName,
          type: isImage ? 'image' : 'document',
          uploadTime: new Date().toISOString(),
          uploadBy: '免登录用户',
          data: base64Data
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  // 拍照上传处理
  const handleCameraUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e: any) => {
      handleFileUpload(e);
    };
    input.click();
  };

  // 添加跟进记录
  const handleAddFollowup = async () => {
    if (!caseData) return;
    
    if (!newFollowup.followRecord?.trim()) {
      toast.error('请填写跟进记录内容');
      return;
    }

    setShowFollowupDialog(false);
    try {
      const followup: FollowUp = {
        id: Date.now().toString(),
        follower: newFollowup.follower || '免登录用户',
        followTime: newFollowup.followTime || new Date().toISOString(),
        followType: newFollowup.followType as any,
        contact: newFollowup.contact as any,
        followResult: newFollowup.followResult as any,
        followRecord: newFollowup.followRecord || '',
        fileInfo: uploadedCaseFiles,
        createdAt: new Date().toISOString(),
        createdBy: newFollowup.follower || '免登录用户',
      };
      
      // 立即更新本地状态
      if (caseData) {
        const immediateUpdatedCase: Case = {
          ...caseData,
          followups: [...(caseData.followups || []), followup],
          updatedAt: new Date().toISOString(),
        };
        setCaseData(immediateUpdatedCase);
      }
      
      // 使用 followups API 保存
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
      
      toast.success('跟进记录添加成功');
      
      // 重置状态
      setNewFollowup({
        followType: 'online',
        contact: 'legal_representative',
        followResult: 'normal_repayment',
        followRecord: '',
        fileInfo: [],
        followTime: new Date().toISOString(),
      });
      setUploadedCaseFiles([]);
      
      // 重新获取案件数据以确保同步
      await fetchCase();
      
    } catch (e) {
      console.error('添加跟进记录失败:', e);
      toast.error('添加跟进记录失败');
    }
  };

  // 渲染标签页内容
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
              <Field label="在贷金额" value={formatCurrency(caseData.outstandingBalance || 0)} highlight />
              <Field label="逾期金额" value={
                <span className={(caseData.overdueAmount || 0) > 0 ? 'text-red-600 font-semibold' : ''}>
                  {formatCurrency(caseData.overdueAmount || 0)}
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
        return (
          <div className="p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Field label="币种" value={caseData.currency || '-'} />
              <Field label="贷款金额" value={formatCurrency(caseData.loanAmount || 0)} highlight />
              <Field label="总贷款金额" value={formatCurrency(caseData.totalLoanAmount || 0)} highlight />
              <Field label="总在贷余额" value={formatCurrency(caseData.totalOutstandingBalance)} highlight />
              <Field label="已还款总额" value={formatCurrency(caseData.totalRepaidAmount || 0)} />
              <Field label="在贷余额" value={formatCurrency(caseData.outstandingBalance || 0)} highlight />
              <Field label="逾期金额" value={
                <span className={(caseData.overdueAmount || 0) > 0 ? 'text-red-600 font-semibold' : ''}>
                  {formatCurrency(caseData.overdueAmount || 0)}
                </span>
              } highlight />
              <Field label="逾期本金" value={formatCurrency(caseData.overduePrincipal || 0)} />
              <Field label="逾期利息" value={formatCurrency(caseData.overdueInterest || 0)} />
              <Field label="已还金额" value={formatCurrency(caseData.repaidAmount || 0)} />
              <Field label="已还本金" value={formatCurrency(caseData.repaidPrincipal || 0)} />
              <Field label="已还利息" value={formatCurrency(caseData.repaidInterest || 0)} />
              <Field label="代偿总额" value={formatCurrency(caseData.compensationAmount || 0)} />
            </dl>
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
              />
              <Field 
                label="所属风控" 
                value={caseData.assignedRiskControl} 
                highlight 
              />
              <Field 
                label="所属贷后" 
                value={caseData.assignedPostLoan} 
                highlight 
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
      
      case 'legal':
        return (
          <div className="p-6">
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
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">案件详情 - {caseData.loanNo}</h1>
              <p className="text-sm text-slate-500 mt-1">免登录查看</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => {
                  setNewFollowup({
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
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
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
          
          {/* 标签内容 */}
          {renderTabContent()}
        </Card>

        {/* 跟进记录卡片 */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                跟进记录
                {caseData?.followups && (
                  <span className="text-sm font-normal text-slate-500">
                    ({caseData.followups.length}条)
                  </span>
                )}
              </h2>
              <Button 
                onClick={() => {
                  setNewFollowup({
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
                        <Badge variant="outline">{
                          FOLLOWUP_TYPE_OPTIONS.find(o => o.value === followup.followType)?.label || followup.followType
                        }</Badge>
                      </div>
                      <div className="text-slate-300">|</div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">联系人:</span>
                        <span>{
                          CONTACT_OPTIONS.find(o => o.value === followup.contact)?.label || followup.contact
                        }</span>
                      </div>
                      <div className="text-slate-300">|</div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">跟进结果:</span>
                        <Badge variant="outline">{
                          FOLLOWUP_RESULT_OPTIONS.find(o => o.value === followup.followResult)?.label || followup.followResult
                        }</Badge>
                      </div>
                      
                      {/* 记录内容，支持展开查看完整内容 */}
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <div className="text-slate-500">记录:</div>
                        {viewFullRecord === followup.id ? (
                          <div className="flex-1 min-w-0">
                            <div className="text-slate-800 bg-white p-3 rounded border whitespace-pre-wrap break-words">
                              {followup.followRecord}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs mt-1"
                              onClick={() => setViewFullRecord(null)}
                            >
                              收起
                            </Button>
                          </div>
                        ) : (
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className="text-slate-800 truncate">
                              {followup.followRecord}
                            </span>
                            {(followup.followRecord?.length || 0) > 50 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs shrink-0"
                                onClick={() => setViewFullRecord(followup.id)}
                              >
                                展开
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      
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
                                  ? { id: Math.random().toString(), name: caseFile, type: isImageFile(caseFile) ? 'image' : 'document', uploadTime: new Date().toISOString(), uploadBy: '未登记人', data: undefined, url: undefined } as const
                                  : caseFile;
                                return (
                                  <div key={file.id} className="flex items-center gap-1">
                                    {file.type === 'image' ? (
                                      // 图片类型：直接显示预览图，可点击放大
                                      <button
                                        onClick={() => setPreviewImage((file as any).data || (file as any).url || null)}
                                        className="max-w-xs max-h-48 bg-slate-100 rounded border border-slate-300 flex items-center justify-center text-slate-400 hover:border-blue-400 hover:bg-blue-50 transition-colors overflow-hidden"
                                        title={`点击放大: ${file.name}`}
                                      >
                                        {(file as any).data || (file as any).url ? (
                                          <img src={(file as any).data || (file as any).url} alt={file.name} className="max-w-full max-h-full object-contain" />
                                        ) : (
                                          '图片'
                                        )}
                                      </button>
                                    ) : (
                                      // 文件类型：提供下载
                                      <button
                                        onClick={() => {
                                          if ((file as any).data) {
                                            // 有data的话，直接下载
                                            const link = document.createElement('a');
                                            link.href = (file as any).data;
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
              <div className="space-y-2">
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
                    id="shared-file-upload" 
                    multiple 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                  <Button variant="outline" type="button" onClick={() => document.getElementById('shared-file-upload')?.click()}>
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
              <Button onClick={handleAddFollowup}>
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 图片预览对话框 */}
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>图片预览</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center items-center p-4">
              {previewImage && (
                <img 
                  src={previewImage} 
                  alt="预览图片" 
                  className="max-w-full max-h-[70vh] object-contain"
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewImage(null)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
