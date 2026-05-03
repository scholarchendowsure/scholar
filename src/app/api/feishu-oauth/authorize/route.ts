import { NextRequest, NextResponse } from 'next/server';

// 飞书OAuth配置（这里使用占位符，实际使用时需要配置真实的应用ID）
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_REDIRECT_URI = process.env.COZE_PROJECT_DOMAIN_DEFAULT 
  ? `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/api/feishu-oauth/callback`
  : 'http://localhost:5000/api/feishu-oauth/callback';

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
    
    // 构建飞书OAuth授权URL
    const authUrl = new URL('https://open.feishu.cn/open-apis/authen/v1/index');
    authUrl.searchParams.set('app_id', FEISHU_APP_ID);
    authUrl.searchParams.set('redirect_uri', FEISHU_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', 'contact:user.base:readonly');

    console.log('生成飞书OAuth授权URL:', authUrl.toString());

    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
      state,
    });
  } catch (error) {
    console.error('生成授权URL失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '生成授权URL失败',
    }, { status: 500 });
  }
}
