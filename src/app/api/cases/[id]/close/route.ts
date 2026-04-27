import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';

// Mock结案数据
const mockClosures = [
  { id: '1', caseId: '4', closureType: 'full_repayment', closureNote: '全额还款完成', actualRepaymentAmount: '420000.00', closedBy: '李四', closedAt: '2024-01-20T10:00:00Z', createdAt: '2024-01-20T10:00:00Z' },
];

// 案件结案
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // 验证必填字段
    if (!body.closureType) {
      return NextResponse.json(errorResponse('请选择结案类型'), { status: 400 });
    }
    if (!body.actualRepaymentAmount) {
      return NextResponse.json(errorResponse('请填写实际回款金额'), { status: 400 });
    }

    const newClosure = {
      id: String(mockClosures.length + 1),
      caseId: id,
      closureType: body.closureType,
      closureNote: body.closureNote || '',
      actualRepaymentAmount: body.actualRepaymentAmount,
      closedBy: body.closedBy || '系统用户',
      closedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    
    mockClosures.push(newClosure);

    return NextResponse.json(successResponse({
      ...newClosure,
      closedAt: formatDateTime(newClosure.closedAt),
      createdAt: formatDateTime(newClosure.createdAt),
    }));
  } catch (error) {
    console.error('Close case error:', error);
    return NextResponse.json(errorResponse('结案操作失败'), { status: 500 });
  }
}
