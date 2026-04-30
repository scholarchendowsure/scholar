import { NextRequest, NextResponse } from 'next/server';
import {
  getMerchantSalesMapping,
  updateMerchantSalesMapping,
  deleteMerchantSalesMapping,
} from '@/storage/database/merchant-sales-mapping-storage';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const mapping = await getMerchantSalesMapping(id);
    if (!mapping) {
      return NextResponse.json(
        { success: false, error: '映射关系不存在' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: mapping });
  } catch (error) {
    console.error('获取商户-销售映射关系失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { feishuName } = body;

    if (!feishuName) {
      return NextResponse.json(
        { success: false, error: '请提供飞书名称' },
        { status: 400 }
      );
    }

    await updateMerchantSalesMapping(id, { feishuName });
    return NextResponse.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新商户-销售映射关系失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await deleteMerchantSalesMapping(id);
    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除商户-销售映射关系失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}
