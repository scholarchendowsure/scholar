import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';
import { userStorage } from '@/storage/database/user-storage';
import { INITIAL_PASSWORD } from '@/types/user';

// 获取用户详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = userStorage.findById(id);

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
    
    // 如果是重置密码
    if (body.action === 'reset_password') {
      const result = userStorage.resetPassword(id);
      if (!result.success) {
        return NextResponse.json(errorResponse(result.message || '重置密码失败'), { status: 400 });
      }
      return NextResponse.json(successResponse({
        message: result.message,
        initialPassword: INITIAL_PASSWORD,
      }));
    }
    
    // 如果是解锁
    if (body.action === 'unlock') {
      const success = userStorage.unlockUser(id);
      if (!success) {
        return NextResponse.json(errorResponse('解锁失败'), { status: 400 });
      }
      return NextResponse.json(successResponse({ message: '用户已解锁' }));
    }
    
    // 如果是启用/停用
    if (body.action === 'toggle_status') {
      const user = userStorage.findById(id);
      if (!user) {
        return NextResponse.json(errorResponse('用户不存在'), { status: 404 });
      }
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      userStorage.update(id, { status: newStatus });
      return NextResponse.json(successResponse({ 
        message: newStatus === 'active' ? '用户已启用' : '用户已停用',
        status: newStatus,
      }));
    }

    // 普通更新
    const updateData: Record<string, unknown> = {};
    if (body.realName !== undefined) updateData.realName = body.realName;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.department !== undefined) updateData.department = body.department;
    if (body.position !== undefined) updateData.position = body.position;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.allowedIps !== undefined) updateData.allowedIps = body.allowedIps;

    const updatedUser = userStorage.update(id, updateData);
    if (!updatedUser) {
      return NextResponse.json(errorResponse('用户不存在'), { status: 404 });
    }

    return NextResponse.json(successResponse(updatedUser));
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
    const success = userStorage.delete(id);
    
    if (!success) {
      return NextResponse.json(errorResponse('用户不存在'), { status: 404 });
    }

    return NextResponse.json(successResponse({ message: '删除成功' }));
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(errorResponse('删除用户失败'), { status: 500 });
  }
}
