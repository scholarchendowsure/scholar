import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';

// Mock用户数据 - 与auth/route.ts保持一致
let mockUsers = [
  { id: '1', sequence: 1, name: '张三', username: 'zhangsan', email: 'zhangsan@example.com', password: 'admin123', department: '外访部', role: 'agent', status: 'active', lastLoginTime: '2024-01-20T09:00:00Z', createdAt: '2024-01-01T00:00:00Z' },
  { id: '2', sequence: 2, name: '李四', username: 'lisi', email: 'lisi@example.com', password: 'admin123', department: '外访部', role: 'agent', status: 'active', lastLoginTime: '2024-01-19T18:00:00Z', createdAt: '2024-01-01T00:00:00Z' },
  { id: '3', sequence: 3, name: '王五', username: 'wangwu', email: 'wangwu@example.com', password: 'admin123', department: '管理部', role: 'manager', status: 'active', lastLoginTime: '2024-01-20T08:30:00Z', createdAt: '2024-01-01T00:00:00Z' },
  { id: '4', sequence: 4, name: '管理员', username: 'days', email: 'admin@example.com', password: '9469832.qaz', department: '管理部', role: 'admin', status: 'active', lastLoginTime: '2024-01-20T10:00:00Z', createdAt: '2024-01-01T00:00:00Z' },
];

// 修改密码
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword, userId } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(errorResponse('请输入当前密码和新密码'), { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json(errorResponse('新密码长度至少6位'), { status: 400 });
    }

    // 从Authorization header获取用户ID（如果没有提供userId）
    let targetUserId = userId;
    if (!targetUserId) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return NextResponse.json(errorResponse('未授权'), { status: 401 });
      }
      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        targetUserId = decoded.userId;
      } catch {
        return NextResponse.json(errorResponse('无效的token'), { status: 401 });
      }
    }

    const user = mockUsers.find(u => u.id === targetUserId);
    if (!user) {
      return NextResponse.json(errorResponse('用户不存在'), { status: 404 });
    }

    // 验证当前密码
    if (user.password !== currentPassword) {
      return NextResponse.json(errorResponse('当前密码错误'), { status: 400 });
    }

    // 更新密码
    user.password = newPassword;

    return NextResponse.json(successResponse({ message: '密码修改成功' }));
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(errorResponse('密码修改失败'), { status: 500 });
  }
}
