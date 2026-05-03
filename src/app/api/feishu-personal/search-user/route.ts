
import { NextRequest, NextResponse } from 'next/server';
import { getFeishuWebOAuthStorage } from '@/storage/database/feishu-web-oauth-storage';
import { searchFeishuUsersWithUserToken } from '@/lib/feishu-api';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json(
        { success: false, error: '请输入搜索关键词' },
        { status: 400 }
      );
    }

    // 获取用户 OAuth token
    const storage = await getFeishuWebOAuthStorage();
    const token = await storage.getToken();

    if (!token || !token.accessToken || token.expiresAt <= Date.now()) {
      return NextResponse.json(
        { success: false, error: '请先完成飞书个人账号授权' },
        { status: 401 }
      );
    }

    // 使用个人 OAuth token 搜索用户
    const users = await searchFeishuUsersWithUserToken(token.accessToken, query);

    return NextResponse.json({
      success: true,
      users: users
    });

  } catch (error) {
    console.error('搜索飞书用户失败:', error);
    return NextResponse.json(
      { success: false, error: '搜索失败' },
      { status: 500 }
    );
  }
}
