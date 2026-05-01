import { NextResponse } from 'next/server';
import { userStorage } from '@/storage/database/user-storage';
import { captchaStorage } from '@/storage/database/captcha-storage';
import {
  addSecurityHeaders,
  createSecureJsonResponse,
  errorResponse,
  successResponse,
  checkLoginAttempts,
  clearLoginAttempts,
  checkCaptchaAttempts,
  recordCaptchaFailure,
  clearCaptchaAttempts,
} from '@/lib/security';

// 登录认证
export async function POST(request: Request) {
  try {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    
    // 检查登录尝试限制
    const attemptCheck = checkLoginAttempts(ip);
    if (!attemptCheck.allowed) {
      const response = createSecureJsonResponse(errorResponse(attemptCheck.message || '登录尝试次数过多'), { status: 429 });
      return addSecurityHeaders(response);
    }

    const body = await request.json();
    const { username, password, captcha, captchaId } = body;

    if (!username || !password) {
      const response = createSecureJsonResponse(errorResponse('请输入用户名和密码'), { status: 400 });
      return addSecurityHeaders(response);
    }

    // 验证码验证
    if (!captcha || !captchaId) {
      const response = createSecureJsonResponse(errorResponse('请输入验证码'), { status: 400 });
      return addSecurityHeaders(response);
    }

    // 检查验证码尝试限制
    const captchaAttemptCheck = checkCaptchaAttempts(ip);
    if (!captchaAttemptCheck.allowed) {
      const response = createSecureJsonResponse(errorResponse(captchaAttemptCheck.message || '验证码错误次数过多'), { status: 429 });
      return addSecurityHeaders(response);
    }

    const storedCaptcha = captchaStorage.getCaptcha(captchaId);
    if (!storedCaptcha) {
      recordCaptchaFailure(ip);
      const response = createSecureJsonResponse(errorResponse('验证码已过期，请刷新'), { status: 400 });
      return addSecurityHeaders(response);
    }

    if (storedCaptcha.expires < Date.now()) {
      captchaStorage.deleteCaptcha(captchaId);
      recordCaptchaFailure(ip);
      const response = createSecureJsonResponse(errorResponse('验证码已过期，请刷新'), { status: 400 });
      return addSecurityHeaders(response);
    }

    if (storedCaptcha.answer.toLowerCase() !== captcha.toLowerCase()) {
      recordCaptchaFailure(ip);
      const response = createSecureJsonResponse(errorResponse('验证码错误'), { status: 400 });
      return addSecurityHeaders(response);
    }

    // 验证成功，删除验证码防止重用
    captchaStorage.deleteCaptcha(captchaId);
    clearCaptchaAttempts(ip);

    // 验证用户
    const user = userStorage.findByUsername(username);
    if (!user) {
      userStorage.recordLoginFailure(username);
      const response = createSecureJsonResponse(errorResponse('用户名或密码错误'), { status: 401 });
      return addSecurityHeaders(response);
    }

    // 检查账号是否锁定
    if (userStorage.isLocked(user)) {
      const response = createSecureJsonResponse(errorResponse('账号已被锁定，请1小时后重试或联系管理员解锁'), { status: 403 });
      return addSecurityHeaders(response);
    }

    // 检查账号状态
    if (user.status === 'inactive') {
      const response = createSecureJsonResponse(errorResponse('账户已被停用'), { status: 403 });
      return addSecurityHeaders(response);
    }

    // 检查IP是否允许
    if (!userStorage.checkIpAllowed(user, ip)) {
      const response = createSecureJsonResponse(errorResponse('当前IP不允许登录'), { status: 403 });
      return addSecurityHeaders(response);
    }

    // 验证密码
    if (!userStorage.verifyPassword(user, password)) {
      const result = userStorage.recordLoginFailure(username);
      if (result.locked) {
        const response = createSecureJsonResponse(errorResponse('密码连续错误5次，账号已锁定1小时'), { status: 403 });
        return addSecurityHeaders(response);
      }
      const response = createSecureJsonResponse(errorResponse(`用户名或密码错误，剩余${5 - user.loginAttempts - 1}次尝试`), { status: 401 });
      return addSecurityHeaders(response);
    }

    // 登录成功，清除尝试记录
    clearLoginAttempts(ip);
    userStorage.recordLoginSuccess(user.id, ip, request.headers.get('user-agent') || '');

    // 生成简单的token（实际项目中应使用JWT）
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      username: user.username,
      role: user.role,
      exp: Date.now() + 24 * 60 * 60 * 1000 // 24小时后过期
    })).toString('base64');

    const response = createSecureJsonResponse(successResponse({
      token,
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        role: user.role,
        email: user.email,
        phone: user.phone,
        department: user.department,
      }
    }));
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Login error:', error);
    const response = createSecureJsonResponse(errorResponse('登录失败'), { status: 500 });
    return addSecurityHeaders(response);
  }
}
