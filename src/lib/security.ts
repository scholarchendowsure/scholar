import { NextResponse } from 'next/server';

// 登录尝试限制
const loginAttempts = new Map<string, { count: number; windowStart: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15分钟

// 验证码验证尝试限制
const captchaAttempts = new Map<string, { count: number; windowStart: number }>();
const MAX_CAPTCHA_ATTEMPTS = 3;
const CAPTCHA_WINDOW_MS = 5 * 60 * 1000; // 5分钟

// 修改密码尝试限制
const changePasswordAttempts = new Map<string, { count: number; windowStart: number }>();
const MAX_CHANGE_PASSWORD_ATTEMPTS = 3;
const CHANGE_PASSWORD_WINDOW_MS = 15 * 60 * 1000; // 15分钟

/**
 * 为NextResponse添加安全头
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content-Security-Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self';"
  );

  // X-Frame-Options
  response.headers.set('X-Frame-Options', 'DENY');

  // X-Content-Type-Options
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // X-XSS-Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Strict-Transport-Security (HSTS)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  return response;
}

/**
 * 创建带有安全头的JSON响应
 */
export function createSecureJsonResponse(data: any, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(data, init);
  return addSecurityHeaders(response);
}

/**
 * 标准错误响应格式
 */
export function errorResponse(message: string) {
  return { success: false, message };
}

/**
 * 标准成功响应格式
 */
export function successResponse(data?: any) {
  return { success: true, ...(data !== undefined && { data }) };
}

/**
 * 检查登录尝试次数限制
 */
export function checkLoginAttempts(ip: string): { allowed: boolean; message?: string } {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (attempt) {
    // 检查是否在时间窗口内
    if (now - attempt.windowStart < LOGIN_WINDOW_MS) {
      // 在时间窗口内
      if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
        return {
          allowed: false,
          message: '登录尝试次数过多，请15分钟后再试'
        };
      }
    } else {
      // 时间窗口已过，重置计数
      loginAttempts.set(ip, { count: 0, windowStart: now });
    }
  }

  return { allowed: true };
}

/**
 * 记录登录失败
 */
export function recordLoginFailure(ip: string) {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (attempt && now - attempt.windowStart < LOGIN_WINDOW_MS) {
    // 在时间窗口内，增加计数
    loginAttempts.set(ip, { ...attempt, count: attempt.count + 1 });
  } else {
    // 开始新的时间窗口
    loginAttempts.set(ip, { count: 1, windowStart: now });
  }
}

/**
 * 清除登录尝试记录
 */
export function clearLoginAttempts(ip: string) {
  loginAttempts.delete(ip);
}

/**
 * 检查验证码验证尝试次数限制
 */
export function checkCaptchaAttempts(ip: string): { allowed: boolean; message?: string } {
  const now = Date.now();
  const attempt = captchaAttempts.get(ip);

  if (attempt) {
    // 检查是否在时间窗口内
    if (now - attempt.windowStart < CAPTCHA_WINDOW_MS) {
      // 在时间窗口内
      if (attempt.count >= MAX_CAPTCHA_ATTEMPTS) {
        return {
          allowed: false,
          message: '验证码错误次数过多，请5分钟后再试'
        };
      }
    } else {
      // 时间窗口已过，重置计数
      captchaAttempts.set(ip, { count: 0, windowStart: now });
    }
  }

  return { allowed: true };
}

/**
 * 记录验证码验证失败
 */
export function recordCaptchaFailure(ip: string) {
  const now = Date.now();
  const attempt = captchaAttempts.get(ip);

  if (attempt && now - attempt.windowStart < CAPTCHA_WINDOW_MS) {
    // 在时间窗口内，增加计数
    captchaAttempts.set(ip, { ...attempt, count: attempt.count + 1 });
  } else {
    // 开始新的时间窗口
    captchaAttempts.set(ip, { count: 1, windowStart: now });
  }
}

/**
 * 清除验证码验证尝试记录
 */
export function clearCaptchaAttempts(ip: string) {
  captchaAttempts.delete(ip);
}

/**
 * 检查修改密码尝试次数限制
 */
export function checkChangePasswordAttempts(ip: string): { allowed: boolean; message?: string } {
  const now = Date.now();
  const attempt = changePasswordAttempts.get(ip);

  if (attempt) {
    // 检查是否在时间窗口内
    if (now - attempt.windowStart < CHANGE_PASSWORD_WINDOW_MS) {
      // 在时间窗口内
      if (attempt.count >= MAX_CHANGE_PASSWORD_ATTEMPTS) {
        return {
          allowed: false,
          message: '修改密码尝试次数过多，请15分钟后再试'
        };
      }
    } else {
      // 时间窗口已过，重置计数
      changePasswordAttempts.set(ip, { count: 0, windowStart: now });
    }
  }

  return { allowed: true };
}

/**
 * 记录修改密码失败
 */
export function recordChangePasswordFailure(ip: string) {
  const now = Date.now();
  const attempt = changePasswordAttempts.get(ip);

  if (attempt && now - attempt.windowStart < CHANGE_PASSWORD_WINDOW_MS) {
    // 在时间窗口内，增加计数
    changePasswordAttempts.set(ip, { ...attempt, count: attempt.count + 1 });
  } else {
    // 开始新的时间窗口
    changePasswordAttempts.set(ip, { count: 1, windowStart: now });
  }
}

/**
 * 清除修改密码尝试记录
 */
export function clearChangePasswordAttempts(ip: string) {
  changePasswordAttempts.delete(ip);
}

/**
 * 验证密码强度
 */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: '密码长度至少8位' };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    return { valid: false, message: '密码必须包含大小写字母和数字' };
  }

  return { valid: true };
}

/**
 * 获取客户端IP
 */
export function getClientIP(request: Request): string {
  // 从headers获取IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}
