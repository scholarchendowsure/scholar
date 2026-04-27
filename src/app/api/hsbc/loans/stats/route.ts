import { NextRequest, NextResponse } from 'next/server';
import { calculateStats, HSBCLoan, generateSampleLoans } from '@/lib/hsbc-loan';

// 全局缓存
let cachedLoans: HSBCLoan[] | null = null;

// 获取缓存的贷款数据
function getCachedLoans(): HSBCLoan[] {
  if (!cachedLoans) {
    cachedLoans = generateSampleLoans();
  }
  return cachedLoans;
}

// 获取统计数据
export async function GET(request: NextRequest) {
  try {
    const loans = getCachedLoans();
    const stats = calculateStats(loans);

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error calculating stats:', error);
    return NextResponse.json(
      { error: '计算统计失败: ' + error.message },
      { status: 500 }
    );
  }
}
