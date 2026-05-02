import { NextRequest, NextResponse } from 'next/server';
import { caseStorage } from '@/storage/database/case-storage';
import { addSecurityHeaders } from '@/lib/security';

export async function GET() {
  try {
    const recycleBin = await caseStorage.getRecycleBin();
    
    // 转换格式供前端使用
    const formattedData = recycleBin.map(item => ({
      id: item.id,
      caseNo: item.caseData.loanNo,
      borrowerName: item.caseData.borrowerName,
      debtAmount: item.caseData.overdueAmount?.toString() || '0',
      status: item.caseData.status,
      deletedAt: item.deletedAt,
      deletedBy: item.deletedBy,
    }));

    const response = NextResponse.json({
      success: true,
      data: formattedData,
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Get recycle bin error:', error);
    const response = NextResponse.json(
      { success: false, error: '获取回收站失败' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
