import { NextResponse } from 'next/server';
import { getBatchDates } from '@/lib/hsbc-data';

export async function GET() {
  try {
    const dates = getBatchDates();
    return NextResponse.json({ data: dates });
  } catch (error) {
    console.error('获取批次日期失败:', error);
    return NextResponse.json({ error: '获取批次日期失败' }, { status: 500 });
  }
}
