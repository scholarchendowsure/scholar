import { NextRequest, NextResponse } from 'next/server';
import { getFeishuWebOAuthStorage } from '@/storage/database/feishu-web-oauth-storage';

export async function DELETE(request: NextRequest) {
  try {
    const storage = await getFeishuWebOAuthStorage();
    
    const currentToken = await storage.getToken();
    if (!currentToken) {
      return NextResponse.json({ 
        success: false, 
        error: '未找到授权信息' 
      });
    }

    await storage.deleteToken();

    return NextResponse.json({
      success: true,
      message: '已解除授权'
    });

  } catch (error) {
    console.error('解除授权失败:', error);
    return NextResponse.json(
      { success: false, error: '解除授权失败' },
      { status: 500 }
    );
  }
}
