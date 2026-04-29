import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';

// Mock用户数据
let mockUsers = [
  { id: '1', sequence: 1, name: '张三', username: 'zhangsan', email: 'zhangsan@example.com', password: 'admin123', department: '外访部', role: 'agent', status: 'active', lastLoginTime: '2024-01-20T09:00:00Z', createdAt: '2024-01-01T00:00:00Z' },
  { id: '2', sequence: 2, name: '李四', username: 'lisi', email: 'lisi@example.com', password: 'admin123', department: '外访部', role: 'agent', status: 'active', lastLoginTime: '2024-01-19T18:00:00Z', createdAt: '2024-01-01T00:00:00Z' },
  { id: '3', sequence: 3, name: '王五', username: 'wangwu', email: 'wangwu@example.com', password: 'admin123', department: '管理部', role: 'manager', status: 'active', lastLoginTime: '2024-01-20T08:30:00Z', createdAt: '2024-01-01T00:00:00Z' },
  { id: '4', sequence: 4, name: '管理员', username: 'admin', email: 'admin@example.com', password: 'admin123', department: '管理部', role: 'admin', status: 'active', lastLoginTime: '2024-01-20T10:00:00Z', createdAt: '2024-01-01T00:00:00Z' },
];

// 获取用户列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const keyword = searchParams.get('keyword') || '';
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    let filteredUsers = [...mockUsers];

    if (keyword) {
      filteredUsers = filteredUsers.filter(u =>
        u.name.includes(keyword) ||
        u.username.includes(keyword) ||
        (u.email && u.email.includes(keyword))
      );
    }
    if (role) {
      filteredUsers = filteredUsers.filter(u => u.role === role);
    }
    if (status) {
      filteredUsers = filteredUsers.filter(u => u.status === status);
    }

    const total = filteredUsers.length;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;
    const paginatedUsers = filteredUsers.slice(offset, offset + pageSize);

    return NextResponse.json(successResponse({
      data: paginatedUsers.map(u => ({
        ...u,
        lastLoginTime: u.lastLoginTime ? formatDateTime(u.lastLoginTime) : null,
        createdAt: formatDateTime(u.createdAt),
      })),
      total,
      page,
      pageSize,
      totalPages,
    }));
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(errorResponse('获取用户列表失败'), { status: 500 });
  }
}

// 创建用户
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.name || !body.username || !body.password) {
      return NextResponse.json(errorResponse('请填写必填字段'), { status: 400 });
    }

    // 检查用户名是否已存在
    if (mockUsers.some(u => u.username === body.username)) {
      return NextResponse.json(errorResponse('用户名已存在'), { status: 400 });
    }

    const newUser = {
      id: String(mockUsers.length + 1),
      sequence: mockUsers.length + 1,
      name: body.name,
      username: body.username,
      email: (body.email || '') as string,
      password: body.password,
      department: (body.department || '') as string,
      role: body.role || 'agent',
      status: 'active',
      lastLoginTime: '',
      createdAt: new Date().toISOString(),
    };
    
    mockUsers.push(newUser);

    return NextResponse.json(successResponse(newUser));
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(errorResponse('创建用户失败'), { status: 500 });
  }
}
