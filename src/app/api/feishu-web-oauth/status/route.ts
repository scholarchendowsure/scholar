import { NextRequest, NextResponse } from 'next/server';
import { getFeishuOAuthStorage } from '@/storage/database/feishu-oauth-storage';

export async function GET(request: NextRequest) {
  try {
    const storage = await getFeishuOAuthStorage();
    const token = await storage.getToken();

    if (!token) {
      return NextResponse.json({
        success: true,
        isAuthenticated: false,
        token: null
      });
    }

    const isValid = token.expiresAt > Date.now();

    return NextResponse.json({
      success: true,
      isAuthenticated: isValid,
      token: isValid ? token : null
    });

  } catch (error) {
    console.error('获取OAuth状态失败:', error);
    return NextResponse.json(
      { success: false, error: '获取状态失败' },
      { status: 500 }
    );
  }
}
