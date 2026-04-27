import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';

// Mock角色数据
const mockRoles = [
  { id: '1', name: '管理员', description: '系统管理员', permissions: ['*'], createdAt: '2024-01-01T00:00:00Z' },
  { id: '2', name: '经理', description: '部门经理', permissions: ['cases:*', 'users:read', 'reports:read'], createdAt: '2024-01-01T00:00:00Z' },
  { id: '3', name: '外访员', description: '外访人员', permissions: ['cases:read', 'cases:update', 'followups:*'], createdAt: '2024-01-01T00:00:00Z' },
];

// 获取角色列表
export async function GET() {
  try {
    return NextResponse.json(successResponse(mockRoles));
  } catch (error) {
    console.error('Get roles error:', error);
    return NextResponse.json(errorResponse('获取角色列表失败'), { status: 500 });
  }
}

// 创建角色
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json(errorResponse('请填写角色名称'), { status: 400 });
    }

    const newRole = {
      id: String(mockRoles.length + 1),
      name: body.name,
      description: body.description || '',
      permissions: body.permissions || [],
      createdAt: new Date().toISOString(),
    };
    
    mockRoles.push(newRole);

    return NextResponse.json(successResponse(newRole));
  } catch (error) {
    console.error('Create role error:', error);
    return NextResponse.json(errorResponse('创建角色失败'), { status: 500 });
  }
}
