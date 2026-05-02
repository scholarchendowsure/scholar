import { NextRequest, NextResponse } from 'next/server';
import { caseStorage } from '@/storage/database/case-storage';
import { addSecurityHeaders } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      const response = NextResponse.json(
        { success: false, error: '请选择要恢复的案件' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    const restoredCount = await caseStorage.restore(ids);

    const response = NextResponse.json({
      success: true,
      message: `已恢复 ${restoredCount} 个案件`,
      restoredCount,
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Restore cases error:', error);
    const response = NextResponse.json(
      { success: false, error: '恢复案件失败' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
