
import { NextRequest, NextResponse } from 'next/server';
import { getFeishuWebOAuthStorage } from '@/storage/database/feishu-web-oauth-storage';
import { searchFeishuUsersWithUserToken } from '@/lib/feishu-api';
import { saveFeishuUser, FeishuUser } from '@/storage/database/feishu-user-storage';

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

    // 自动保存搜索到的用户到数据库
    for (const user of users) {
      const userToSave: FeishuUser = {
        id: user.openId || user.userId || user.unionId || `user_${Date.now()}`,
        unionId: user.unionId || '',
        userId: user.userId || '',
        openId: user.openId || '',
        name: user.name || '未知用户',
        enName: user.enName,
        email: user.email,
        mobile: user.mobile,
        avatarUrl: user.avatarUrl,
        company: user.company,
        chatId: user.chatId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      try {
        await saveFeishuUser(userToSave);
        console.log(`✅ 用户 ${user.name} 已保存到数据库`);
      } catch (saveError) {
        console.warn(`⚠️ 保存用户 ${user.name} 失败:`, saveError);
      }
    }

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
