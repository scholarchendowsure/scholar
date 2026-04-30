import { NextRequest, NextResponse } from 'next/server';
import { sendFeishuPrivateMessage } from '@/lib/feishu-api';

const TEST_APP_ID = 'cli_a9652497d7389bd6';
const TEST_APP_SECRET = 'YHs5IxuDt5xXy4NT5dx0NgIVoC0aE2dO';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, message, idType = 'open_id' } = body;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: '用户ID不能为空' },
        { status: 400 }
      );
    }
    
    if (!message) {
      return NextResponse.json(
        { success: false, message: '消息内容不能为空' },
        { status: 400 }
      );
    }

    console.log('📤 直接发送消息给用户:', userId);
    console.log('🆔 ID类型:', idType);
    console.log('💬 消息内容:', message);
    
    const result = await sendFeishuPrivateMessage(
      TEST_APP_ID,
      TEST_APP_SECRET,
      userId,
      message,
      idType as 'user_id' | 'open_id' | 'union_id'
    );

    return NextResponse.json({
      success: true,
      message: '消息发送成功',
      result,
    });
  } catch (error) {
    console.error('❌ 直接发送消息失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '发送失败',
        error: String(error),
      },
      { status: 500 }
    );
  }
}
