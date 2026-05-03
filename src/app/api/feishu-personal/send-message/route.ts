import { NextRequest, NextResponse } from 'next/server';
import { sendFeishuPrivateMessage } from '@/lib/feishu-api';

const APP_ID = 'cli_a9652497d7389bd6';
const APP_SECRET = 'YHs5IxuDt5xXy4NT5dx0NgIVoC0aE2dO';

export async function POST(request: NextRequest) {
  try {
    const { receiveId, text } = await request.json();
    
    if (!receiveId || !text) {
      return NextResponse.json(
        { success: false, error: '接收人ID和消息内容不能为空' },
        { status: 400 }
      );
    }

    console.log('📤 使用企业应用API发送消息给:', receiveId);
    console.log('💬 消息内容:', text);
      
    // 使用企业应用 API 发送消息
    const result = await sendFeishuPrivateMessage(
      APP_ID,
      APP_SECRET,
      receiveId,
      text,
      'open_id'
    );
      
    console.log('✅ 消息发送成功:', result.msgId);
      
    return NextResponse.json({
      success: true,
      message: '消息发送成功',
      result: result,
      sentAt: new Date().toISOString()
    });
      
  } catch (error: any) {
    console.error('❌ 发送消息失败:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '发送失败' },
      { status: 500 }
    );
  }
}
