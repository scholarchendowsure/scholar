import { NextRequest, NextResponse } from 'next/server';
import { sendFeishuPrivateMessage, getTenantAccessToken } from '@/lib/feishu-api';

const TEST_APP_ID = 'cli_a9652497d7389bd6';
const TEST_APP_SECRET = 'YHs5IxuDt5xXy4NT5dx0NgIVoC0aE2dO';
const TEST_USER_ID = '8cgee58f'; // 从之前的测试中获取到的用户ID

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'get-token': {
        const token = await getTenantAccessToken(TEST_APP_ID, TEST_APP_SECRET);
        return NextResponse.json({
          success: true,
          token: token.substring(0, 30) + '...',
        });
      }

      default: {
        return NextResponse.json({
          success: true,
          message: '飞书消息测试API',
          testUserId: TEST_USER_ID,
          note: '请使用POST方法发送消息',
        });
      }
    }
  } catch (error) {
    console.error('❌ 测试失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '测试失败',
        error: String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, userId } = body;
    
    const targetUserId = userId || TEST_USER_ID;
    const testMessage = message || '高乐您好！这是来自贷后案件管理系统的测试消息。';

    console.log('📤 发送测试消息给用户:', targetUserId);
    console.log('💬 消息内容:', testMessage);
    
    const result = await sendFeishuPrivateMessage(
      TEST_APP_ID,
      TEST_APP_SECRET,
      targetUserId,
      testMessage
    );

    return NextResponse.json({
      success: true,
      message: '消息发送成功',
      result,
      sentMessage: testMessage,
      targetUserId,
    });
  } catch (error) {
    console.error('❌ 发送消息失败:', error);
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
