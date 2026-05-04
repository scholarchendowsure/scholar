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
    console.log('=== 登录请求开始 ===');
    
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    
    console.log('请求IP:', ip);
    
    // 检查登录尝试限制
    const attemptCheck = checkLoginAttempts(ip);
    if (!attemptCheck.allowed) {
      console.log('登录尝试次数过多，拒绝');
      const response = createSecureJsonResponse(errorResponse(attemptCheck.message || '登录尝试次数过多'), { status: 429 });
      return addSecurityHeaders(response);
    }

    const body = await request.json();
    const { username, password, captcha, captchaId } = body;
    
    console.log('请求参数:', { 
      username: username, 
      password: password ? '***' : 'missing',
      captcha: captcha,
      captchaId: captchaId 
    });

    if (!username || !password) {
      console.log('用户名或密码缺失');
      const response = createSecureJsonResponse(errorResponse('请输入用户名和密码'), { status: 400 });
      return addSecurityHeaders(response);
    }

    // 验证码验证
    if (!captcha || !captchaId) {
      console.log('验证码或验证码ID缺失');
      const response = createSecureJsonResponse(errorResponse('请输入验证码'), { status: 400 });
      return addSecurityHeaders(response);
    }

    // 检查验证码尝试限制
    const captchaAttemptCheck = checkCaptchaAttempts(ip);
    if (!captchaAttemptCheck.allowed) {
      console.log('验证码错误次数过多');
      const response = createSecureJsonResponse(errorResponse(captchaAttemptCheck.message || '验证码错误次数过多'), { status: 429 });
      return addSecurityHeaders(response);
    }

    const storedCaptcha = captchaStorage.getCaptcha(captchaId);
    console.log('存储的验证码:', storedCaptcha ? { id: storedCaptcha.id, answer: storedCaptcha.answer } : 'not found');
    
    if (!storedCaptcha) {
      console.log('验证码已过期');
      recordCaptchaFailure(ip);
      const response = createSecureJsonResponse(errorResponse('验证码已过期，请刷新'), { status: 400 });
      return addSecurityHeaders(response);
    }

    if (storedCaptcha.expires < Date.now()) {
      console.log('验证码已过期（时间检查）');
      captchaStorage.deleteCaptcha(captchaId);
      recordCaptchaFailure(ip);
      const response = createSecureJsonResponse(errorResponse('验证码已过期，请刷新'), { status: 400 });
      return addSecurityHeaders(response);
    }

    console.log('验证码比对:', { 
      输入: captcha.toLowerCase(), 
      存储: storedCaptcha.answer.toLowerCase(),
      匹配: storedCaptcha.answer.toLowerCase() === captcha.toLowerCase()
    });
    
    if (storedCaptcha.answer.toLowerCase() !== captcha.toLowerCase()) {
      console.log('验证码错误');
      recordCaptchaFailure(ip);
      const response = createSecureJsonResponse(errorResponse('验证码错误'), { status: 400 });
      return addSecurityHeaders(response);
    }

    // 验证成功，删除验证码防止重用
    console.log('验证码验证成功');
    captchaStorage.deleteCaptcha(captchaId);
    clearCaptchaAttempts(ip);

    // 验证用户
    console.log('开始查找用户:', username);
    const user = userStorage.findByUsername(username);
    console.log('找到的用户:', user ? { id: user.id, username: user.username, realName: user.realName } : 'not found');
    
    if (!user) {
      console.log('用户不存在');
      userStorage.recordLoginFailure(username);
      const response = createSecureJsonResponse(errorResponse('用户名或密码错误'), { status: 401 });
      return addSecurityHeaders(response);
    }

    // 检查账号是否锁定
    if (userStorage.isLocked(user)) {
      console.log('账号已锁定');
      const response = createSecureJsonResponse(errorResponse('账号已被锁定，请1小时后重试或联系管理员解锁'), { status: 403 });
      return addSecurityHeaders(response);
    }

    // 检查账号状态
    if (user.status === 'inactive') {
      console.log('账户已被停用');
      const response = createSecureJsonResponse(errorResponse('账户已被停用'), { status: 403 });
      return addSecurityHeaders(response);
    }

    // 检查IP是否允许
    if (!userStorage.checkIpAllowed(user, ip)) {
      console.log('当前IP不允许登录');
      const response = createSecureJsonResponse(errorResponse('当前IP不允许登录'), { status: 403 });
      return addSecurityHeaders(response);
    }

    // 验证密码
    console.log('开始验证密码');
    const passwordValid = userStorage.verifyPassword(user, password);
    console.log('密码验证结果:', passwordValid);
    
    if (!passwordValid) {
      console.log('密码验证失败');
      const result = userStorage.recordLoginFailure(username);
      if (result.locked) {
        console.log('密码连续错误5次，账号已锁定');
        const response = createSecureJsonResponse(errorResponse('密码连续错误5次，账号已锁定1小时'), { status: 403 });
        return addSecurityHeaders(response);
      }
      const response = createSecureJsonResponse(errorResponse(`用户名或密码错误，剩余${5 - user.loginAttempts - 1}次尝试`), { status: 401 });
      return addSecurityHeaders(response);
    }

    console.log('密码验证成功');
    
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

    console.log('登录成功，返回响应');
    console.log('=== 登录请求结束 ===');

    const response = createSecureJsonResponse(successResponse({
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        role: user.role,
        email: user.email,
        phone: user.phone,
        department: user.department,
        mustChangePassword: user.mustChangePassword,
      }
    }));
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('=== 登录异常 ===');
    console.error('Login error:', error);
    console.error('=== 异常结束 ===');
    const response = createSecureJsonResponse(errorResponse('登录失败'), { status: 500 });
    return addSecurityHeaders(response);
  }
}