import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/auth';

// 注销登录
export async function POST() {
  try {
    // 这里可以清除服务端的token或session
    // 由于我们使用的是客户端token，这里只需要返回成功响应
    
    return NextResponse.json(successResponse({ message: '注销成功' }));
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: false, error: '注销失败' }, { status: 500 });
  }
}
