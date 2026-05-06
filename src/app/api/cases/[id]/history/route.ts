import { NextRequest, NextResponse } from 'next/server';
import { getCaseHistory } from '@/storage/database/case-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = params.id;
    const history = getCaseHistory(caseId);
    
    return NextResponse.json({
      success: true,
      history: history
    });
  } catch (error) {
    console.error('获取案件历史失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '获取历史记录失败' 
      },
      { status: 500 }
    );
  }
}
