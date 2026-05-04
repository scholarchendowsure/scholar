import { NextRequest, NextResponse } from 'next/server';
import { saveHSBCLoans, getAllHSBCLoans } from '@/storage/database/hsbc-loan-storage';
import { HSBCLoan } from '@/lib/hsbc-loan';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batchDate, mode, loans } = body as {
      batchDate: string;
      mode?: string;
      loans: HSBCLoan[];
    };

    if (!batchDate) {
      return NextResponse.json({ error: '未提供批次日期' }, { status: 400 });
    }

    if (!loans || !Array.isArray(loans) || loans.length === 0) {
      return NextResponse.json({ error: '未提供贷款数据' }, { status: 400 });
    }

    // 设置批次日期到每条贷款记录
    const loansWithBatch = loans.map((loan: HSBCLoan) => ({
      ...loan,
      batchDate: batchDate,
    }));

    // 保存到数据库
    await saveHSBCLoans(loansWithBatch);

    return NextResponse.json({
      success: true,
      importedCount: loans.length,
      batchDate,
      mode: mode || 'replace',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '未知错误';
    console.error('Import error:', error);
    return NextResponse.json(
      { error: '导入失败: ' + msg },
      { status: 500 }
    );
  }
}

// 获取导入状态
export async function GET() {
  try {
    const loans = await getAllHSBCLoans();
    return NextResponse.json({
      total: loans.length,
      lastImport: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '未知错误';
    console.error('Error getting import status:', error);
    return NextResponse.json(
      { error: '获取状态失败: ' + msg },
      { status: 500 }
    );
  }
}
