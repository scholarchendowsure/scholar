import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';

// Mock还款记录数据
const mockRepaymentRecords = [
  { id: '1', caseId: '4', loanOrderNo: 'LOAN20240001', repaymentDate: '2024-01-20', repaymentAmount: 420000, currency: 'CNY', relatedPerson: '张小华', overdueAmount: 420000, repaymentRatio: 100, auditStatus: 'approved', auditAt: '2024-01-20T12:00:00Z', createdAt: '2024-01-20T10:00:00Z' },
  { id: '2', caseId: '3', loanOrderNo: 'LOAN20240002', repaymentDate: '2024-01-18', repaymentAmount: 30000, currency: 'CNY', relatedPerson: '王小二', overdueAmount: 95000, repaymentRatio: 31.58, auditStatus: 'pending', createdAt: '2024-01-18T14:00:00Z' },
  { id: '3', caseId: '2', loanOrderNo: 'LOAN20240003', repaymentDate: '2024-01-16', repaymentAmount: 50000, currency: 'CNY', relatedPerson: '刘小红', overdueAmount: 280000, repaymentRatio: 17.86, auditStatus: 'approved', auditAt: '2024-01-16T16:00:00Z', createdAt: '2024-01-16T15:00:00Z' },
];

// 获取全部还款记录
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const auditStatus = searchParams.get('auditStatus');
    const loanOrderNo = searchParams.get('loanOrderNo');

    let filteredRecords = [...mockRepaymentRecords];

    if (auditStatus) {
      filteredRecords = filteredRecords.filter(r => r.auditStatus === auditStatus);
    }
    if (loanOrderNo) {
      filteredRecords = filteredRecords.filter(r => r.loanOrderNo.includes(loanOrderNo));
    }

    const total = filteredRecords.length;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;
    const paginatedRecords = filteredRecords.slice(offset, offset + pageSize);

    return NextResponse.json(successResponse({
      data: paginatedRecords,
      total,
      page,
      pageSize,
      totalPages,
    }));
  } catch (error) {
    console.error('Get repayment records error:', error);
    return NextResponse.json(errorResponse('获取还款记录失败'), { status: 500 });
  }
}
