import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';
import { formatDate, formatDateTime } from '@/lib/utils';

// Mock数据
const mockCases = [
  { id: '1', caseNo: 'CASE20240001', borrowerName: '陈小明', borrowerIdCard: '310***********1234', borrowerPhone: '138****5678', address: '上海市浦东新区张江镇XX路123号', debtAmount: '150000.00', status: 'pending_assign', overdueDays: 45, riskLevel: '中', fundingSource: '银行A', createdAt: '2024-01-15T10:00:00Z' },
  { id: '2', caseNo: 'CASE20240002', borrowerName: '刘小红', borrowerIdCard: '320***********5678', borrowerPhone: '139****8765', address: '南京市玄武区XX街456号', debtAmount: '280000.00', status: 'pending_visit', overdueDays: 62, riskLevel: '高', fundingSource: '银行A', createdAt: '2024-01-14T09:30:00Z' },
];

const mockFollowups = [
  { id: '1', caseId: '2', visitUser: '张三', visitTime: '2024-01-16T14:00:00Z', visitResult: '成功拜访', communicationContent: '借款人表示愿意还款，但目前资金紧张', repaymentIntention: '有', nextPlan: '两周后再联系', promiseRepaymentDate: '2024-02-01', promiseRepaymentAmount: '50000', createdAt: '2024-01-16T15:00:00Z' },
];

const mockClosures = [
  { id: '1', caseId: '4', closureType: 'full_repayment', closureNote: '全额还款完成', actualRepaymentAmount: '420000.00', closedBy: '李四', closedAt: '2024-01-20T10:00:00Z' },
];

const mockRiskAssessments = [
  { id: '1', caseId: '2', riskLevel: '中', shopStatusTags: ['店铺正常营业', '客流一般'], assetTags: ['有房产'], repaymentTags: ['有还款意愿'], result: '建议持续跟进', createdAt: '2024-01-16T16:00:00Z' },
];

// 获取案件详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseData = mockCases.find(c => c.id === id);

    if (!caseData) {
      return NextResponse.json(errorResponse('案件不存在'), { status: 404 });
    }

    const followups = mockFollowups.filter(f => f.caseId === id).map(f => ({
      ...f,
      visitTime: formatDateTime(f.visitTime),
      createdAt: formatDateTime(f.createdAt),
    }));

    const closures = mockClosures.filter(c => c.caseId === id).map(c => ({
      ...c,
      closedAt: formatDateTime(c.closedAt),
    }));

    const riskAssessments = mockRiskAssessments.filter(r => r.caseId === id).map(r => ({
      ...r,
      createdAt: formatDateTime(r.createdAt),
    }));

    return NextResponse.json(successResponse({
      ...caseData,
      followups,
      closures,
      riskAssessments,
      createdAt: formatDateTime(caseData.createdAt),
    }));
  } catch (error) {
    console.error('Get case error:', error);
    return NextResponse.json(errorResponse('获取案件详情失败'), { status: 500 });
  }
}

// 更新案件
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const index = mockCases.findIndex(c => c.id === id);

    if (index === -1) {
      return NextResponse.json(errorResponse('案件不存在'), { status: 404 });
    }

    mockCases[index] = { ...mockCases[index], ...body, updatedAt: new Date().toISOString() };

    return NextResponse.json(successResponse(mockCases[index]));
  } catch (error) {
    console.error('Update case error:', error);
    return NextResponse.json(errorResponse('更新案件失败'), { status: 500 });
  }
}

// 删除案件 (软删除)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const index = mockCases.findIndex(c => c.id === id);

    if (index === -1) {
      return NextResponse.json(errorResponse('案件不存在'), { status: 404 });
    }

    // 软删除
    mockCases[index].deletedAt = new Date().toISOString();

    return NextResponse.json(successResponse({ message: '删除成功' }));
  } catch (error) {
    console.error('Delete case error:', error);
    return NextResponse.json(errorResponse('删除案件失败'), { status: 500 });
  }
}
