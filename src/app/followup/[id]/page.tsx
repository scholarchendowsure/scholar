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
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // 从URL参数中获取提醒人名称
  const [followerFromUrl, setFollowerFromUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const follower = urlParams.get('follower');
      if (follower) {
        setFollowerFromUrl(decodeURIComponent(follower));
      }
    }
  }, []);

  const [newFollowup, setNewFollowup] = useState({
    follower: '',
    followType: 'online',
    contact: 'legal_representative',
    followResult: 'normal_repayment',
    followRecord: '',
  });

  // 当followerFromUrl变化时，自动填入跟进人
  useEffect(() => {
    if (followerFromUrl) {
      setNewFollowup(prev => ({ ...prev, follower: followerFromUrl }));
    }
  }, [followerFromUrl]);

  const [uploadedCaseFiles, setUploadedCaseFiles] = useState<{ name: string; url: string }[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // 加载案件信息
  useEffect(() => {
    const loadCase = async () => {
      try {
        // 先尝试用UUID查找
        let response = await fetch(`/api/cases/${id}?_t=${Date.now()}`, { cache: 'no-store' });
        let result = await response.json();
        if (result.success) {
          setCaseData(result.data);
        } else {
          // UUID找不到，尝试用贷款单号精确查找
          const listResponse = await fetch(`/api/cases?loanNo=${encodeURIComponent(id)}&pageSize=1&_t=${Date.now()}`, { cache: 'no-store' });
          const listResult = await listResponse.json();
          if (listResult.success && listResult.data && listResult.data.length > 0) {
            // 找到案件后，用完整数据（通过ID获取详情，确保拿到所有字段）
            const detailResponse = await fetch(`/api/cases/${listResult.data[0].id}?_t=${Date.now()}`, { cache: 'no-store' });
            const detailResult = await detailResponse.json();
            if (detailResult.success) {
              setCaseData(detailResult.data);
            } else {
              setCaseData(listResult.data[0]);
            }
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

  // 文件上传处理
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

  // 保存跟进记录 - 使用专门的 followups API
  const handleSaveFollowup = async () => {
    if (!caseData) {
      toast.error("案件不存在，无法保存跟进记录");
      return;
    }

    if (!newFollowup.followType || !newFollowup.contact || !newFollowup.followResult || !newFollowup.followRecord) {
      toast.error("请填写完整跟进信息");
      return;
    }

    setSaving(true);
    try {
      // 1. 构造跟进记录
      const followupRecord = {
        id: Date.now().toString(),
        follower: newFollowup.follower || "未登记人",
        followTime: new Date().toISOString(),
        followType: newFollowup.followType,
        contact: newFollowup.contact,
        followResult: newFollowup.followResult,
        followRecord: newFollowup.followRecord || "",
        fileInfo: uploadedCaseFiles.length > 0 ? uploadedCaseFiles : undefined,
        createdAt: new Date().toISOString(),
        createdBy: newFollowup.follower || "未登记人",
      };

      // 2. 调用 followups API 保存（自动同步到同用户ID的所有案件）
      const res = await fetch(`/api/cases/${caseData.id}/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followup: followupRecord,
          syncToSameUser: true,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setSaveSuccess(true);
        toast.success(result.message || `跟进记录保存成功，已同步到 ${result.syncedCount + 1} 个案件`);

        // 3. 后台异步同步到飞书
        (async () => {
          try {
            // 同步到飞书Webhook
            fetch('/api/webhook/feishu', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event_type: 'follow_up_created',
                case_data: {
                  user_id: caseData.userId,
                  loan_number: caseData.loanNo
                },
                followup_data: {
                  follower: followupRecord.follower,
                  follow_time: new Date().toLocaleString('zh-CN'),
                  follow_type: newFollowup.followType === 'online' ? '线上' : newFollowup.followType === 'offline' ? '线下' : '其他',
                  contact: newFollowup.contact === 'legal_representative' ? '法人' : newFollowup.contact === 'actual_controller' ? '实控人' : '其他',
                  follow_result: newFollowup.followResult === 'normal_repayment' ? '正常还款' : newFollowup.followResult === 'warning_rise' ? '预警上升' : newFollowup.followResult === 'overdue_promise' ? '逾期承诺' : '其他',
                  follow_record: followupRecord.followRecord,
                }
              })
            }).catch(() => {});

            // 同步到飞书多维表格
            fetch("/api/feishu-bitable/followup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                followup: followupRecord,
                caseData: caseData
              }),
            }).catch(() => {});
          } catch (err) {
            console.error("后台同步任务失败:", err);
          }
        })();
      } else {
        toast.error(result.error || '保存失败，请重试');
      }
    } catch (error) {
      console.error("保存跟进记录失败:", error);
      toast.error("保存失败，请重试");
    } finally {
      setSaving(false);
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
          <p className="text-green-600 text-lg mb-8">您的跟进记录已成功保存到案件中</p>
          {caseData && (
            <button
              onClick={() => window.open(`/cases/${caseData.id}`, '_blank')}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-lg font-medium transition-colors"
            >
              查看案件详情
            </button>
          )}
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
              <Button onClick={handleSaveFollowup} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
