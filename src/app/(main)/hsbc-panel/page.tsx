'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LayoutDashboard,
  FileText,
  Settings,
  ChevronRight,
} from 'lucide-react';

export default function HSBCPanelPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">汇丰贷款管理</h1>
        <p className="text-muted-foreground mt-1">汇丰贷款专项管理模块</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/hsbc-panel/dashboard">
          <Card className="card-shadow hover:border-[hsl(210,95%,40%)] transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-[hsl(210,95%,40%)]" />
                汇丰仪表盘
              </CardTitle>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                查看汇丰贷款核心指标、逾期趋势、风险评定统计等
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/hsbc-panel/cases">
          <Card className="card-shadow hover:border-[hsl(210,95%,40%)] transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-[hsl(210,95%,40%)]" />
                汇丰案件列表
              </CardTitle>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                按商户维度管理汇丰贷款列表，支持筛选和导出
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/hsbc-panel/extension-merchants">
          <Card className="card-shadow hover:border-[hsl(210,95%,40%)] transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-[hsl(210,95%,40%)]" />
                展期商户管理
              </CardTitle>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                管理展期商户名单，展期商户不计入逾期统计
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
