import { NextRequest, NextResponse } from 'next/server';
import { getFeishuWebOAuthStorage } from '@/storage/database/feishu-web-oauth-storage';
import { searchFeishuUsersWithUserToken } from '@/lib/feishu-api';
import { saveFeishuUser, FeishuUser } from '@/storage/database/feishu-user-storage';

// 同时支持 GET 和 POST 请求
async function handleSearch(request: NextRequest, queryParam: string) {
  try {
    if (!queryParam) {
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
    const users = await searchFeishuUsersWithUserToken(token.accessToken, queryParam);

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

    // 返回第一个用户作为单个用户对象（兼容前端期望格式）
    const firstUser = users[0];
    return NextResponse.json({
      success: true,
      users: users,
      user: firstUser ? {
        openId: firstUser.openId,
        name: firstUser.name
      } : null
    });

  } catch (error) {
    console.error('搜索飞书用户失败:', error);
    return NextResponse.json(
      { success: false, error: '搜索失败' },
      { status: 500 }
    );
  }
}

// POST 请求
export async function POST(request: NextRequest) {
  const { query, keyword } = await request.json();
  return handleSearch(request, query || keyword);
}

// GET 请求
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const keyword = searchParams.get('keyword');
  return handleSearch(request, query || keyword || '');
}
