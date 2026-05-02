import { NextRequest, NextResponse } from 'next/server';
import { CozeApiService } from '@/lib/coze-api-service';
import { cozeApiStorage } from '@/storage/database/coze-api-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userMessage, conversationId, additionalMessages } = body;
    
    if (!userId || !userMessage) {
      return NextResponse.json(
        { success: false, error: '用户ID和消息内容不能为空' },
        { status: 400 }
      );
    }

    const config = cozeApiStorage.getConfig();
    
    if (!config.enabled) {
      return NextResponse.json(
        { success: false, error: 'Coze API 未启用' },
        { status: 400 }
      );
    }

    if (!config.apiKey || !config.botId) {
      return NextResponse.json(
        { success: false, error: 'Coze API Key 或 Bot ID 未配置' },
        { status: 400 }
      );
    }

    const service = new CozeApiService(config.apiKey, config.botId);
    
    const result = await service.chat({
      userId,
      userMessage,
      conversationId,
      additionalMessages
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('调用 Coze 聊天 API 失败:', error);
    return NextResponse.json(
      { success: false, error: '调用失败' },
      { status: 500 }
    );
  }
}
