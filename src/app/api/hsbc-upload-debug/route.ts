import { NextRequest, NextResponse } from 'next/server';
import { getAllHSBCLoans, getAllBatchDates } from '@/storage/database/hsbc-loan-storage';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'check';

  try {
    if (action === 'check') {
      // 检查当前数据
      const allLoans = await getAllHSBCLoans();
      const batchDates = await getAllBatchDates();
      
      // 按批次分组
      const loansByBatch: Record<string, any[]> = {};
      allLoans.forEach((loan: any) => {
        const date = loan.batchDate || 'unknown';
        if (!loansByBatch[date]) {
          loansByBatch[date] = [];
        }
        loansByBatch[date].push({
          id: loan.id,
          loanReference: loan.loanReference,
          hasRepaymentSchedule: !!loan.repaymentSchedule && loan.repaymentSchedule.length > 0
        });
      });

      return NextResponse.json({
        success: true,
        message: '数据检查完成',
        batchDates,
        totalLoans: allLoans.length,
        loansByBatch: Object.entries(loansByBatch).map(([date, loans]) => ({
          batchDate: date,
          loanCount: loans.length,
          loans: loans.slice(0, 3) // 只显示前3条
        }))
      });
    }

    return NextResponse.json({ success: false, message: '未知操作' }, { status: 400 });
  } catch (error) {
    console.error('汇丰数据调试错误:', error);
    return NextResponse.json({
      success: false,
      message: '调试失败',
      error: (error as Error).message
    }, { status: 500 });
  }
}
