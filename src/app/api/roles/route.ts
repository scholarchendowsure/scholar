import { NextRequest, NextResponse } from 'next/server';
import * as roleStorage from '@/storage/database/role-storage';

export async function GET(req: NextRequest) {
  try {
    const roles = roleStorage.getAllRoles();
    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    console.error('Failed to get roles:', error);
    return NextResponse.json(
      { success: false, error: '获取角色列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const { name, code, description, permissions } = body;
    
    if (!name || !code || !Array.isArray(permissions)) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }
    
    const newRole = roleStorage.createRole({
      name,
      code,
      description,
      permissions,
      isSystem: false,
    });
    
    return NextResponse.json({ success: true, data: newRole });
  } catch (error) {
    console.error('Failed to create role:', error);
    if (error instanceof Error && error.message.includes('已存在')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: '创建角色失败' },
      { status: 500 }
    );
  }
}
