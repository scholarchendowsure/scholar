import { NextRequest, NextResponse } from 'next/server';
import { getFeishuOAuthStorage } from '@/storage/database/feishu-oauth-storage';

// 飞书OAuth配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: '缺少refresh_token' },
        { status: 400 }
      );
    }

    console.log('刷新飞书OAuth token');

    // 使用refresh_token获取新的access_token
    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/authen/v1/refresh_access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: FEISHU_APP_ID,
        client_secret: FEISHU_APP_SECRET,
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('刷新token失败:', errorText);
      return NextResponse.json(
        { success: false, error: '刷新token失败' },
        { status: 500 }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('飞书刷新token响应:', tokenData);

    if (tokenData.code !== 0) {
      return NextResponse.json(
        { success: false, error: tokenData.msg || '刷新token失败' },
        { status: 500 }
      );
    }

    const { access_token, refresh_token, expires_in, token_type } = tokenData.data;
    
    // 计算过期时间
    const expiresAt = Date.now() + (expires_in * 1000);
    const refreshTokenExpiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);

    // 获取当前存储的token以保留用户信息
    const storage = await getFeishuOAuthStorage();
    const currentToken = await storage.getToken();

    // 保存新token
    const newToken = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expiresAt,
      tokenType: token_type,
      userId: currentToken?.userId,
      userName: currentToken?.userName,
      userEmail: currentToken?.userEmail,
      userAvatar: currentToken?.userAvatar,
      refreshTokenExpiresAt: refreshTokenExpiresAt,
      createdAt: currentToken?.createdAt || Date.now(),
    };

    await storage.saveToken(newToken);

    console.log('飞书OAuth token刷新成功');

    return NextResponse.json({
      success: true,
      token: newToken
    });

  } catch (error) {
    console.error('刷新OAuth token失败:', error);
    return NextResponse.json(
      { success: false, error: '刷新token失败' },
      { status: 500 }
    );
  }
}
