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
    const enableDedup = searchParams.get('enableDedup') === 'true'; // 新增去重参数
    
    // 构建查询选项
    const options: any = { 
      page: enableDedup ? 1 : page, // 去重时先获取所有数据
      pageSize: enableDedup ? 10000 : pageSize, // 去重时获取足够多的数据
      status, 
      riskLevel, 
      search 
    };
    
    // 添加所有筛选字段
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith('filter')) {
        options[key] = value;
      }
    }

    // 使用统一的查询
    const result = await caseStorage.query(options);

    let processedData = result.data;
    let processedTotal = result.total;
    let processedTotalPages = result.totalPages;

    // 后端去重逻辑（更快！）
    if (enableDedup) {
      // 按用户ID分组，保留逾期金额最大的
      const userMap = new Map<string, any>();
      
      result.data.forEach(c => {
        const existing = userMap.get(c.userId);
        if (!existing) {
          userMap.set(c.userId, c);
        } else {
          const currentOverdue = c.overdueAmount || 0;
          const existingOverdue = existing.overdueAmount || 0;
          if (currentOverdue > existingOverdue) {
            userMap.set(c.userId, c);
          }
        }
      });

      const dedupedData = Array.from(userMap.values());
      processedTotal = dedupedData.length;
      processedTotalPages = Math.ceil(processedTotal / pageSize);
      
      // 应用分页
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      processedData = dedupedData.slice(start, end);
    }

    return addSecurityHeaders(NextResponse.json({
      success: true,
      data: processedData,
      total: processedTotal,
      totalPages: processedTotalPages,
    }));
  } catch (error) {
    console.error('Get cases error:', error);
    return addSecurityHeaders(NextResponse.json({
      success: false,
      error: '获取案件列表失败',
    }, { status: 500 }));
  }
}
