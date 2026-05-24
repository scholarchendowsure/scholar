'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { LegalLitigationTab } from '@/components/legal-litigation-tab';
import { Button } from '@/components/ui/button';

export default function TestCaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;

  // 使用硬编码的测试案件ID
  const testCaseId = 'DSL17421023520618258';

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">测试案件详情页面</h1>
          <p className="text-muted-foreground">测试案件ID: {testCaseId}</p>
        </div>
        <Link href="/cases">
          <Button variant="outline">返回案件列表</Button>
        </Link>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg">
        <p className="text-lg">请点击下方的法律诉讼标签页，测试文件上传功能</p>
      </div>

      <LegalLitigationTab caseId={testCaseId} />
    </div>
  );
}
