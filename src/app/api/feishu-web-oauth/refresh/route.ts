import { NextRequest, NextResponse } from 'next/server';
import { getFeishuWebOAuthStorage } from '@/storage/database/feishu-web-oauth-storage';

export async function POST(request: NextRequest) {
  try {
    // 暂时简化，先不实现刷新功能
    return NextResponse.json({
      success: false,
      error: '刷新功能暂不可用，请重新授权'
    }, { status: 501 });
  } catch (error) {
    console.error('刷新OAuth token失败:', error);
    return NextResponse.json(
      { success: false, error: '刷新token失败' },
      { status: 500 }
    );
  }
}
