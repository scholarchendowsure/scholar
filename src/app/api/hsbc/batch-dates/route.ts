import { NextResponse } from 'next/server';
import { getAllBatchDates } from '@/storage/database/hsbc-loan-storage';

export async function GET() {
  try {
    const batchDates = await getAllBatchDates();
    return NextResponse.json({ data: batchDates });
  } catch (error) {
    console.error('获取批次日期失败:', error);
    return NextResponse.json({ error: '获取批次日期失败' }, { status: 500 });
  }
}
