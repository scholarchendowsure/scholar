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
import { CheckCircle, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import type { FollowUp } from '@/types/case';
import {
  FOLLOWUP_TYPE_OPTIONS,
  CONTACT_OPTIONS,
  FOLLOWUP_RESULT_OPTIONS,
} from '@/types/case';

export default function FollowupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { currentUser } = useAuth() as any;
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(true);
  const [saveSuccess, setSavedSuccess] = useState(false);
  
  const [newFollowup, setNewFollowup] = useState({
    follower: currentUser?.name || '',
    followType: 'online',
    contact: 'legal_person',
    followResult: 'normal_repayment',
    followRecord: '',
  });
  
  const [uploadedCaseFiles, setUploadedCaseFiles] = useState<{ name: string; url: string }[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // 加载案件信息（与案件详情页面完全一致）
  useEffect(() => {
    const loadCase = async () => {
      try {
        // 先尝试用UUID查找（与案件详情页面一致）
        let response = await fetch(`/api/cases/${id}`);
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
      } catch (error) {
        console.error('加载案件失败:', error);
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

  // 删除文件
  const removeFile = (index: number) => {
    setUploadedCaseFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 同步飞书webhook（简化版）
  const syncToFeishuWebhook = async (caseData: any, followup: FollowUp) => {
    try {
      const webhookPayload = {
        action: 'case_followup',
        caseId: caseData.id,
        loanNo: caseData.loanNo,
        followup: followup,
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

  // 时间格式化（与案件详情页面保持一致）
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
  
  // 枚举值转中文（与案件详情页面保持一致）
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
  
  // 文件信息生成短链接（与案件详情页面保持一致）
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

  // 保存跟进记录（与案件详情页面完全一致）
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

      // 2. 构造新的跟进记录
      const followupRecord: FollowUp = {
        id: Date.now().toString(),
        follower: newFollowup.follower || "未登记人",
        followTime: new Date().toISOString(),
        followType: newFollowup.followType as any,
        contact: newFollowup.contact as any,
        followResult: newFollowup.followResult as any,
        followRecord: newFollowup.followRecord || "",
        fileInfo: uploadedCaseFiles as any,
        createdAt: new Date().toISOString(),
        createdBy: newFollowup.follower || "未登记人",
      };

      // 3. 更新当前案件
      const updatedCase: any = {
        ...caseData,
        followups: [followupRecord, ...(caseData.followups || [])],
        updateTime: new Date().toISOString(),
      };

      // 4. 立即保存当前案件并提示成功（与案件详情页面完全一致）
      const saveResponse = await fetch(`/api/cases/${caseData?.id || id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCase),
      });

      if (!saveResponse.ok) {
        throw new Error("保存案件失败");
      }

      setSavedSuccess(true);
      toast.success("跟进记录保存成功！");
      
      // 5. 后台异步处理其他任务（与案件详情页面完全一致）
      (async () => {
        try {
          // 首先调用案件详情页面使用的 webhook（保持一致）
          console.log("📤 调用飞书Webhook（与案件详情页面一致）...");
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
                follower: followupRecord.follower,
                follow_time: formatDateTime(followupRecord.followTime),
                follow_type: getFollowTypeText(followupRecord.followType),
                contact: getContactText(followupRecord.contact),
                follow_result: getFollowResultText(followupRecord.followResult),
                follow_record: followupRecord.followRecord,
                file_info: formatFileInfo(followupRecord.fileInfo, id as string)
              }
            })
          }).catch((webhookError) => {
            console.error('Webhook调用失败:', webhookError);
          });
          
          // 同时也同步到飞书多维表格
          console.log("🔄 同时也同步到飞书多维表格...");
          const syncResponse = await fetch("/api/feishu-bitable/followup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              followup: followupRecord,
              caseData: updatedCase
            }),
          });
          
          const syncResult = await syncResponse.json();
          console.log("📊 多维表格同步结果:", syncResult);
          
          if (syncResult.success && syncResult.successCount > 0) {
            console.log("✅ 多维表格同步成功:", syncResult.message);
          } else if (syncResult.skipped) {
            console.log("ℹ️ 多维表格同步已跳过（无启用配置）");
          } else {
            console.warn("⚠️ 多维表格同步存在问题:", syncResult);
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
                  ¥{caseData.overdueAmount?.toLocaleString?.('zh-CN', { minimumFractionDigits: 2 }) || caseData.overdueAmount}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500">案件信息加载中或案件不存在</p>
              <p className="text-sm text-slate-400 mt-2">案件ID: {id}</p>
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
