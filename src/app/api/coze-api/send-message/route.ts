import { NextRequest, NextResponse } from 'next/server';
import { CozeApiService } from '@/lib/coze-api-service';
import { cozeApiStorage } from '@/storage/database/coze-api-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { receiveId, message, receiveIdType, msgType } = body;
    
    if (!receiveId || !message) {
      return NextResponse.json(
        { success: false, error: '接收人ID和消息内容不能为空' },
        { status: 400 }
      );
    }

    const config = cozeApiStorage.getConfig();
    const service = new CozeApiService(config.apiKey, config.botId);
    
    const result = await service.sendFeishuMessage({
      receiveId,
      message,
      receiveIdType: receiveIdType || 'open_id',
      msgType: msgType || 'text'
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('发送消息失败:', error);
    return NextResponse.json(
      { success: false, error: '发送失败' },
      { status: 500 }
    );
  }
}
