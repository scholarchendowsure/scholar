import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';

// Mock展期商户数据
let mockExtensionMerchants = [
  { id: '1', merchantId: 'M002', createdAt: '2024-01-15T00:00:00Z' },
  { id: '2', merchantId: 'M005', createdAt: '2024-01-20T00:00:00Z' },
];

// 获取展期商户列表
export async function GET() {
  try {
    return NextResponse.json(successResponse(mockExtensionMerchants));
  } catch (error) {
    console.error('Get extension merchants error:', error);
    return NextResponse.json(errorResponse('获取展期商户失败'), { status: 500 });
  }
}

// 添加展期商户
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.merchantId) {
      return NextResponse.json(errorResponse('请提供商户ID'), { status: 400 });
    }

    const newMerchant = {
      id: String(mockExtensionMerchants.length + 1),
      merchantId: body.merchantId,
      createdAt: new Date().toISOString(),
    };
    
    mockExtensionMerchants.push(newMerchant);

    return NextResponse.json(successResponse(newMerchant));
  } catch (error) {
    console.error('Add extension merchant error:', error);
    return NextResponse.json(errorResponse('添加展期商户失败'), { status: 500 });
  }
}

// 删除展期商户
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(errorResponse('请提供ID'), { status: 400 });
    }

    const index = mockExtensionMerchants.findIndex(m => m.id === id);
    if (index !== -1) {
      mockExtensionMerchants.splice(index, 1);
    }

    return NextResponse.json(successResponse({ message: '删除成功' }));
  } catch (error) {
    console.error('Delete extension merchant error:', error);
    return NextResponse.json(errorResponse('删除展期商户失败'), { status: 500 });
  }
}
