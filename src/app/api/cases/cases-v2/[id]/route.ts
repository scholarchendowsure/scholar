import { NextRequest, NextResponse } from 'next/server';
import { caseStorage } from '@/storage/database/case-storage';
import { addSecurityHeaders } from '@/lib/security';

// 辅助函数：获取或查找案件（支持UUID或贷款单号）
async function getCaseByIdOrLoanNo(idOrLoanNo: string) {
  // 先尝试用UUID查找
  let caseData = await caseStorage.getById(idOrLoanNo);
  if (caseData) return caseData;

  // 如果UUID找不到，尝试用贷款单号查找
  const allCases = await caseStorage.getAll();
  return allCases.find((c: any) => c.loanNo === idOrLoanNo);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseData = await getCaseByIdOrLoanNo(id);

    if (!caseData) {
      const response = NextResponse.json(
        { success: false, error: '案件不存在' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    const response = NextResponse.json({
      success: true,
      data: caseData,
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Get case error:', error);
    const response = NextResponse.json(
      { success: false, error: '获取案件详情失败' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // 先查找案件（支持UUID或贷款单号）
    const existingCase = await getCaseByIdOrLoanNo(id);
    if (!existingCase) {
      const response = NextResponse.json(
        { success: false, error: '案件不存在' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    // 使用真实的案件UUID更新
    const updatedCase = await caseStorage.update(existingCase.id, body);

    if (!updatedCase) {
      const response = NextResponse.json(
        { success: false, error: '案件不存在' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    const response = NextResponse.json({
      success: true,
      data: updatedCase,
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Update case error:', error);
    const response = NextResponse.json(
      { success: false, error: '更新案件失败' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 先查找案件（支持UUID或贷款单号）
    const existingCase = await getCaseByIdOrLoanNo(id);
    if (!existingCase) {
      const response = NextResponse.json(
        { success: false, error: '案件不存在' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    const success = await caseStorage.delete(existingCase.id);

    if (!success) {
      const response = NextResponse.json(
        { success: false, error: '案件不存在' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    const response = NextResponse.json({
      success: true,
      message: '删除成功',
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Delete case error:', error);
    const response = NextResponse.json(
      { success: false, error: '删除案件失败' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
