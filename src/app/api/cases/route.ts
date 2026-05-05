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
    }

    // 使用统一的查询
    const result = await caseStorage.query(options);

    // 不再需要在API层剥离大字段，因为query已经使用轻量数据
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

    const responseData = {
      success: true,
      data: processedData,
      total: processedTotal,
      totalPages: processedTotalPages,
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
