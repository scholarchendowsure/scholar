import { NextRequest, NextResponse } from 'next/server';
import { caseStorage } from '@/storage/database/case-storage';
import { addSecurityHeaders } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status');
    const riskLevel = searchParams.get('riskLevel');
    const search = searchParams.get('search');

    let cases = await caseStorage.getAll();

    // 过滤
    if (status && status !== 'all') {
      cases = cases.filter(c => c.status === status);
    }
    if (riskLevel && riskLevel !== 'all') {
      cases = cases.filter(c => c.riskLevel === riskLevel);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      // 支持多用户ID搜索（空格分隔）
      const searchTerms = searchLower.trim().split(/\s+/).filter(Boolean);
      
      cases = cases.filter(c => {
        // 如果只有一个搜索词，搜索所有字段
        if (searchTerms.length === 1) {
          const singleTerm = searchTerms[0];
          return c.borrowerName.toLowerCase().includes(singleTerm) ||
                 c.loanNo.toLowerCase().includes(singleTerm) ||
                 c.userId.toLowerCase().includes(singleTerm);
        } else {
          // 多个搜索词，只匹配用户ID（任一匹配）
          return searchTerms.some(term => c.userId.toLowerCase().includes(term));
        }
      });
    }

    const total = cases.length;
    const totalPages = Math.ceil(total / pageSize);
    
    // 分页
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedCases = cases.slice(start, end);

    return addSecurityHeaders(NextResponse.json({
      success: true,
      data: paginatedCases,
      total,
      totalPages,
    }));
  } catch (error) {
    console.error('Get cases error:', error);
    return addSecurityHeaders(NextResponse.json({
      success: false,
      error: '获取案件列表失败',
    }, { status: 500 }));
  }
}
