import { NextRequest, NextResponse } from 'next/server';
import { getHSBCStats, getLatestBatchDate } from '@/lib/hsbc-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let batchDate = searchParams.get('batchDate') || '';

    // 如果没有指定批次日期，使用最新批次
    if (!batchDate) {
      batchDate = getLatestBatchDate() || '';
    }

    const stats = getHSBCStats(batchDate || undefined);

    return NextResponse.json({
      data: stats,
      batchDate,
    });
  } catch (error) {
    console.error('获取汇丰统计数据失败:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
