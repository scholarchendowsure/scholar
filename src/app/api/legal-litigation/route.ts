import { NextRequest, NextResponse } from 'next/server';
import {
  getLitigationByCaseId,
  saveLitigation,
  deleteLitigation,
  LitigationRecord,
  LimitHighRecord,
  EndCaseRecord,
  CourtNoticeRecord
} from '@/storage/database/legal-litigation-storage';

// 获取法律诉讼数据
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const caseId = searchParams.get('caseId');
    const userId = searchParams.get('userId');

    if (!caseId && !userId) {
      return NextResponse.json({ success: false, error: '缺少caseId或userId参数' }, { status: 400 });
    }

    const litigation = getLitigationByCaseId(caseId || userId || '');
    
    return NextResponse.json({
      success: true,
      data: litigation
    });
  } catch (error) {
    console.error('获取法律诉讼数据失败:', error);
    return NextResponse.json({ success: false, error: '获取数据失败' }, { status: 500 });
  }
}

// 保存法律诉讼数据
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      caseId,
      litigationRecords,
      limitHighRecords,
      endCaseRecords,
      courtNoticeRecords
    } = body;

    if (!caseId) {
      return NextResponse.json({ success: false, error: '缺少caseId参数' }, { status: 400 });
    }

    // 转换前端组件字段名为存储字段名
    const convertLitigationRecord = (record: any) => ({
      id: record.id || '',
      caseName: record.caseName || '',
      caseRole: record.caseIdentity || record.caseRole || '', // caseIdentity -> caseRole
      caseNumber: record.caseNumber || '',
      caseReason: record.caseCause || record.caseReason || '', // caseCause -> caseReason
      amount: record.caseAmount || record.amount || '', // caseAmount -> amount
      latestProcess: record.caseProgress || record.latestProcess || '', // caseProgress -> latestProcess
      courtName: record.courtName || ''
    });

    const convertLimitRecord = (record: any) => ({
      id: record.id || '',
      caseNumber: record.caseNumber || '',
      target: record.limitObject || record.target || '', // limitObject -> target
      relatedPerson: record.relatedObject || record.relatedPerson || '', // relatedObject -> relatedPerson
      applicant: record.applicant || '',
      court: record.executionCourt || record.court || '',
      filingDate: record.filingDate || '',
      publishDate: record.publishDate || ''
    });

    const convertEndCaseRecord = (record: any) => ({
      id: record.id || '',
      caseNumber: record.caseNumber || '',
      subject: record.subjectName || record.subject || '',
      unfulfilledAmount: record.unpaidAmount || record.unfulfilledAmount || '',
      executionAmount: record.executionAmount || '',
      court: record.executionCourt || record.court || '',
      filingDate: record.filingDate || '',
      endDate: record.endDate || ''
    });

    const convertCourtNoticeRecord = (record: any) => ({
      id: record.id || '',
      caseNumber: record.caseNumber || '',
      caseReason: record.caseCause || record.caseReason || '',
      parties: record.parties || '',
      court: record.court || '',
      hearingDate: record.hearingDate || ''
    });

    saveLitigation(caseId, {
      caseId,
      judicialCases: (litigationRecords || []).map(convertLitigationRecord),
      '限制高消费': (limitHighRecords || []).map(convertLimitRecord),
      '终本案件': (endCaseRecords || []).map(convertEndCaseRecord),
      '开庭公告': (courtNoticeRecords || []).map(convertCourtNoticeRecord),
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, message: '保存成功' });
  } catch (error) {
    console.error('保存法律诉讼数据失败:', error);
    return NextResponse.json({ success: false, error: '保存失败' }, { status: 500 });
  }
}

// 删除法律诉讼数据
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const caseId = searchParams.get('caseId');

    if (!caseId) {
      return NextResponse.json({ success: false, error: '缺少caseId参数' }, { status: 400 });
    }

    deleteLitigation(caseId);

    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除法律诉讼数据失败:', error);
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}
