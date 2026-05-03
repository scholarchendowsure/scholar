import { NextRequest, NextResponse } from 'next/server';
import { getFeishuWebOAuthStorage } from '@/storage/database/feishu-web-oauth-storage';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    console.log('收到飞书网页应用OAuth回调, code:', code?.slice(0, 10) + '...');

    // 从请求中获取正确的 origin
    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin; // 这会是 https://bdb3c66d-...

    const successUrl = `${origin}/feishu-message?oauth=success`;
    const errorUrl = `${origin}/feishu-message?oauth=error`;

    if (!code) {
      console.error('缺少code参数');
      return NextResponse.redirect(errorUrl);
    }

    const storage = await getFeishuWebOAuthStorage();

    // === 第一步：获取 app_access_token ===
    const appId = process.env.FEISHU_APP_ID || 'cli_a9652497d7389bd6';
    const appSecret = process.env.FEISHU_APP_SECRET || 'YHs5IxuDt5xXy4NT5dx0NgIVoC0aE2dO';

    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.code !== 0) {
      console.error('获取app_access_token失败:', tokenData);
      return NextResponse.redirect(errorUrl);
    }

    const appAccessToken = tokenData.app_access_token;

    // === 第二步：用 code 换取 user_access_token ===
    const userTokenResponse = await fetch('https://open.feishu.cn/open-apis/authen/v1/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appAccessToken}`
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code
      })
    });

    const userTokenData = await userTokenResponse.json();
    console.log('换取user_access_token响应:', {
      code: userTokenData.code,
      msg: userTokenData.msg,
      hasData: !!userTokenData.data
    });

    if (userTokenData.code !== 0 || !userTokenData.data) {
      console.error('换取user_access_token失败:', userTokenData);
      return NextResponse.redirect(errorUrl);
    }

    const tokenInfo = userTokenData.data;
    const now = Date.now();

    // === 第三步：获取用户信息 ===
    const userResponse = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenInfo.access_token}` }
    });

    const userData = await userResponse.json();
    const userInfo = userData.code === 0 ? userData.data : null;

    // 保存token
    await storage.saveToken({
      accessToken: tokenInfo.access_token,
      refreshToken: tokenInfo.refresh_token,
      expiresIn: tokenInfo.expires_in,
      expiresAt: now + (tokenInfo.expires_in * 1000),
      tokenType: tokenInfo.token_type || 'Bearer',
      userId: tokenInfo.user_id,
      userName: userInfo?.name || tokenInfo.user_id,
      userAvatar: userInfo?.avatar_url,
      userEmail: userInfo?.email,
      createdAt: now
    });

    console.log('飞书网页应用OAuth授权成功, 用户:', userInfo?.name || tokenInfo.user_id);

    // 重定向回飞书消息页面
    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error('处理OAuth回调失败:', error);
    // 即使出错也尝试重定向回去
    try {
      const requestUrl = new URL(request.url);
      const errorUrl = `${requestUrl.origin}/feishu-message?oauth=error`;
      return NextResponse.redirect(errorUrl);
    } catch {
      return NextResponse.json({ error: '处理失败' }, { status: 500 });
    }
  }
}
