import { NextRequest, NextResponse } from 'next/server';
import { caseStorage } from '@/storage/database/case-storage';
import { clearQueryCache } from '@/app/api/cases/route';
import type { FollowUp } from '@/types/case';

/**
 * GET /api/cases/[id]/followups - 获取案件的跟进记录
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseData = await caseStorage.getById(id);

    if (!caseData) {
      return NextResponse.json(
        { success: false, error: '案件不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: caseData.followups || [],
    });
  } catch (error) {
    console.error('获取跟进记录失败:', error);
    return NextResponse.json(
      { success: false, error: '获取跟进记录失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cases/[id]/followups - 创建跟进记录
 * 支持同步到同用户ID的所有案件
 * 
 * 请求体:
 * {
 *   followup: FollowUp,           // 跟进记录数据
 *   syncToSameUser?: boolean,     // 是否同步到同用户ID的所有案件（默认true）
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { followup, syncToSameUser = true } = body;

    if (!followup) {
      return NextResponse.json(
        { success: false, error: '缺少跟进记录数据' },
        { status: 400 }
      );
    }

    // 1. 获取当前案件
    const caseData = await caseStorage.getById(id);
    if (!caseData) {
      return NextResponse.json(
        { success: false, error: '案件不存在' },
        { status: 404 }
      );
    }

    // 2. 构造跟进记录
    const followupRecord: FollowUp = {
      id: followup.id || Date.now().toString(),
      follower: followup.follower || '未登记人',
      followTime: followup.followTime || new Date().toISOString(),
      followType: followup.followType,
      contact: followup.contact,
      followResult: followup.followResult,
      followRecord: followup.followRecord || '',
      fileInfo: followup.fileInfo,
      createdAt: followup.createdAt || new Date().toISOString(),
      createdBy: followup.createdBy || followup.follower || '未登记人',
    };

    // 3. 添加跟进记录到当前案件
    const updatedFollowups = [...(caseData.followups || []), followupRecord];
    console.log(`[Followup API] 添加跟进记录到案件 ${id}, 原有${caseData.followups?.length || 0}条, 新增后${updatedFollowups.length}条`);
    await caseStorage.update(id, { followups: updatedFollowups });

    // 清除列表API的查询缓存，确保后续请求返回最新数据
    clearQueryCache();

    let syncedCount = 0;

    // 4. 如果需要，同步到同用户ID的所有案件
    if (syncToSameUser && caseData.userId) {
      const relatedCases = await caseStorage.getByUserId(caseData.userId);
      const otherCases = relatedCases.filter(c => c.id !== id);

      // 对每个其他案件也添加跟进记录
      for (const relatedCase of otherCases) {
        try {
          const relatedFollowups = [...(relatedCase.followups || []), followupRecord];
          await caseStorage.update(relatedCase.id, { followups: relatedFollowups });
          syncedCount++;
        } catch (err) {
          console.error(`同步跟进记录到案件 ${relatedCase.id} 失败:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: followupRecord,
      syncedCount,
      message: `跟进记录保存成功${syncedCount > 0 ? `，已同步到 ${syncedCount} 个相关案件` : ''}`,
    });
  } catch (error) {
    console.error('创建跟进记录失败:', error);
    return NextResponse.json(
      { success: false, error: '创建跟进记录失败' },
      { status: 500 }
    );
  }
}
