import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';

// Mock用户数据
let mockUsers = [
  { id: '1', sequence: 1, name: '张三', username: 'zhangsan', email: 'zhangsan@example.com', password: 'admin123', department: '外访部', role: 'agent', status: 'active', lastLoginTime: '2024-01-20T09:00:00Z', createdAt: '2024-01-01T00:00:00Z' },
  { id: '2', sequence: 2, name: '李四', username: 'lisi', email: 'lisi@example.com', password: 'admin123', department: '外访部', role: 'agent', status: 'active', lastLoginTime: '2024-01-19T18:00:00Z', createdAt: '2024-01-01T00:00:00Z' },
  { id: '3', sequence: 3, name: '王五', username: 'wangwu', email: 'wangwu@example.com', password: 'admin123', department: '管理部', role: 'manager', status: 'active', lastLoginTime: '2024-01-20T08:30:00Z', createdAt: '2024-01-01T00:00:00Z' },
  { id: '4', sequence: 4, name: '管理员', username: 'admin', email: 'admin@example.com', password: 'admin123', department: '管理部', role: 'admin', status: 'active', lastLoginTime: '2024-01-20T10:00:00Z', createdAt: '2024-01-01T00:00:00Z' },
];

// 获取用户详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = mockUsers.find(u => u.id === id);

    if (!user) {
      return NextResponse.json(errorResponse('用户不存在'), { status: 404 });
    }

    return NextResponse.json(successResponse(user));
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(errorResponse('获取用户详情失败'), { status: 500 });
  }
}

// 更新用户
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const index = mockUsers.findIndex(u => u.id === id);

    if (index === -1) {
      return NextResponse.json(errorResponse('用户不存在'), { status: 404 });
    }

    mockUsers[index] = {
      ...mockUsers[index],
      name: body.name ?? mockUsers[index].name,
      email: body.email ?? mockUsers[index].email,
      department: body.department ?? mockUsers[index].department,
      role: body.role ?? mockUsers[index].role,
      status: body.status ?? mockUsers[index].status,
      password: body.password ?? mockUsers[index].password,
    };

    return NextResponse.json(successResponse(mockUsers[index]));
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(errorResponse('更新用户失败'), { status: 500 });
  }
}

// 删除用户
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const index = mockUsers.findIndex(u => u.id === id);

    if (index === -1) {
      return NextResponse.json(errorResponse('用户不存在'), { status: 404 });
    }

    mockUsers.splice(index, 1);

    return NextResponse.json(successResponse({ message: '删除成功' }));
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(errorResponse('删除用户失败'), { status: 500 });
  }
}
