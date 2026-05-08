import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';
import { getAllMerchantSalesMappings } from '@/storage/database/merchant-sales-mapping-storage';

// 获取商户-销售映射关系列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10000');
    
    const offset = (page - 1) * pageSize;
    const result = await getAllMerchantSalesMappings(offset, pageSize);

    // 转换格式，使用 salesName 而不是 salesFeishuName，与前端保持一致
    const data = result.mappings.map(m => ({
      ...m,
      salesName: m.salesFeishuName,
    }));

    return NextResponse.json(successResponse({
      data,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    }));
  } catch (error) {
    console.error('Get merchant sales mappings error:', error);
    return NextResponse.json(errorResponse('获取商户-销售映射关系失败'), { status: 500 });
  }
}
