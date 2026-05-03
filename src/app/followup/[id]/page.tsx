'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Camera, Upload } from 'lucide-react';
import { toast } from 'sonner';

// 跟进类型选项
const FOLLOWUP_TYPE_OPTIONS = [
  { label: '电话', value: 'phone' },
  { label: '上门', value: 'visit' },
  { label: '微信', value: 'wechat' },
  { label: '短信', value: 'sms' },
  { label: '其他', value: 'other' },
];

// 联系人选项
const CONTACT_OPTIONS = [
  { label: '本人', value: 'self' },
  { label: '配偶', value: 'spouse' },
  { label: '父母', value: 'parents' },
  { label: '子女', value: 'children' },
  { label: '其他亲属', value: 'relatives' },
  { label: '朋友', value: 'friends' },
  { label: '同事', value: 'colleagues' },
  { label: '其他', value: 'others' },
];

// 跟进结果选项
const FOLLOWUP_RESULT_OPTIONS = [
  { label: '承诺还款', value: 'promise_to_pay' },
  { label: '部分还款', value: 'partial_payment' },
  { label: '全额还款', value: 'full_payment' },
  { label: '无能力还款', value: 'no_ability' },
  { label: '拒绝沟通', value: 'refuse' },
  { label: '无人接听', value: 'no_answer' },
  { label: '失联', value: 'lost' },
  { label: '其他', value: 'other' },
];

// 案件文件类型
interface CaseFile {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'doc' | 'other';
  data?: string;
  createdAt: string;
}

// 跟进记录类型
interface FollowUp {
  id: string;
  follower: string;
  followTime: string;
  followType: 'phone' | 'visit' | 'wechat' | 'sms' | 'other';
  contact: 'self' | 'spouse' | 'parents' | 'children' | 'relatives' | 'friends' | 'colleagues' | 'others';
  followResult: 'promise_to_pay' | 'partial_payment' | 'full_payment' | 'no_ability' | 'refuse' | 'no_answer' | 'lost' | 'other';
  followRecord: string;
  fileInfo?: CaseFile[];
  createdAt: string;
  createdBy: string;
}

// 案件类型
interface Case {
  id: string;
  caseNumber: string;
  userId: string;
  userName: string;
  companyName: string;
  status: 'pending_assign' | 'pending_visit' | 'following' | 'closed';
  overdueDays: number;
  overdueAmount: number;
  currency: string;
  riskLevel: 'low' | 'medium' | 'high';
  salesPerson: string;
  repaymentDate: string;
  balance: number;
}

export default function FollowupPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;
  
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [uploadedCaseFiles, setUploadedCaseFiles] = useState<CaseFile[]>([]);
  const [newFollowup, setNewFollowup] = useState({
    follower: '',
    followTime: new Date().toISOString(),
    followType: 'phone' as const,
    contact: 'self' as const,
    followResult: 'promise_to_pay' as const,
    followRecord: '',
  });

  useEffect(() => {
    loadCaseData();
  }, [caseId]);

  const loadCaseData = async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      const json = await res.json();
      if (json.success) {
        setCaseData(json.data);
        setShowDialog(true);
      } else {
        toast.error('加载案件失败');
      }
    } catch (error) {
      toast.error('加载案件失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newFile: CaseFile = {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : 'other',
          data: event.target?.result as string,
          createdAt: new Date().toISOString(),
        };
        setUploadedCaseFiles(prev => [...prev, newFile]);
        toast.success(`文件 "${file.name}" 已添加`);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCameraUpload = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          const video = document.createElement('video');
          video.srcObject = stream;
          video.play();
          
          setTimeout(() => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0);
            
            const dataUrl = canvas.toDataURL('image/jpeg');
            const newFile: CaseFile = {
              id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: `photo-${new Date().toISOString().slice(0, 10)}.jpg`,
              type: 'image',
              data: dataUrl,
              createdAt: new Date().toISOString(),
            };
            setUploadedCaseFiles(prev => [...prev, newFile]);
            toast.success('拍照成功');
            
            stream.getTracks().forEach(track => track.stop());
          }, 1000);
        })
        .catch(err => {
          toast.error('无法访问摄像头: ' + err.message);
        });
    } else {
      toast.error('您的浏览器不支持摄像头功能');
    }
  };

  const handleSaveFollowup = async () => {
    if (!newFollowup.follower || !newFollowup.followRecord) {
      toast.error('请填写跟进人和跟进记录');
      return;
    }

    try {
      const followup: FollowUp = {
        id: Date.now().toString(),
        follower: newFollowup.follower || '未登记人',
        followTime: newFollowup.followTime || new Date().toISOString(),
        followType: newFollowup.followType,
        contact: newFollowup.contact,
        followResult: newFollowup.followResult,
        followRecord: newFollowup.followRecord || '',
        fileInfo: uploadedCaseFiles,
        createdAt: new Date().toISOString(),
        createdBy: newFollowup.follower || '未登记人',
      };

      const res = await fetch(`/api/cases/${caseId}/followups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(followup),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('跟进记录保存成功');
        setShowDialog(false);
        router.push('/');
      } else {
        toast.error('保存失败: ' + json.error);
      }
    } catch (error) {
      toast.error('保存失败');
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
          <p className="text-slate-600 mb-4">案件不存在</p>
          <Button onClick={() => router.push('/')}>返回首页</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <h1 className="text-xl font-bold text-slate-900 mb-4">案件信息</h1>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">案件编号</p>
              <p className="font-medium">{caseData.caseNumber}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">客户姓名</p>
              <p className="font-medium">{caseData.userName}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">公司名称</p>
              <p className="font-medium">{caseData.companyName}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">逾期金额</p>
              <p className="font-medium text-red-600">
                ¥{caseData.overdueAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* 新增跟进记录对话框 */}
        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) router.push('/');
        }}>
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
              <Button variant="outline" onClick={() => {
                setShowDialog(false);
                router.push('/');
              }}>
                取消
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleSaveFollowup}
              >
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
