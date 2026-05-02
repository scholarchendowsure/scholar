import { NextResponse } from 'next/server';
import { bitableConfigStorage } from '@/storage/database/feishu-bitable-storage';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const config = bitableConfigStorage.findById(id);
    
    if (!config) {
      return NextResponse.json(
        { success: false, message: '配置不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('获取飞书多维表格配置失败:', error);
    return NextResponse.json(
      { success: false, message: '获取配置失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updated = bitableConfigStorage.update(id, body);
    
    if (!updated) {
      return NextResponse.json(
        { success: false, message: '配置不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      config: updated,
    });
  } catch (error) {
    console.error('更新飞书多维表格配置失败:', error);
    return NextResponse.json(
      { success: false, message: '更新配置失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = bitableConfigStorage.delete(id);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: '配置不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '配置删除成功',
    });
  } catch (error) {
    console.error('删除飞书多维表格配置失败:', error);
    return NextResponse.json(
      { success: false, message: '删除配置失败' },
      { status: 500 }
    );
  }
}
