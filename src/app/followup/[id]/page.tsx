'use client';

import { useState, useEffect } from 'react';
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
import { fileStorage } from '@/storage/file-storage';

// 生成短链接的函数
const generateShortLink = (url: string) =&gt; {
  return url;
};

export default function FollowupPage({ params }: { params: { id: string } }) {
  const { currentUser } = useAuth();
  const [caseData, setCaseData] = useState&lt;LoanCaseV2 | null&gt;(null);
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
  
  const [uploadedCaseFiles, setUploadedCaseFiles] = useState&lt;{ name: string; url: string }[]&gt;([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // 加载案件信息
  useEffect(() =&gt; {
    const loadCase = async () =&gt; {
      try {
        const response = await fetch(`/api/cases/cases-v2/${params.id}`);
        const result = await response.json();
        if (result.success) {
          setCaseData(result.data);
        }
      } catch (error) {
        console.error('加载案件失败:', error);
        toast.error('加载案件失败');
      } finally {
        setLoading(false);
      }
    };
    
    loadCase();
  }, [params.id]);

  // 文件上传处理
  const handleFileUpload = async (e: React.ChangeEvent&lt;HTMLInputElement&gt;) =&gt; {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setUploadingFiles(true);
    try {
      const uploaded = await Promise.all(
        files.map(async (file) =&gt; {
          const url = await fileStorage.uploadFile(file);
          return { name: file.name, url };
        })
      );
      setUploadedCaseFiles(prev =&gt; [...prev, ...uploaded]);
      toast.success(`成功上传 ${uploaded.length} 个文件`);
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
  const handleCameraUpload = () =&gt; {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) =&gt; handleFileUpload(e as any);
    input.click();
  };

  // 删除文件
  const removeFile = (index: number) =&gt; {
    setUploadedCaseFiles(prev =&gt; prev.filter((_, i) =&gt; i !== index));
  };

  // 同步飞书webhook
  const syncToFeishuWebhook = async (caseData: LoanCaseV2, followup: FollowUp) =&gt; {
    try {
      // 时间格式化函数
      const formatDateTime = (dateStr: string) =&gt; {
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
      const getFollowupTypeText = (type: string) =&gt; {
        const map: Record&lt;string, string&gt; = {
          'online': '线上',
          'offline': '线下',
          'other': '其他',
        };
        return map[type] || type;
      };

      const getContactText = (contact: string) =&gt; {
        const map: Record&lt;string, string&gt; = {
          'legal_person': '法人',
          'actual_controller': '实控人',
          'other': '其他',
        };
        return map[contact] || contact;
      };

      const getFollowupResultText = (result: string) =&gt; {
        const map: Record&lt;string, string&gt; = {
          'normal_repayment': '正常还款',
          'warning_rise': '预警上升',
          'overdue_promise': '逾期承诺',
          'other': '其他',
        };
        return map[result] || result;
      };

      // 文件信息生成
      let filesInfo = '';
      if (followup.attachments &amp;&amp; followup.attachments.length &gt; 0) {
        const fileLinks = followup.attachments.map(url =&gt; generateShortLink(url));
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
  const handleSaveFollowup = async () =&gt; {
    if (!caseData) return;

    try {
      // 1. 验证必填字段
      if (!newFollowup.followType || !newFollowup.contact || !newFollowup.followResult || !newFollowup.followRecord) {
        toast.error("请填写完整跟进信息");
        return;
      }

      // 2. 构造新的跟进记录
      const followupRecord: FollowUp = {
        id: generateId(),
        visitUser: currentUser?.name || "未登记人",
        visitDate: new Date().toISOString(),
        visitType: newFollowup.followType as any,
        followUpType: newFollowup.followType as any,
        contactPerson: newFollowup.contact as any,
        followUpResult: newFollowup.followResult as any,
        content: newFollowup.followRecord,
        remark: newFollowup.remark,
        images: [],
        attachments: uploadedCaseFiles.map(f =&gt; f.url),
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
      };

      // 3. 更新当前案件
      const updatedCase: LoanCaseV2 = {
        ...caseData,
        followups: [followupRecord, ...(caseData.followups || [])],
        updateTime: new Date().toISOString(),
      };

      // 4. 立即保存当前案件并提示成功
      const saveResponse = await fetch(`/api/cases/cases-v2/${params.id}`, {
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
      (async () =&gt; {
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
                (c: LoanCaseV2) =&gt; c.userId === caseData.userId &amp;&amp; c.id !== caseData.id
              );
              
              await Promise.all(
                relatedCases.map(async (relatedCase: LoanCaseV2) =&gt; {
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
      &lt;div className="min-h-screen flex items-center justify-center"&gt;
        &lt;p className="text-slate-500"&gt;加载中...&lt;/p&gt;
      &lt;/div&gt;
    );
  }

  if (!caseData) {
    return (
      &lt;div className="min-h-screen flex items-center justify-center"&gt;
        &lt;p className="text-red-500"&gt;案件不存在&lt;/p&gt;
      &lt;/div&gt;
    );
  }

  if (saveSuccess) {
    return (
      &lt;div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50/50 to-emerald-50/50"&gt;
        &lt;div className="text-center"&gt;
          &lt;CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" /&gt;
          &lt;h1 className="text-3xl font-bold text-green-800 mb-4"&gt;记录保存成功！&lt;/h1&gt;
          &lt;p className="text-green-600 text-lg"&gt;您的跟进记录已成功保存到案件中&lt;/p&gt;
        &lt;/div&gt;
      &lt;/div&gt;
    );
  }

  return (
    &lt;div className="min-h-screen bg-slate-50 p-4"&gt;
      &lt;div className="max-w-4xl mx-auto"&gt;
        &lt;div className="bg-white rounded-lg shadow-sm p-6 mb-4"&gt;
          &lt;h1 className="text-xl font-bold text-slate-900 mb-4"&gt;案件信息&lt;/h1&gt;
          &lt;div className="grid grid-cols-2 gap-4"&gt;
            &lt;div&gt;
              &lt;p className="text-sm text-slate-500"&gt;贷款单号&lt;/p&gt;
              &lt;p className="font-medium font-mono"&gt;{caseData.loanNo}&lt;/p&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;p className="text-sm text-slate-500"&gt;借款人姓名&lt;/p&gt;
              &lt;p className="font-medium"&gt;{caseData.borrowerName}&lt;/p&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;p className="text-sm text-slate-500"&gt;公司名称&lt;/p&gt;
              &lt;p className="font-medium"&gt;{caseData.companyName || '-'}&lt;/p&gt;
            &lt;/div&gt;
            &lt;div&gt;
              &lt;p className="text-sm text-slate-500"&gt;逾期金额&lt;/p&gt;
              &lt;p className="font-medium text-red-600 font-mono tabular-nums"&gt;
                ¥{caseData.overdueAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              &lt;/p&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        &lt;/div&gt;

        {/* 新增跟进记录对话框 */}
        &lt;Dialog open={showDialog} onOpenChange={setShowDialog}&gt;
          &lt;DialogContent className="sm:max-w-2xl"&gt;
            &lt;DialogHeader&gt;
              &lt;DialogTitle&gt;新增跟进记录&lt;/DialogTitle&gt;
            &lt;/DialogHeader&gt;
            &lt;div className="grid grid-cols-2 gap-4 py-4"&gt;
              &lt;div className="space-y-2"&gt;
                &lt;Label&gt;跟进人&lt;/Label&gt;
                &lt;Input 
                  value={newFollowup.follower || ''}
                  onChange={(e) =&gt; setNewFollowup({ ...newFollowup, follower: e.target.value })}
                  placeholder="请输入跟进人"
                /&gt;
              &lt;/div&gt;
              &lt;div className="space-y-2"&gt;
                &lt;Label&gt;跟进时间&lt;/Label&gt;
                &lt;Input 
                  value={new Date().toLocaleString('zh-CN')}
                  disabled
                  className="bg-slate-50"
                /&gt;
              &lt;/div&gt;
              &lt;div className="space-y-2"&gt;
                &lt;Label&gt;跟进类型&lt;/Label&gt;
                &lt;Select 
                  value={newFollowup.followType} 
                  onValueChange={(value: any) =&gt; setNewFollowup({ ...newFollowup, followType: value })}
                &gt;
                  &lt;SelectTrigger&gt;
                    &lt;SelectValue placeholder="请选择跟进类型" /&gt;
                  &lt;/SelectTrigger&gt;
                  &lt;SelectContent&gt;
                    {FOLLOWUP_TYPE_OPTIONS.map(opt =&gt; (
                      &lt;SelectItem key={opt.value} value={opt.value}&gt;
                        {opt.label}
                      &lt;/SelectItem&gt;
                    ))}
                  &lt;/SelectContent&gt;
                &lt;/Select&gt;
              &lt;/div&gt;
              &lt;div className="space-y-2"&gt;
                &lt;Label&gt;联系人&lt;/Label&gt;
                &lt;Select 
                  value={newFollowup.contact} 
                  onValueChange={(value: any) =&gt; setNewFollowup({ ...newFollowup, contact: value })}
                &gt;
                  &lt;SelectTrigger&gt;
                    &lt;SelectValue placeholder="请选择联系人" /&gt;
                  &lt;/SelectTrigger&gt;
                  &lt;SelectContent&gt;
                    {CONTACT_OPTIONS.map(opt =&gt; (
                      &lt;SelectItem key={opt.value} value={opt.value}&gt;
                        {opt.label}
                      &lt;/SelectItem&gt;
                    ))}
                  &lt;/SelectContent&gt;
                &lt;/Select&gt;
              &lt;/div&gt;
              &lt;div className="space-y-2 col-span-2"&gt;
                &lt;Label&gt;跟进结果&lt;/Label&gt;
                &lt;Select 
                  value={newFollowup.followResult} 
                  onValueChange={(value: any) =&gt; setNewFollowup({ ...newFollowup, followResult: value })}
                &gt;
                  &lt;SelectTrigger&gt;
                    &lt;SelectValue placeholder="请选择跟进结果" /&gt;
                  &lt;/SelectTrigger&gt;
                  &lt;SelectContent&gt;
                    {FOLLOWUP_RESULT_OPTIONS.map(opt =&gt; (
                      &lt;SelectItem key={opt.value} value={opt.value}&gt;
                        {opt.label}
                      &lt;/SelectItem&gt;
                    ))}
                  &lt;/SelectContent&gt;
                &lt;/Select&gt;
              &lt;/div&gt;
              &lt;div className="space-y-2 col-span-2"&gt;
                &lt;Label&gt;跟进记录&lt;/Label&gt;
                &lt;Textarea 
                  value={newFollowup.followRecord || ''}
                  onChange={(e) =&gt; setNewFollowup({ ...newFollowup, followRecord: e.target.value })}
                  placeholder="请输入跟进记录内容"
                  rows={6}
                /&gt;
              &lt;/div&gt;
              &lt;div className="space-y-2 col-span-2"&gt;
                &lt;Label&gt;文件信息&lt;/Label&gt;
                &lt;div className="flex gap-2"&gt;
                  &lt;input 
                    type="file" 
                    id="file-upload-followup" 
                    multiple 
                    className="hidden" 
                    onChange={handleFileUpload}
                  /&gt;
                  &lt;Button variant="outline" type="button" onClick={() =&gt; document.getElementById('file-upload-followup')?.click()}&gt;
                    &lt;Upload className="w-4 h-4 mr-2" /&gt;
                    选择文件上传
                  &lt;/Button&gt;
                  &lt;Button variant="outline" type="button" onClick={handleCameraUpload}&gt;
                    &lt;Camera className="w-4 h-4 mr-2" /&gt;
                    拍照上传
                  &lt;/Button&gt;
                &lt;/div&gt;
                {uploadedCaseFiles.length &gt; 0 &amp;&amp; (
                  &lt;div className="mt-3 space-y-2"&gt;
                    {uploadedCaseFiles.map((file, index) =&gt; (
                      &lt;div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg"&gt;
                        &lt;span className="text-sm text-slate-700"&gt;{file.name}&lt;/span&gt;
                        &lt;Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() =&gt; removeFile(index)}
                          className="h-8 w-8 p-0"
                        &gt;
                          &lt;X className="h-4 w-4" /&gt;
                        &lt;/Button&gt;
                      &lt;/div&gt;
                    ))}
                  &lt;/div&gt;
                )}
              &lt;/div&gt;
            &lt;/div&gt;
            &lt;div className="flex justify-end gap-3"&gt;
              &lt;Button variant="outline" onClick={() =&gt; setShowDialog(false)}&gt;
                取消
              &lt;/Button&gt;
              &lt;Button onClick={handleSaveFollowup}&gt;
                保存
              &lt;/Button&gt;
            &lt;/div&gt;
          &lt;/DialogContent&gt;
        &lt;/Dialog&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  );
}
