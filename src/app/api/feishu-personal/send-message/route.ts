import { NextRequest, NextResponse } from 'next/server';
import { sendFeishuPrivateMessage } from '@/lib/feishu-api';
import { getFeishuAppCredentials } from '@/storage/database/feishu-config-storage';

export async function POST(request: NextRequest) {
  try {
    const { userId, content, userIdType } = await request.json();
    
    if (!userId || !content) {
      return NextResponse.json({ 
        success: false, 
        error: '请提供用户ID和消息内容' 
      }, { status: 400 });
    }

    try {
      // 获取飞书应用凭证
      const { appId, appSecret } = await getFeishuAppCredentials();
      
      if (!appId || !appSecret) {
        return NextResponse.json({ 
          success: false, 
          error: '请先配置飞书应用ID和密钥' 
        }, { status: 400 });
      }

      // 使用企业自建应用 API 发送消息
      const result = await sendFeishuPrivateMessage(
        appId, 
        appSecret, 
        userId, 
        content, 
        userIdType || 'union_id'
      );
      
      return NextResponse.json({ 
        success: true, 
        message: '消息发送成功',
        data: result
      });
      
    } catch (sendError: any) {
      console.error('发送消息错误:', sendError);
      return NextResponse.json({ 
        success: false, 
        error: `发送失败: ${sendError.message}` 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('发送消息错误:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}
