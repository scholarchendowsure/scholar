import { NextRequest, NextResponse } from 'next/server';
import { HSBCLoan } from '@/lib/hsbc-loan';
import { getAllHSBCLoans } from '@/storage/database/hsbc-loan-storage';

// 获取统计数据
export async function GET(request: NextRequest) {
  try {
    const batchDate = request.nextUrl.searchParams.get('batchDate');
    const loans = await getAllHSBCLoans(batchDate || undefined);

    const totalLoans = loans.length;
    const totalAmount = loans.reduce((sum: number, l: HSBCLoan) => sum + (l.loanAmount || 0), 0);
    const totalBalance = loans.reduce((sum: number, l: HSBCLoan) => sum + (l.balance || 0), 0);
    const totalRepaid = loans.reduce((sum: number, l: HSBCLoan) => sum + (l.totalRepaid || 0), 0);
    const totalPastdue = loans.reduce((sum: number, l: HSBCLoan) => sum + (l.pastdueAmount || 0), 0);
    const overdueCount = loans.filter((l: HSBCLoan) => l.status === 'overdue').length;
    const normalCount = totalLoans - overdueCount;

    const usdLoans = loans.filter((l: HSBCLoan) => l.loanCurrency === 'USD');
    const cnyLoans = loans.filter((l: HSBCLoan) => l.loanCurrency === 'CNY');

    const stats = {
      totalLoans,
      totalAmount,
      totalBalance,
      totalRepaid,
      totalPastdueAmount: totalPastdue,
      overdueCount,
      normalCount,
      overdueRate: totalLoans > 0 ? ((overdueCount / totalLoans) * 100).toFixed(2) + '%' : '0%',
      cnyCount: cnyLoans.length,
      cnyAmount: cnyLoans.reduce((sum: number, l: HSBCLoan) => sum + (l.loanAmount || 0), 0),
      usdCount: usdLoans.length,
      usdAmount: usdLoans.reduce((sum: number, l: HSBCLoan) => sum + (l.loanAmount || 0), 0),
    };

    return NextResponse.json(stats);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '未知错误';
    console.error('Error calculating stats:', error);
    return NextResponse.json(
      { error: '计算统计失败: ' + msg },
      { status: 500 }
    );
  }
}
