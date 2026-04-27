import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/auth';

// Mock批次日期数据
const mockBatchDates = ['2024-01-15', '2024-01-20', '2024-01-25'];

// 获取批次日期列表
export async function GET() {
  try {
    return NextResponse.json(successResponse(mockBatchDates));
  } catch (error) {
    console.error('Get batch dates error:', error);
    return NextResponse.json({ success: false, message: '获取批次日期失败' }, { status: 500 });
  }
}
