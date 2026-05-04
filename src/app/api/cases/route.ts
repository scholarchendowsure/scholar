import { NextRequest, NextResponse } from 'next/server';
import { caseStorageOptimized } from '@/storage/database/case-storage-optimized';
import { addSecurityHeaders } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status');
    const riskLevel = searchParams.get('riskLevel');
    const search = searchParams.get('search');
    
    // 构建查询选项
    const options: any = { page, pageSize, status, riskLevel, search };
    
    // 添加所有筛选字段
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith('filter')) {
        options[key] = value;
      }
    }

    // 使用优化后的查询
    const result = await caseStorageOptimized.query(options);

    return addSecurityHeaders(NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      totalPages: result.totalPages,
    }));
  } catch (error) {
    console.error('Get cases error:', error);
    return addSecurityHeaders(NextResponse.json({
      success: false,
      error: '获取案件列表失败',
    }, { status: 500 }));
  }
}
