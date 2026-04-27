// 优化后的案件详情 API
import { NextRequest, NextResponse } from 'next/server';
import { getMockCases, getMockFollowups, getMockRiskAssessments, setCache } from '@/lib/mock-data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cases = getMockCases() as Array<{ id: string }>;
    const caseItem = cases.find(c => c.id === id);

    if (!caseItem) {
      return NextResponse.json({ success: false, error: '案件不存在' }, { status: 404 });
    }

    // 获取关联数据
    const followups = getMockFollowups(id);
    const riskAssessments = getMockRiskAssessments(id);

    return NextResponse.json({
      success: true,
      data: {
        ...caseItem,
        followups,
        riskAssessments,
      },
    });
  } catch (error) {
    console.error('获取案件详情失败:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 实际场景中会更新数据库
    setCache(`case_${id}`, body);

    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error('更新案件失败:', error);
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // 软删除 - 实际场景中会更新 deletedAt
    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除案件失败:', error);
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}
