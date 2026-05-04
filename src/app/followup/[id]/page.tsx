'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
import { Camera, Upload, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { 
  FOLLOWUP_TYPE_OPTIONS, 
  CONTACT_OPTIONS, 
  FOLLOWUP_RESULT_OPTIONS, 
  FollowUp, 
  CaseFile,
  Case
} from '@/types/case';

export default function FollowupPage() {
  const params = useParams();
  const caseId = params.id as string;
  
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [uploadedCaseFiles, setUploadedCaseFiles] = useState<CaseFile[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newFollowup, setNewFollowup] = useState<Partial<FollowUp>>({
    follower: '未登记人',
    followType: 'online',
    contact: 'legal_representative',
    followResult: 'normal_repayment',
    followRecord: '',
    fileInfo: [],
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
          type: file.type.startsWith('image/') ? 'image' : 'document',
          data: event.target?.result as string,
          uploadTime: new Date().toISOString(),
          uploadBy: newFollowup.follower || '未登记人',
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
              uploadTime: new Date().toISOString(),
              uploadBy: newFollowup.follower || '未登记人',
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

    if (!caseData) {
      toast.error('案件数据不存在');
      return;
    }

    try {
      const followup: FollowUp = {
        id: Date.now().toString(),
        follower: newFollowup.follower || '未登记人',
        followTime: new Date().toISOString(),
        followType: (newFollowup.followType as 'online' | 'offline') || 'online',
        contact: (newFollowup.contact as 'legal_representative' | 'actual_controller') || 'legal_representative',
        followResult: (newFollowup.followResult as 'normal_repayment' | 'warning_rise' | 'overdue_promise') || 'normal_repayment',
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

      // 如果没有找到相关案件，就只处理当前案件
      if (relatedCases.length === 0) {
        relatedCases = [caseData];
      }

      // 对每个相同用户ID的案件都添加跟进记录
      let updatedCount = 0;
      for (const relatedCase of relatedCases) {
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
        
        if (res.ok) {
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        toast.success('跟进记录保存成功');
        setShowDialog(false);
        setSaveSuccess(true);
      } else {
        toast.error('保存失败');
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
        </div>
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
              <Button variant="outline" onClick={() => setShowDialog(false)}>
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
