import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';

// Mock风险评定数据
const mockRiskAssessments = [
  { id: '1', caseId: '2', riskLevel: '中', shopStatusTags: ['店铺正常营业', '客流一般'], assetTags: ['有房产'], repaymentTags: ['有还款意愿'], result: '建议持续跟进', createdAt: '2024-01-16T16:00:00Z' },
];

// 获取案件的风险评定列表
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assessments = mockRiskAssessments
      .filter(r => r.caseId === id)
      .map(r => ({
        ...r,
        createdAt: formatDateTime(r.createdAt),
      }));

    return NextResponse.json(successResponse(assessments));
  } catch (error) {
    console.error('Get risk assessments error:', error);
    return NextResponse.json(errorResponse('获取风险评定失败'), { status: 500 });
  }
}

// 创建风险评定
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const newAssessment = {
      id: String(mockRiskAssessments.length + 1),
      caseId: id,
      riskLevel: body.riskLevel || '中',
      shopStatusTags: body.shopStatusTags || [],
      assetTags: body.assetTags || [],
      repaymentTags: body.repaymentTags || [],
      result: body.result || '',
      createdAt: new Date().toISOString(),
    };
    
    mockRiskAssessments.push(newAssessment);

    return NextResponse.json(successResponse({
      ...newAssessment,
      createdAt: formatDateTime(newAssessment.createdAt),
    }));
  } catch (error) {
    console.error('Create risk assessment error:', error);
    return NextResponse.json(errorResponse('创建风险评定失败'), { status: 500 });
  }
}
