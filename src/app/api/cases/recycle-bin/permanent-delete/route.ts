import { NextRequest, NextResponse } from 'next/server';
import { caseStorage } from '@/storage/database/case-storage';
import { addSecurityHeaders } from '@/lib/security';

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      const response = NextResponse.json(
        { success: false, error: '请选择要永久删除的案件' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    const deletedCount = await caseStorage.permanentDelete(ids);

    const response = NextResponse.json({
      success: true,
      message: `已永久删除 ${deletedCount} 个案件`,
      deletedCount,
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Permanent delete cases error:', error);
    const response = NextResponse.json(
      { success: false, error: '永久删除案件失败' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
