import { NextRequest, NextResponse } from 'next/server';
import * as roleStorage from '@/storage/database/role-storage';

type Params = Promise<{ id: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const role = roleStorage.getRoleById(id);
    
    if (!role) {
      return NextResponse.json(
        { success: false, error: '角色不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: role });
  } catch (error) {
    console.error('Failed to get role:', error);
    return NextResponse.json(
      { success: false, error: '获取角色详情失败' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    const { name, code, description, permissions } = body;
    
    const updatedRole = roleStorage.updateRole(id, {
      name,
      code,
      description,
      permissions,
    });
    
    if (!updatedRole) {
      return NextResponse.json(
        { success: false, error: '角色不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: updatedRole });
  } catch (error) {
    console.error('Failed to update role:', error);
    if (error instanceof Error && (error.message.includes('已存在') || error.message.includes('不能修改'))) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: '更新角色失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    
    const success = roleStorage.deleteRole(id);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: '角色不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete role:', error);
    if (error instanceof Error && error.message.includes('不能删除')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: '删除角色失败' },
      { status: 500 }
    );
  }
}
