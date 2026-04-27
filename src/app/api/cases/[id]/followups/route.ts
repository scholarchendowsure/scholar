import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';

// Mock跟进数据
const mockFollowups = [
  { id: '1', caseId: '2', visitUser: '张三', visitTime: '2024-01-16T14:00:00Z', visitResult: '成功拜访', communicationContent: '借款人表示愿意还款，但目前资金紧张', repaymentIntention: '有', nextPlan: '两周后再联系', promiseRepaymentDate: '2024-02-01', promiseRepaymentAmount: '50000', createdAt: '2024-01-16T15:00:00Z' },
  { id: '2', caseId: '3', visitUser: '张三', visitTime: '2024-01-17T10:30:00Z', visitResult: '成功拜访', communicationContent: '借款人承诺下周五还款', repaymentIntention: '有', nextPlan: '等待还款', promiseRepaymentDate: '2024-01-25', promiseRepaymentAmount: '30000', createdAt: '2024-01-17T11:00:00Z' },
];

// 获取案件的跟进记录
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const followups = mockFollowups
      .filter(f => f.caseId === id)
      .map(f => ({
        ...f,
        visitTime: formatDateTime(f.visitTime),
        createdAt: formatDateTime(f.createdAt),
      }));

    return NextResponse.json(successResponse(followups));
  } catch (error) {
    console.error('Get followups error:', error);
    return NextResponse.json(errorResponse('获取跟进记录失败'), { status: 500 });
  }
}

// 创建跟进记录
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const newFollowup = {
      id: String(mockFollowups.length + 1),
      caseId: id,
      ...body,
      visitTime: body.visitTime || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    
    mockFollowups.push(newFollowup);

    return NextResponse.json(successResponse({
      ...newFollowup,
      visitTime: formatDateTime(newFollowup.visitTime),
      createdAt: formatDateTime(newFollowup.createdAt),
    }));
  } catch (error) {
    console.error('Create followup error:', error);
    return NextResponse.json(errorResponse('创建跟进记录失败'), { status: 500 });
  }
}
