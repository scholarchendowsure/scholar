import { NextRequest, NextResponse } from 'next/server';
import { caseStorage } from '@/storage/database/case-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const cases = await caseStorage.getByUserId(userId);
    
    return NextResponse.json({
      success: true,
      data: cases,
      total: cases.length
    });
  } catch (error) {
    console.error('获取用户贷款失败:', error);
    return NextResponse.json(
      { success: false, error: '获取用户贷款失败' },
      { status: 500 }
    );
  }
}
