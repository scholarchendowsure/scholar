import { NextRequest, NextResponse } from 'next/server';
import type { HSBCLoanLog } from '@/lib/hsbc-loan';
import { getHSBCLoanByReference } from '@/storage/database/hsbc-loan-storage';
import { getHSBCLockedResponse } from '@/lib/hsbc-lock';

// 操作日志存储 (内存中)
const loanLogs: Map<string, HSBCLoanLog[]> = new Map();

// 获取贷款详情 (保持可用)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // 从数据库获取贷款数据
    const loan = await getHSBCLoanByReference(id);

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

// 更新贷款信息 (已锁定)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return getHSBCLockedResponse();
}
