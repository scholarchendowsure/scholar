import { NextRequest, NextResponse } from 'next/server';
import { getFeishuOAuthStorage } from '@/storage/database/feishu-oauth-storage';

// 飞书网页应用OAuth配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.redirect(new URL('/feishu-message?oauth=error', request.url));
    }

    console.log('收到飞书网页应用OAuth回调');

    // 第一步：获取 app_access_token
    const appTokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET,
      }),
    });

    if (!appTokenResponse.ok) {
      const errorText = await appTokenResponse.text();
      console.error('获取app_access_token失败:', errorText);
      return NextResponse.redirect(new URL('/feishu-message?oauth=error', request.url));
    }

    const appTokenData = await appTokenResponse.json();
    if (appTokenData.code !== 0) {
      console.error('获取app_access_token失败:', appTokenData);
      return NextResponse.redirect(new URL('/feishu-message?oauth=error', request.url));
    }

    const appAccessToken = appTokenData.app_access_token;

    // 第二步：用 code 换取 user_access_token
    const userTokenResponse = await fetch('https://open.feishu.cn/open-apis/oauth2/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appAccessToken}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: FEISHU_APP_ID,
        client_secret: FEISHU_APP_SECRET,
        code,
      }),
    });

    if (!userTokenResponse.ok) {
      const errorText = await userTokenResponse.text();
      console.error('获取user_access_token失败:', errorText);
      return NextResponse.redirect(new URL('/feishu-message?oauth=error', request.url));
    }

    const tokenData = await userTokenResponse.json();
    console.log('飞书网页应用token响应');

    if (tokenData.code !== 0) {
      return NextResponse.redirect(new URL('/feishu-message?oauth=error', request.url));
    }

    const { access_token, refresh_token, expires_in, token_type } = tokenData.data;
    
    // 计算过期时间
    const expiresAt = Date.now() + (expires_in * 1000);
    const refreshTokenExpiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);

    // 获取用户信息
    const userInfoResponse = await fetch('https://open.feishu.cn/open-apis/oauth2/user_info', {
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
      userId: userInfo?.sub,
      userName: userInfo?.name,
      userEmail: userInfo?.email,
      userAvatar: userInfo?.picture,
      refreshTokenExpiresAt: refreshTokenExpiresAt,
      createdAt: Date.now(),
    };

    await storage.saveToken(tokenRecord);

    console.log('飞书网页应用OAuth授权成功, 用户:', userInfo?.name);

    // 重定向回飞书消息页面
    return NextResponse.redirect(new URL('/feishu-message?oauth=success', request.url));
  } catch (error) {
    console.error('处理OAuth回调失败:', error);
    return NextResponse.redirect(new URL('/feishu-message?oauth=error', request.url));
  }
}
