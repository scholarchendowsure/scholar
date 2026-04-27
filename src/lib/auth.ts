import { type RequestCookie } from 'next/dist/compiled/@edge-runtime/cookies';

const TOKEN_COOKIE_NAME = 'auth_token';
const USER_COOKIE_NAME = 'current_user';

// Token 有效期 24 小时
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000;

// 简单的 token 生成
export function generateToken(userId: string): string {
  const payload = {
    userId,
    exp: Date.now() + TOKEN_EXPIRY,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// 验证 token
export function verifyToken(token: string): { userId: string; exp: number } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// 从请求中获取 token
export function getTokenFromRequest(cookies: { get: (name: string) => RequestCookie | undefined }): string | null {
  const cookie = cookies.get(TOKEN_COOKIE_NAME);
  return cookie?.value || null;
}

// 创建认证 cookies
export function createAuthCookies(token: string, userData: Record<string, unknown>) {
  return {
    auth_token: {
      name: TOKEN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: TOKEN_EXPIRY / 1000,
    },
    current_user: {
      name: USER_COOKIE_NAME,
      value: Buffer.from(JSON.stringify(userData)).toString('base64'),
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: TOKEN_EXPIRY / 1000,
    },
  };
}

// 清除认证 cookies
export function clearAuthCookies() {
  return {
    auth_token: {
      name: TOKEN_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 0,
    },
    current_user: {
      name: USER_COOKIE_NAME,
      value: '',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 0,
    },
  };
}

// 获取当前用户数据
export function getCurrentUser(cookies: { get: (name: string) => RequestCookie | undefined }) {
  const cookie = cookies.get(USER_COOKIE_NAME);
  if (!cookie?.value) return null;
  try {
    return JSON.parse(Buffer.from(cookie.value, 'base64').toString());
  } catch {
    return null;
  }
}

// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 创建成功响应
export function successResponse<T>(data?: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

// 创建错误响应
export function errorResponse(error: string): ApiResponse {
  return {
    success: false,
    error,
  };
}
