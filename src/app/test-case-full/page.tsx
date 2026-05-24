'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Edit,
  History,
  FileText,
  Building2,
  Scale,
  Store,
  ShieldCheck,
  RefreshCw,
  Upload,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  File,
  FileSpreadsheet,
} from 'lucide-react';
import LegalLitigationTab from '@/components/legal-litigation-tab';

export default function CaseDetailTestPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<any>(null);

  // 模拟加载案件数据
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setCaseData({
        id: caseId || 'DSL17421023520618258',
        loanNo: 'DSL17421023520618258',
        customerName: '测试客户',
        status: 'pending_visit',
        amount: 100000,
      });
      setLoading(false);
    }, 500);
  }, [caseId]);

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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending_assign':
        return 'secondary' as const;
      case 'pending_visit':
        return 'secondary' as const;
      case 'following':
        return 'default' as const;
      case 'closed':
        return 'outline' as const;
      default:
        return 'outline' as const;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_assign':
        return '待分配';
      case 'pending_visit':
        return '待外访';
      case 'following':
        return '跟进中';
      case 'closed':
        return '已结案';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  案件详情
                </h1>
                <p className="text-sm text-slate-500">
                  贷款单号: {caseData.loanNo}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 案件卡片 */}
        <Card className="mb-6 overflow-hidden border-slate-200 shadow-sm">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {caseData.customerName}
                  </h2>
                  <Badge variant={getStatusBadgeVariant(caseData.status)}>
                    {getStatusLabel(caseData.status)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 block">贷款金额</span>
                    <span className="text-slate-900 font-mono font-semibold">
                      ¥{caseData.amount?.toLocaleString() || '0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 标签页 */}
        <Tabs defaultValue="legal" className="w-full">
          <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 mb-6 bg-transparent p-0 gap-2 h-auto">
            <TabsTrigger
              value="legal"
              className="py-3 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 data-[state=active]:bg-blue-50 data-[state=active]:border-blue-200 data-[state=active]:text-blue-700 shadow-sm"
            >
              <Scale className="w-4 h-4 mr-2" />
              法律诉讼
            </TabsTrigger>
          </TabsList>

          <TabsContent value="legal" className="mt-0">
            <div className="p-6">
              <LegalLitigationTab caseId={caseData?.id || ''} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}