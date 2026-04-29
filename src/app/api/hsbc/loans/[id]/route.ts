import { NextRequest, NextResponse } from 'next/server';
import type { HSBCLoanLog } from '@/lib/hsbc-loan';
import { getAllLoans } from '@/lib/hsbc-data';

// 操作日志存储 (内存中)
const loanLogs: Map<string, HSBCLoanLog[]> = new Map();

// 获取贷款详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // 直接从 JSON 缓存文件获取贷款数据
    const allLoans = getAllLoans();
    const loan = allLoans.find(l => l.loanReference === id);

    if (!loan) {
      return NextResponse.json({ error: '贷款不存在' }, { status: 404 });
    }

    // 获取该贷款的操作日志
    const logs = loanLogs.get(id) || [];

    return NextResponse.json({
      loan,
      logs,
    });
  } catch (error: any) {
    console.error('Error fetching loan detail:', error);
    return NextResponse.json(
      { error: '获取详情失败: ' + error.message },
      { status: 500 }
    );
  }
}

// 更新贷款信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // 检查贷款是否存在
    const allLoans = getAllLoans();
    const existingLoan = allLoans.find(l => l.loanReference === id);
    if (!existingLoan) {
      return NextResponse.json({ error: '贷款不存在' }, { status: 404 });
    }

    // 记录操作日志
    const log: HSBCLoanLog = {
      id: `log_${Date.now()}`,
      loanId: id,
      action: body.action || 'update',
      operator: body.operator || 'System',
      timestamp: new Date().toISOString(),
      details: body.details || '贷款信息已更新',
    };
    const logs = loanLogs.get(id) || [];
    logs.unshift(log);
    loanLogs.set(id, logs.slice(0, 100));

    return NextResponse.json({
      success: true,
      loan: existingLoan,
      log,
    });
  } catch (error: any) {
    console.error('Error updating loan:', error);
    return NextResponse.json(
      { error: '更新失败: ' + error.message },
      { status: 500 }
    );
  }
}
