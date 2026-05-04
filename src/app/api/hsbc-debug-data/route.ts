import { NextRequest, NextResponse } from 'next/server';
import { getAllHSBCLoans } from '@/storage/database/hsbc-loan-storage';
import type { HSBCLoan } from '@/lib/hsbc-loan';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    
    const allLoans: HSBCLoan[] = await getAllHSBCLoans();
    
    if (action === 'list-batches') {
      const batchDates = new Set<string>();
      
      allLoans.forEach((loan: HSBCLoan) => {
        if (loan.batchDate) {
          batchDates.add(loan.batchDate);
        }
      });
      
      const batchInfo = Array.from(batchDates).sort().map(batchDate => {
        const batchLoans = allLoans.filter((l: HSBCLoan) => l.batchDate === batchDate);
        const hasRepaymentSchedule = batchLoans.some((l: HSBCLoan) => 
          l.repaymentSchedule && l.repaymentSchedule.length > 0
        );
        const totalRepaymentCount = batchLoans.reduce((sum: number, l: HSBCLoan) => 
          sum + (l.repaymentSchedule?.length || 0), 0
        );
        
        return {
          batchDate,
          loanCount: batchLoans.length,
          hasRepaymentSchedule,
          totalRepaymentCount
        };
      });
      
      return NextResponse.json({
        success: true,
        message: `找到 ${batchDates.size} 个批次`,
        batches: batchInfo,
        totalLoans: allLoans.length
      });
    }
    
    if (action === 'batch-detail') {
      const batchDate = searchParams.get('batchDate');
      if (!batchDate) {
        return NextResponse.json({ error: '缺少batchDate参数' }, { status: 400 });
      }
      
      const batchLoans = allLoans.filter((l: HSBCLoan) => l.batchDate === batchDate);
      
      const loanDetails = batchLoans.map((loan: HSBCLoan) => ({
        id: loan.id,
        loanReference: loan.loanReference,
        merchantName: loan.merchantName,
        borrowerName: loan.borrowerName,
        hasRepaymentSchedule: loan.repaymentSchedule && loan.repaymentSchedule.length > 0,
        repaymentCount: loan.repaymentSchedule?.length || 0,
        repaymentSchedule: loan.repaymentSchedule?.slice(0, 3) // 只显示前3条
      }));
      
      return NextResponse.json({
        success: true,
        message: `批次 ${batchDate} 的详细数据`,
        batchDate,
        loanCount: batchLoans.length,
        loans: loanDetails
      });
    }
    
    return NextResponse.json({
      success: false,
      message: '请指定action参数: list-batches, batch-detail'
    }, { status: 400 });
    
  } catch (error) {
    console.error('汇丰数据调试失败:', error);
    return NextResponse.json({ error: '调试失败：' + (error instanceof Error ? error.message : '未知错误') }, { status: 500 });
  }
}
