import { NextRequest, NextResponse } from 'next/server';
import {
  getAllMerchantSalesMappings,
  saveMerchantSalesMappings,
  updateMerchantSalesMapping,
  deleteMerchantSalesMapping,
  deleteMerchantSalesMappings,
} from '@/storage/database/merchant-sales-mapping-storage';

export async function GET() {
  try {
    const mappings = await getAllMerchantSalesMappings();
    return NextResponse.json({ success: true, data: mappings });
  } catch (error) {
    console.error('获取商户-销售映射关系失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mappings, mode = 'replace' } = body;

    if (!mappings || !Array.isArray(mappings)) {
      return NextResponse.json(
        { success: false, error: '请提供有效的映射关系数据' },
        { status: 400 }
      );
    }

    await saveMerchantSalesMappings(mappings, mode);
    return NextResponse.json({ success: true, message: '保存成功' });
  } catch (error) {
    console.error('保存商户-销售映射关系失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '保存失败' },
      { status: 500 }
    );
  }
}
