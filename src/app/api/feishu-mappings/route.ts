import { NextRequest, NextResponse } from 'next/server';
import { 
  getMerchantSalesFeishuMappings, 
  createMerchantSalesFeishuMapping,
  updateMerchantSalesFeishuMapping,
  deleteMerchantSalesFeishuMapping,
  getMappingByMerchantId
} from '@/storage/database/feishu-config-storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    
    if (merchantId) {
      const mapping = await getMappingByMerchantId(merchantId);
      return NextResponse.json({
        success: true,
        mapping,
      });
    }
    
    const mappings = await getMerchantSalesFeishuMappings();
    return NextResponse.json({
      success: true,
      mappings,
    });
  } catch (error) {
    console.error('获取映射失败:', error);
    return NextResponse.json(
      { success: false, message: '获取映射失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { merchantId, salesName, feishuUserId, feishuUserName } = body;

    if (!merchantId || !salesName) {
      return NextResponse.json(
        { success: false, message: '商户ID和销售人员名称不能为空' },
        { status: 400 }
      );
    }

    const mapping = await createMerchantSalesFeishuMapping({
      merchantId,
      salesName,
      feishuUserId,
      feishuUserName,
    });

    return NextResponse.json({
      success: true,
      mapping,
      message: '映射创建成功',
    });
  } catch (error) {
    console.error('创建映射失败:', error);
    return NextResponse.json(
      { success: false, message: '创建映射失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: '映射ID不能为空' },
        { status: 400 }
      );
    }

    const mapping = await updateMerchantSalesFeishuMapping(id, updates);

    if (!mapping) {
      return NextResponse.json(
        { success: false, message: '映射不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      mapping,
      message: '映射更新成功',
    });
  } catch (error) {
    console.error('更新映射失败:', error);
    return NextResponse.json(
      { success: false, message: '更新映射失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: '映射ID不能为空' },
        { status: 400 }
      );
    }

    const deleted = await deleteMerchantSalesFeishuMapping(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: '映射不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '映射删除成功',
    });
  } catch (error) {
    console.error('删除映射失败:', error);
    return NextResponse.json(
      { success: false, message: '删除映射失败' },
      { status: 500 }
    );
  }
}
