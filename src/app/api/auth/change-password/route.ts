import { NextResponse } from 'next/server';
import { userStorage } from '@/storage/database/user-storage';
import {
  addSecurityHeaders,
  createSecureJsonResponse,
  errorResponse,
  successResponse,
  checkChangePasswordAttempts,
  recordChangePasswordFailure,
  clearChangePasswordAttempts
} from '@/lib/security';

// 修改密码
export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    
    // 检查修改密码尝试限制
    const attemptCheck = checkChangePasswordAttempts(ip);
    if (!attemptCheck.allowed) {
      const response = createSecureJsonResponse(errorResponse(attemptCheck.message || '修改密码尝试次数过多'), { status: 429 });
      return addSecurityHeaders(response);
    }

    const body = await request.json();
    const { currentPassword, newPassword, userId } = body;

    if (!currentPassword || !newPassword) {
      const response = createSecureJsonResponse(errorResponse('请输入当前密码和新密码'), { status: 400 });
      return addSecurityHeaders(response);
    }

    // 从Authorization header获取用户ID（如果没有提供userId）
    let targetUserId = userId;
    if (!targetUserId) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        const response = createSecureJsonResponse(errorResponse('未授权'), { status: 401 });
        return addSecurityHeaders(response);
      }
        
      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        
        // 验证token是否过期
        if (decoded.exp && Date.now() > decoded.exp) {
          const response = createSecureJsonResponse(errorResponse('token已过期'), { status: 401 });
          return addSecurityHeaders(response);
        }
        
        targetUserId = decoded.userId;
      } catch {
        const response = createSecureJsonResponse(errorResponse('无效的token'), { status: 401 });
        return addSecurityHeaders(response);
      }
    }

    if (!targetUserId) {
      const response = createSecureJsonResponse(errorResponse('用户ID缺失'), { status: 400 });
      return addSecurityHeaders(response);
    }

    // 查找用户
    const user = userStorage.findById(targetUserId as string);
    if (!user) {
      const response = createSecureJsonResponse(errorResponse('用户不存在'), { status: 404 });
      return addSecurityHeaders(response);
    }

    // 使用userStorage的changePassword方法
    const result = userStorage.changePassword(targetUserId as string, currentPassword, newPassword);
    
    if (!result.success) {
      recordChangePasswordFailure(ip);
      const response = createSecureJsonResponse(errorResponse(result.message || '密码修改失败'), { status: 400 });
      return addSecurityHeaders(response);
    }
    
    // 清除尝试记录
    clearChangePasswordAttempts(ip);

    const response = createSecureJsonResponse(successResponse({ message: '密码修改成功' }));
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Change password error:', error);
    const response = createSecureJsonResponse(errorResponse('密码修改失败'), { status: 500 });
    return addSecurityHeaders(response);
  }
}
