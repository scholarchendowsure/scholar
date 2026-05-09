/**
 * 企业信用资产评估表 API
 * 按案件ID保存和获取评估表数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEvaluationByCaseId, saveEvaluation } from '@/storage/database/case-evaluation-storage';

// 获取评估表数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    if (!caseId) {
      return NextResponse.json({ success: false, message: '缺少案件ID' }, { status: 400 });
    }

    const data = getEvaluationByCaseId(caseId);

    if (!data) {
      return NextResponse.json({ success: false, message: '未找到评估表数据' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('获取评估表数据失败:', error);
    return NextResponse.json(
      { success: false, message: '获取评估表数据失败' },
      { status: 500 }
    );
  }
}

// 保存评估表数据
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, formData, evaluationData } = body;
    const dataToSave = formData || evaluationData;

    if (!caseId) {
      return NextResponse.json({ success: false, message: '缺少案件ID' }, { status: 400 });
    }

    saveEvaluation(caseId, dataToSave);

    return NextResponse.json({ success: true, message: '评估表数据保存成功' });
  } catch (error) {
    console.error('保存评估表数据失败:', error);
    return NextResponse.json(
      { success: false, message: '保存评估表数据失败' },
      { status: 500 }
    );
  }
}
