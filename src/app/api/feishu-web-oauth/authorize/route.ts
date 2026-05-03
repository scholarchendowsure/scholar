import { NextRequest, NextResponse } from 'next/server';

// 飞书网页应用OAuth配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_REDIRECT_URI = process.env.COZE_PROJECT_DOMAIN_DEFAULT 
  ? `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/api/feishu-web-oauth/callback`
  : 'http://localhost:5000/api/feishu-web-oauth/callback';

export async function GET(request: NextRequest) {
  try {
    // 检查是否配置了飞书应用ID
    if (!FEISHU_APP_ID) {
      return NextResponse.json({
        success: false,
        error: '请先配置飞书应用ID',
      }, { status: 400 });
    }

    // 生成随机state参数用于防CSRF
    const state = Date.now().toString(36) + Math.random().toString(36).substring(2);
    
    // 构建飞书网页应用OAuth授权URL
    const authUrl = new URL('https://open.feishu.cn/open-apis/oauth2/authorize');
    authUrl.searchParams.set('app_id', FEISHU_APP_ID);
    authUrl.searchParams.set('redirect_uri', FEISHU_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', 'user:profile');

    console.log('生成飞书网页应用OAuth授权URL');

    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
      state,
    });
  } catch (error) {
    console.error('生成授权URL失败:', error);
    return NextResponse.json(
      { success: false, error: '生成授权URL失败' },
      { status: 500 }
    );
  }
}
