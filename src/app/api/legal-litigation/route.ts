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

    const litigation = getLitigationByCaseId(caseId || userId);
    
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

    saveLitigation(caseId, {
      caseId,
      litigationRecords: litigationRecords || [],
      limitHighRecords: limitHighRecords || [],
      endCaseRecords: endCaseRecords || [],
      courtNoticeRecords: courtNoticeRecords || [],
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
