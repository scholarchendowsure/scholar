import { NextRequest, NextResponse } from 'next/server';
import {
  getAllMerchantSalesMappings,
  batchImportMerchantSalesMappings,
} from '@/storage/database/merchant-sales-mapping-storage';

export async function GET() {
  try {
    const result = await getAllMerchantSalesMappings();
    // 转换字段名以匹配前端期望
    const formattedMappings = result.mappings.map(m => ({
      id: m.id,
      merchantId: m.merchantId,
      feishuName: m.salesFeishuName,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));
    return NextResponse.json({ success: true, data: formattedMappings });
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

    // 转换字段名
    const formattedMappings = mappings.map(m => ({
      merchantId: m.merchantId,
      salesFeishuName: m.feishuName || m.salesFeishuName,
    }));

    const result = await batchImportMerchantSalesMappings(formattedMappings, mode);
    return NextResponse.json({ success: true, message: '保存成功', data: result });
  } catch (error) {
    console.error('保存商户-销售映射关系失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '保存失败' },
      { status: 500 }
    );
  }
}
