// 优化后的案件列表 API
import { NextRequest, NextResponse } from 'next/server';
import { getMockCases, setCache, clearCache } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const status = searchParams.get('status');
  const search = searchParams.get('search')?.toLowerCase();
  const riskLevel = searchParams.get('riskLevel');
  const fundingSource = searchParams.get('fundingSource');

  try {
    let cases = getMockCases() as Array<{
      id: string;
      caseNo: string;
      borrowerName: string;
      status: string;
      [key: string]: unknown;
    }>;

    // 筛选
    if (status && status !== 'all') {
      cases = cases.filter(c => c.status === status);
    }
    if (riskLevel && riskLevel !== 'all') {
      cases = cases.filter(c => c.riskLevel === riskLevel);
    }
    if (fundingSource && fundingSource !== 'all') {
      cases = cases.filter(c => c.fundingSource === fundingSource);
    }
    if (search) {
      cases = cases.filter(c =>
        c.caseNo.toLowerCase().includes(search.toLowerCase()) ||
        c.borrowerName.toLowerCase().includes(search.toLowerCase()) ||
        (c.borrowerPhone && String(c.borrowerPhone).includes(search))
      );
    }

    // 分页
    const total = cases.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paginatedCases = cases.slice(start, start + pageSize);

    return NextResponse.json({
      success: true,
      data: paginatedCases,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error('获取案件列表失败:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newCase = {
      id: Math.random().toString(36).substring(2, 15),
      caseNo: `CASE${Date.now()}`,
      status: 'pending_assign',
      createdAt: new Date().toISOString(),
      ...body,
    };

    clearCache('cases');
    return NextResponse.json({ success: true, data: newCase }, { status: 201 });
  } catch (error) {
    console.error('创建案件失败:', error);
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 });
  }
}
