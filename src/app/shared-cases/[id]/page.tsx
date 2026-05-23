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
import { Plus, RefreshCw, Upload, Camera, ArrowLeft, Store, Download, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Case, FollowUp } from '@/types/case';
import { formatCurrency } from '@/lib/utils';

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
  // 枚举值转中文
  const getFollowTypeText = (type: string) => {
    switch(type) {
      case 'online': return '线上';
      case 'offline': return '线下';
      case 'other': return '其他';
      case 'pending': return '未跟进';
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

  const params = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('core');
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

  useEffect(() => {
    if (params.id) {
      fetchCase();
    }
  }, [params.id]);

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
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 bg-red-500 rounded"></div>
              <h3 className="text-lg font-bold text-slate-900">相关贷款记录</h3>
            </div>
            <div className="text-center py-12 text-slate-400">
              暂无相关贷款记录
            </div>
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">店铺详情</h3>
                <p className="text-sm text-slate-500 mt-1">暂无店铺数据</p>
              </div>
            </div>
            
            <div className="text-center py-12">
              <div className="bg-slate-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <Store className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 mt-4">暂无店铺数据</p>
            </div>
          </div>
        );
      
      case 'legal':
        return (
          <div className="p-6">
            <div className="text-center py-12 text-slate-400">
              暂无法律诉讼信息
            </div>
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

      {/* 标签页导航 */}
      <div className="bg-white border-b border-slate-200 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-1 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? tab.color
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Card className="shadow-lg">
          {renderTabContent()}
        </Card>

        {/* 跟进记录列表 */}
        <Card className="shadow-lg mt-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-indigo-500 rounded"></div>
                <h3 className="text-lg font-bold text-slate-900">跟进记录</h3>
                <span className="text-sm text-slate-500">
                  ({(caseData.followups || []).length}条)
                </span>
              </div>
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

            {(caseData.followups || []).length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-2xl">暂无跟进记录，点击"新增跟进记录"添加第一条记录</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(caseData.followups || [])
                  .sort((a, b) => {
                    const timeA = a.followTime ? new Date(a.followTime).getTime() : 0;
                    const timeB = b.followTime ? new Date(b.followTime).getTime() : 0;
                    return timeB - timeA;
                  })
                  .map((followup, index) => (
                  <div key={followup.id || index} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">跟进人:</span>
                        <span className="font-medium text-slate-900">{followup.follower || '-'} </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-500">跟进时间:</span>
                        <span className="font-medium text-slate-900">
                          {followup.followTime ? new Date(followup.followTime).toLocaleString('zh-CN') : '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-500">跟进类型:</span>
                        <Badge variant="secondary">{getFollowTypeText(followup.followType || '-')}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-500">联系人:</span>
                        <span className="font-medium text-slate-900">{getContactText(followup.contact || '-')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-500">跟进结果:</span>
                        <Badge>{getFollowResultText(followup.followResult || '-')}</Badge>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="text-slate-600 mb-1">记录:</div>
                      <div className="bg-white p-3 rounded border border-slate-200">
                        <p className="text-slate-900 whitespace-pre-wrap">
                          {viewFullRecord === followup.id ? (
                            followup.followRecord
                          ) : (
                            <>
                              {(followup.followRecord || '').length > 200 ? (
                                <>
                                  {(followup.followRecord || '').substring(0, 200)}...
                                  <button
                                    onClick={() => setViewFullRecord(followup.id)}
                                    className="text-blue-600 hover:underline ml-1"
                                  >
                                    查看全部
                                  </button>
                                </>
                              ) : (
                                followup.followRecord
                              )}
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* 显示文件信息 */}
                    {followup.fileInfo && followup.fileInfo.length > 0 && (
                      <div>
                        <div className="text-slate-600 mb-2">文件: {followup.fileInfo.length}个</div>
                        <div className="flex flex-wrap gap-2">
                          {followup.fileInfo.map((file: any, fileIndex: number) => (
                            <div key={fileIndex} className="flex items-center gap-1">
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
                                      toast.info('文件下载中...');
                                    }
                                  }}
                                  className="w-10 h-10 bg-blue-100 text-blue-800 rounded border border-blue-200 flex items-center justify-center text-xs hover:bg-blue-200 transition-colors"
                                  title={`下载: ${file.name}`}
                                >
                                  文
                                </button>
                              )}
                              <span className="text-xs text-slate-500 max-w-[100px] truncate" title={file.name}>
                                {file.name}
                              </span>
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
        </Card>
      </div>

      {/* 新增跟进记录对话框 */}
      <Dialog open={showFollowupDialog} onOpenChange={setShowFollowupDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新增跟进记录</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>跟进人</Label>
                <Input 
                  value={newFollowup.follower || '免登录用户'} 
                  disabled
                />
              </div>
              
              <div className="space-y-2">
                <Label>跟进时间</Label>
                <Input 
                  value={newFollowup.followTime ? new Date(newFollowup.followTime).toLocaleString('zh-CN') : new Date().toLocaleString('zh-CN')} 
                  disabled
                />
              </div>
            </div>
            
              <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>跟进类型</Label>
                <Select 
                  value={newFollowup.followType as any || 'online'} 
                  onValueChange={(value) => setNewFollowup({...newFollowup, followType: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择跟进类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLLOWUP_TYPE_OPTIONS.map((opt) => (
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
                  value={newFollowup.contact as any || 'legal_representative'} 
                  onValueChange={(value) => setNewFollowup({...newFollowup, contact: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择联系人" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_OPTIONS.map((opt) => (
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
                  value={newFollowup.followResult as any || 'normal_repayment'} 
                  onValueChange={(value) => setNewFollowup({...newFollowup, followResult: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择跟进结果" />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLLOWUP_RESULT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>跟进记录内容 *</Label>
              <Textarea
                value={newFollowup.followRecord || ''}
                onChange={(e) => setNewFollowup({...newFollowup, followRecord: e.target.value})}
                placeholder="请输入跟进记录内容"
                rows={6}
              />
            </div>
            
            <div className="space-y-2">
              <Label>上传文件 (可选)</Label>
              <div className="flex gap-2">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  选择文件
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCameraUpload}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  拍照
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
            <Button variant="outline" onClick={() => setShowFollowupDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddFollowup}>
              提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 图片预览对话框 */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>图片预览</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex justify-center">
              <img src={previewImage} alt="预览" className="max-w-full max-h-[80vh] object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
