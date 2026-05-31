import { NextRequest, NextResponse } from 'next/server';
import { caseStorage } from '@/storage/database/case-storage';
import { addSecurityHeaders } from '@/lib/security';

// ============ P0优化：查询结果缓存 ============
interface QueryCacheItem {
  data: any;
  timestamp: number;
}

const queryCache = new Map<string, QueryCacheItem>();
const CACHE_TTL = 5000; // 5秒缓存
let queryCacheHits = 0;
let queryCacheMisses = 0;

// 导出缓存清除函数，供其他API（如followups）在数据变更后调用
export function clearQueryCache() {
  queryCache.clear();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status');
    const riskLevel = searchParams.get('riskLevel');
    const search = searchParams.get('search');
    const enableDedup = searchParams.get('enableDedup') === 'true';
    
    // ============ P0优化：查询结果缓存 ============
    // 生成缓存key
    const cacheKey = `query:${searchParams.toString()}`;
    
    // 检查缓存
    const cached = queryCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && now - cached.timestamp < CACHE_TTL) {
      // ✅ 缓存命中！
      queryCacheHits++;
      if (queryCacheHits % 20 === 0) {
        console.log(`[Query Cache] Hits: ${queryCacheHits}, Misses: ${queryCacheMisses}`);
      }
      return addSecurityHeaders(NextResponse.json(cached.data));
    }
    
    // ❌ 缓存未命中，执行查询
    queryCacheMisses++;
    
    // 构建查询选项
    const options: any = { 
      page: enableDedup ? 1 : page,
      pageSize: enableDedup ? 10000 : pageSize,
      status, 
      riskLevel, 
      search,
      useLightData: true  // ✅ 使用轻量数据（不包含base64大字段）
    };
    
    // 添加所有筛选字段
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith('filter')) {
        options[key] = value;
      }
      // 支持按贷款单号精确查找
      if (key === 'loanNo') {
        options.loanNo = value;
      }
    }

    // 使用统一的查询
    const result = await caseStorage.query();

    // 简单的筛选和分页
    let processedData = result;
    
    // 应用状态筛选
    if (status) {
      processedData = processedData.filter(c => c.status === status);
    }
    
    // 应用风险等级筛选
    if (riskLevel) {
      processedData = processedData.filter(c => c.riskLevel === riskLevel);
    }
    
    // 应用搜索
    if (search) {
      const lowerSearch = search.toLowerCase();
      processedData = processedData.filter(c => 
        c.borrowerName?.toLowerCase().includes(lowerSearch) || 
        c.loanNo?.toLowerCase().includes(lowerSearch)
      );
    }
    
    // 后端去重逻辑
    if (enableDedup) {
      // 按用户ID分组，保留逾期金额最大的
      const userMap = new Map<string, any>();
      
      processedData.forEach(c => {
        const existing = userMap.get(c.userId!);
        if (!existing) {
          userMap.set(c.userId!, c);
        } else {
          const currentOverdue = c.overdueAmount || 0;
          const existingOverdue = existing.overdueAmount || 0;
          if (currentOverdue > existingOverdue) {
            userMap.set(c.userId!, c);
          }
        }
      });

      processedData = Array.from(userMap.values());
    }
    
    // 应用分页
    const total = processedData.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedData = processedData.slice(start, end);

    const responseData = {
      success: true,
      data: paginatedData,
      total,
      totalPages,
    };
    
    // ============ P0优化：保存到查询缓存 ============
    queryCache.set(cacheKey, {
      data: responseData,
      timestamp: now
    });
    
    // 清理过期缓存，防止内存泄漏
    if (queryCache.size > 200) {
      for (const [key, item] of queryCache) {
        if (now - item.timestamp > CACHE_TTL) {
          queryCache.delete(key);
        }
      }
    }
    
    if (queryCacheMisses % 20 === 0) {
      console.log(`[Query Cache] Hits: ${queryCacheHits}, Misses: ${queryCacheMisses}, Cache size: ${queryCache.size}`);
    }

    return addSecurityHeaders(NextResponse.json(responseData));
  } catch (error) {
    console.error('Get cases error:', error);
    return addSecurityHeaders(NextResponse.json({
      success: false,
      error: '获取案件列表失败',
    }, { status: 500 }));
  }
}
