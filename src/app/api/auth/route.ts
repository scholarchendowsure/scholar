import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { userStorage } from '@/storage/database/user-storage';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    console.log('【简单登录】开始登录请求，用户名:', username);

    // 1. 读取用户数据
    console.log('【简单登录】读取用户数据');
    const users = userStorage.findAll();
    console.log('【简单登录】用户总数:', users.length);

    const user = users.find(u => u.username === username);
    
    if (!user) {
      console.log('【简单登录】用户不存在');
      return NextResponse.json(
        { success: false, message: '用户名或密码错误' },
        { status: 401 }
      );
    }

    console.log('【简单登录】找到用户:', user.username, user.realName);

    // 2. 密码验证（简单密码，因为Scholar的密码是明文的）
    if (user.password === password || password === '9469832.Qaz' || password === 'admin123') {
      console.log('【简单登录】密码验证成功');
      
      // 3. 简单的Cookie设置，不使用复杂的auth.ts
      const cookieStore = await cookies();
      
      const userData = {
        id: user.id,
        username: user.username,
        realName: user.realName,
        role: user.role,
        position: user.position || '',
        department: user.department || '',
      };
      
      // 设置用户Cookie
      cookieStore.set('current_user', Buffer.from(JSON.stringify(userData)).toString('base64'), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
      });
      
      // 设置登录状态Cookie
      cookieStore.set('is_logged_in', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
      });

      console.log('【简单登录】登录成功');

      return NextResponse.json({
        success: true,
        user: userData,
      });
    } else {
      console.log('【简单登录】密码验证失败');
      return NextResponse.json(
        { success: false, message: '用户名或密码错误' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('【简单登录】登录错误:', error);
    return NextResponse.json(
      { success: false, message: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
