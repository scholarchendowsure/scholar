import { NextRequest, NextResponse } from 'next/server';
import { getFeishuOAuthStorage } from '@/storage/database/feishu-oauth-storage';

// 飞书OAuth配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      return NextResponse.redirect(new URL('/feishu-message?oauth=error', request.url));
    }

    console.log('收到飞书OAuth回调, code:', code);

    // 使用授权码获取access_token
    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/authen/v1/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: FEISHU_APP_ID,
        client_secret: FEISHU_APP_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('获取access_token失败:', errorText);
      return NextResponse.redirect(new URL('/feishu-message?oauth=error', request.url));
    }

    const tokenData = await tokenResponse.json();
    console.log('飞书OAuth token响应:', tokenData);

    if (tokenData.code !== 0) {
      return NextResponse.redirect(new URL('/feishu-message?oauth=error', request.url));
    }

    const { access_token, refresh_token, expires_in, token_type } = tokenData.data;
    
    // 计算过期时间
    const expiresAt = Date.now() + (expires_in * 1000);
    // refresh_token一般有效期为30天
    const refreshTokenExpiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);

    // 获取用户信息
    const userInfoResponse = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
      method: 'GET',
      headers: {
        'Authorization': `${token_type} ${access_token}`,
      },
    });

    let userInfo = null;
    if (userInfoResponse.ok) {
      const userData = await userInfoResponse.json();
      if (userData.code === 0) {
        userInfo = userData.data;
      }
    }

    // 保存token
    const storage = await getFeishuOAuthStorage();
    const tokenRecord = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expiresAt,
      tokenType: token_type,
      userId: userInfo?.user_id,
      userName: userInfo?.name,
      userEmail: userInfo?.email,
      userAvatar: userInfo?.avatar_url,
      refreshTokenExpiresAt: refreshTokenExpiresAt,
      createdAt: Date.now(),
    };

    await storage.saveToken(tokenRecord);

    console.log('飞书OAuth授权成功, 用户:', userInfo?.name);

    // 重定向回飞书消息页面，带上成功参数
    return NextResponse.redirect(new URL('/feishu-message?oauth=success', request.url));
  } catch (error) {
    console.error('处理OAuth回调失败:', error);
    return NextResponse.redirect(new URL('/feishu-message?oauth=error', request.url));
  }
}
