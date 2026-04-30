import { NextResponse } from 'next/server';
import { addSecurityHeaders, createSecureJsonResponse, successResponse } from '@/lib/security';

// 注销登录
export async function POST() {
  try {
    // 这里可以添加清理服务器端会话的逻辑
    // 例如：删除token、清理缓存等
    
    const response = createSecureJsonResponse(successResponse({ message: '注销成功' }));
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Logout error:', error);
    const response = createSecureJsonResponse({ success: false, message: '注销失败' }, { status: 500 });
    return addSecurityHeaders(response);
  }
}
