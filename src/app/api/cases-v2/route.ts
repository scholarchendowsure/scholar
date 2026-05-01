import { NextRequest, NextResponse } from 'next/server';
import { caseStorage } from '@/storage/database/case-storage';
import { addSecurityHeaders } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const riskLevel = searchParams.get('riskLevel') || 'all';

    let cases = await caseStorage.getAll();

    // 筛选
    if (search) {
      cases = cases.filter(c =>
        c.userId.includes(search) ||
        c.borrowerName.includes(search) ||
        c.borrowerPhone.includes(search)
      );
    }

    if (status !== 'all') {
      cases = cases.filter(c => c.status === status);
    }

    if (riskLevel !== 'all') {
      cases = cases.filter(c => c.riskLevel === riskLevel);
    }

    const total = cases.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCases = cases.slice(startIndex, endIndex);

    const response = NextResponse.json({
      success: true,
      data: paginatedCases,
      total,
      totalPages,
      page,
      pageSize,
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Get cases error:', error);
    const response = NextResponse.json(
      { success: false, error: '获取案件列表失败' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newCase = await caseStorage.create(body);

    const response = NextResponse.json({
      success: true,
      data: newCase,
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Create case error:', error);
    const response = NextResponse.json(
      { success: false, error: '创建案件失败' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
