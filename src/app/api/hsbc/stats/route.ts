import { NextResponse } from 'next/server';
import { getMockHSBCStats } from '@/lib/hsbc-data';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchDate = searchParams.get('batchDate');

    // 获取统计数据（batchDate参数可用于筛选）
    const stats = getMockHSBCStats();

    // 如果指定了批次日期，可以在这里过滤数据
    // 目前返回全部数据
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching HSBC stats:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
