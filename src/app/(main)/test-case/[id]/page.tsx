'use client';

import React, { useState } from 'react';
import { LegalLitigationTab } from '@/components/legal-litigation-tab';

export default function TestRealCasePage() {
  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-6">测试MainLayout下的文件上传</h1>
      <LegalLitigationTab caseId="case-001" caseNumber="DSL17421023520618258" />
    </div>
  );
}