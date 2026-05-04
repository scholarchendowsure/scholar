'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, Camera, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import type { LoanCaseV2, FollowUp } from '@/types/case';
import {
  FOLLOWUP_TYPE_OPTIONS,
  CONTACT_OPTIONS,
  FOLLOWUP_RESULT_OPTIONS,
} from '@/types/case';
import { generateId } from '@/lib/utils';

export default function FollowupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { currentUser } = useAuth();
  const [caseData, setCaseData] = useState<LoanCaseV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(true);
  const [saveSuccess, setSavedSuccess] = useState(false);
  
  const [newFollowup, setNewFollowup] = useState({
    follower: currentUser?.name || '',
    followType: 'online',
    contact: 'legal_person',
    followResult: 'normal_repayment',
    followRecord: '',
    remark: '',
  });
  
  const [uploadedCaseFiles, setUploadedCaseFiles] = useState<{ name: string; url: string }[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // 加载案件信息
  useEffect(() => {
    const loadCase = async () => {
      try {
        // 先尝试用UUID查找
        let response = await fetch(`/api/cases/cases-v2/${id}`);
        let result = await response.json();
        if (result.success) {
          setCaseData(result.data);
        } else {
          // 如果UUID找不到，尝试用贷款单号查找
          const listResponse = await fetch(`/api/cases?loanNo=${id}`);
          const listResult = await listResponse.json();
          if (listResult.success && listResult.data && listResult.data.length > 0) {
            setCaseData(listResult.data[0]);
          }
        }
        // 即使找不到案件，也不显示错误，直接显示弹窗
      } catch (error) {
        console.error('加载案件失败:', error);
        // 即使加载失败，也不显示toast错误
      } finally {
        setLoading(false);
      }
    };
    
    loadCase();
  }, [id]);

  // 文件上传处理（简化版）
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setUploadingFiles(true);
    try {
      const uploaded = files.map((file) => {
        // 使用临时URL，实际项目中应该上传到存储服务
        const url = URL.createObjectURL(file);
        return { name: file.name, url };
      });
      setUploadedCaseFiles(prev => [...prev, ...uploaded]);
      toast.success(`成功添加 ${uploaded.length} 个文件`);
    } catch (error) {
      console.error('文件上传失败:', error);
      toast.error('文件上传失败');
    } finally {
      setUploadingFiles(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // 拍照上传
  const handleCameraUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => handleFileUpload(e as any);
    input.click();
  };

  // 删除文件
  const removeFile = (index: number) => {
    setUploadedCaseFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 同步飞书webhook
  const syncToFeishuWebhook = async (caseData: LoanCaseV2, followup: FollowUp) => {
    try {
      // 时间格式化函数
      const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      // 枚举值转中文
      const getFollowupTypeText = (type: string) => {
        const map: Record<string, string> = {
          'online': '线上',
          'offline': '线下',
          'other': '其他',
        };
        return map[type] || type;
      };

      const getContactText = (contact: string) => {
        const map: Record<string, string> = {
          'legal_person': '法人',
          'actual_controller': '实控人',
          'other': '其他',
        };
        return map[contact] || contact;
      };

      const getFollowupResultText = (result: string) => {
        const map: Record<string, string> = {
          'normal_repayment': '正常还款',
          'warning_rise': '预警上升',
          'overdue_promise': '逾期承诺',
          'other': '其他',
        };
        return map[result] || result;
      };

      // 生成短链接的函数
      const generateShortLink = (url: string) => {
        return url;
      };

      // 文件信息生成
      let filesInfo = '';
      if (followup.attachments && followup.attachments.length > 0) {
        const fileLinks = followup.attachments.map(url => generateShortLink(url));
        filesInfo = fileLinks.join('\\n');
      }

      const webhookPayload = {
        action: 'case_followup',
        caseId: caseData.id,
        loanNo: caseData.loanNo,
        userId: caseData.userId || '',
        borrowerName: caseData.borrowerName,
        companyName: caseData.companyName || '',
        followup: {
          id: followup.id,
          visitUser: followup.visitUser,
          visitDate: formatDateTime(followup.visitDate || followup.createTime),
          visitType: getFollowupTypeText(followup.visitType || followup.followUpType || 'other'),
          contactPerson: getContactText(followup.contactPerson || 'other'),
          followUpResult: getFollowupResultText(followup.followUpResult || 'other'),
          content: followup.content,
          remark: followup.remark || '',
          images: followup.images || [],
          attachments: followup.attachments || [],
          filesInfo: filesInfo,
          createTime: formatDateTime(followup.createTime),
        }
      };

      console.log('发送飞书webhook:', webhookPayload);
      
      const webhookResponse = await fetch('/api/webhook/feishu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      if (!webhookResponse.ok) {
        console.error('飞书webhook调用失败:', webhookResponse.statusText);
      } else {
        console.log('飞书webhook调用成功');
      }
    } catch (error) {
      console.error('调用飞书webhook失败:', error);
    }
  };

  // 保存跟进记录
  const handleSaveFollowup = async () => {
    if (!caseData) {
      toast.error("案件不存在，无法保存跟进记录");
      return;
    }

    try {
      // 1. 验证必填字段
      if (!newFollowup.followType || !newFollowup.contact || !newFollowup.followResult || !newFollowup.followRecord) {
        toast.error("请填写完整跟进信息");
        return;
      }

      // 2. 构造新的跟进记录（使用与案件详情页面一致的字段）
      const followupRecord: FollowUp = {
        id: Date.now().toString(),
        follower: currentUser?.name || "未登记人",
        followTime: newFollowup.followTime || new Date().toISOString(),
        followType: newFollowup.followType as any,
        contact: newFollowup.contact as any,
        followResult: newFollowup.followResult as any,
        followRecord: newFollowup.followRecord || "",
        fileInfo: uploadedCaseFiles,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.name || "未登记人",
      };

      // 3. 更新当前案件
      const updatedCase: LoanCaseV2 = {
        ...caseData,
        followups: [followupRecord, ...(caseData.followups || [])],
        updateTime: new Date().toISOString(),
      };

      // 4. 立即保存当前案件并提示成功
      const saveResponse = await fetch(`/api/cases/cases-v2/${caseData?.id || id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCase),
      });

      if (!saveResponse.ok) {
        throw new Error("保存案件失败");
      }

      setSavedSuccess(true);
      toast.success("跟进记录保存成功！");
      
      // 5. 后台异步处理其他任务（不阻塞用户）
      (async () => {
        try {
          // 后台同步飞书多维表格
          await syncToFeishuWebhook(updatedCase, followupRecord);

          // 后台更新相同用户ID的其他案件
          if (caseData.userId) {
            const allCasesResponse = await fetch("/api/cases/cases-v2");
            if (allCasesResponse.ok) {
              const result = await allCasesResponse.json();
              const allCases = result.success ? result.data : [];
              const relatedCases = allCases.filter(
                (c: LoanCaseV2) => c.userId === caseData.userId && c.id !== caseData.id
              );
              
              await Promise.all(
                relatedCases.map(async (relatedCase: LoanCaseV2) => {
                  const updatedRelatedCase = {
                    ...relatedCase,
                    followups: [followupRecord, ...(relatedCase.followups || [])],
                    updateTime: new Date().toISOString(),
                  };
                  try {
                    await fetch(`/api/cases/cases-v2/${relatedCase.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(updatedRelatedCase),
                    });
                  } catch (err) {
                    console.error("更新关联案件失败:", err);
                  }
                })
              );
            }
          }
        } catch (err) {
          console.error("后台任务处理失败:", err);
        }
      })();
    } catch (error) {
      console.error("保存跟进记录失败:", error);
      toast.error("保存失败，请重试");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">加载中...</p>
      </div>
    );
  }

  if (saveSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50/50 to-emerald-50/50">
        <div className="text-center">
          <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-green-800 mb-4">记录保存成功！</h1>
          <p className="text-green-600 text-lg">您的跟进记录已成功保存到案件中</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <h1 className="text-xl font-bold text-slate-900 mb-4">案件信息</h1>
          {caseData ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">贷款单号</p>
                <p className="font-medium font-mono">{caseData.loanNo}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">借款人姓名</p>
                <p className="font-medium">{caseData.borrowerName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">公司名称</p>
                <p className="font-medium">{caseData.companyName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">逾期金额</p>
                <p className="font-medium text-red-600 font-mono tabular-nums">
                  ¥{caseData.overdueAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500">案件信息加载中或案件不存在</p>
              <p className="text-sm text-slate-400 mt-2">案件ID: {params.id}</p>
            </div>
          )}
        </div>

        {/* 新增跟进记录对话框 */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
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
                  value={new Date().toLocaleString('zh-CN')}
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
                    id="file-upload-followup" 
                    multiple 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                  <Button variant="outline" type="button" onClick={() => document.getElementById('file-upload-followup')?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    选择文件上传
                  </Button>
                  <Button variant="outline" type="button" onClick={handleCameraUpload}>
                    <Camera className="w-4 h-4 mr-2" />
                    拍照上传
                  </Button>
                </div>
                {uploadedCaseFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadedCaseFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                        <span className="text-sm text-slate-700">{file.name}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeFile(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button onClick={handleSaveFollowup}>
                保存
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}