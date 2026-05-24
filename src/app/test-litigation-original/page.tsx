'use client';

import { LegalLitigationTab } from '@/components/legal-litigation-tab';

export default function TestLitigationOriginalPage() {
  // 测试用的案件ID - 使用用户提供的贷款单号
  const testCaseId = 'DSL17421023520618258';

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">
          测试法律诉讼标签页（原始功能）
        </h1>
        
        <div className="bg-white rounded-lg p-4 mb-4 border border-slate-200">
          <p className="text-slate-600">
            <strong>测试案件ID:</strong> {testCaseId}
          </p>
          <p className="text-slate-500 text-sm mt-2">
            请点击下方的"导入Excel"按钮，测试原始的文件上传功能
          </p>
        </div>

        <LegalLitigationTab caseId={testCaseId} />
      </div>
    </div>
  );
}