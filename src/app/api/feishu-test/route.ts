import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllFeishuUsers, 
  findFeishuUser, 
  sendFeishuPrivateMessage,
  clearTokenCache 
} from '@/lib/feishu-api';

// 测试用的凭证
const TEST_APP_ID = 'cli_a9652497d7389bd6';
const TEST_APP_SECRET = 'YHs5IxuDt5xXy4NT5dx0NgIVoC0aE2dO';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    console.log('🧪 飞书测试API被调用，action:', action);

    switch (action) {
      case 'clear-cache': {
        clearTokenCache();
        return NextResponse.json({
          success: true,
          message: 'Token缓存已清除',
        });
      }

      case 'sync-users': {
        console.log('🧪 开始测试用户同步...');
        const users = await getAllFeishuUsers(TEST_APP_ID, TEST_APP_SECRET);
        
        return NextResponse.json({
          success: true,
          message: `成功获取 ${users.length} 个用户`,
          count: users.length,
          users: users.slice(0, 20), 
          allUserNames: users.map(u => u.name),
        });
      }

      case 'find-gaole': {
        console.log('🧪 开始查找用户"高乐"...');
        const user = await findFeishuUser(TEST_APP_ID, TEST_APP_SECRET, { name: '高乐' });
        
        if (!user) {
          return NextResponse.json({
            success: false,
            message: '未找到用户"高乐"',
          });
        }

        return NextResponse.json({
          success: true,
          message: '找到用户"高乐"',
          user: {
            name: user.name,
            userId: user.userId,
            unionId: user.unionId,
            email: user.email,
            mobile: user.mobile,
          },
        });
      }

      case 'find-chenxin': {
        console.log('🧪 开始查找用户"晨忻"...');
        const userChenxin = await findFeishuUser(TEST_APP_ID, TEST_APP_SECRET, { name: '晨忻' });
        
        if (!userChenxin) {
          return NextResponse.json({
            success: false,
            message: '未找到用户"晨忻"',
          });
        }

        return NextResponse.json({
          success: true,
          message: '找到用户"晨忻"',
          user: {
            name: userChenxin.name,
            userId: userChenxin.userId,
            unionId: userChenxin.unionId,
            email: userChenxin.email,
            mobile: userChenxin.mobile,
          },
        });
      }

      default: {
        return NextResponse.json({
          success: true,
          message: '飞书测试API',
          availableActions: [
            'clear-cache - 清除Token缓存',
            'sync-users - 测试用户同步',
            'find-gaole - 查找用户"高乐"',
            'find-chenxin - 查找用户"晨忻"',
          ],
        });
      }
    }
  } catch (error) {
    console.error('❌ 飞书测试失败:', error);
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
    const { action, message } = body;

    console.log('🧪 飞书测试POST API被调用，action:', action);

    if (action === 'send-to-gaole') {
      console.log('🧪 开始发送消息给"高乐"...');
      
      const user = await findFeishuUser(TEST_APP_ID, TEST_APP_SECRET, { name: '高乐' });
      
      if (!user) {
        return NextResponse.json({
          success: false,
          message: '未找到用户"高乐"，无法发送消息',
        });
      }

      console.log('👤 找到用户，准备发送消息:', user.name, user.userId);
      
      const testMessage = message || '测试消息：您好，这是来自贷后案件管理系统的测试消息！';
      
      const result = await sendFeishuPrivateMessage(
        TEST_APP_ID,
        TEST_APP_SECRET,
        user.userId,
        testMessage
      );

      return NextResponse.json({
        success: true,
        message: '消息发送成功',
        result: {
          msgId: result.msgId,
          receiveId: result.receiveId,
          sentMessage: testMessage,
        },
      });
    }

    if (action === 'send-to-chenxin') {
      console.log('🧪 开始发送消息给"晨忻"...');
      
      const userChenxin = await findFeishuUser(TEST_APP_ID, TEST_APP_SECRET, { name: '晨忻' });
      
      if (!userChenxin) {
        return NextResponse.json({
          success: false,
          message: '未找到用户"晨忻"，无法发送消息',
        });
      }

      console.log('👤 找到用户，准备发送消息:', userChenxin.name, userChenxin.userId);
      
      const testMessage = message || '测试消息：您好，晨忻！这是来自贷后案件管理系统的测试消息！';
      
      const result = await sendFeishuPrivateMessage(
        TEST_APP_ID,
        TEST_APP_SECRET,
        userChenxin.userId,
        testMessage
      );

      return NextResponse.json({
        success: true,
        message: '消息发送成功',
        result: {
          msgId: result.msgId,
          receiveId: result.receiveId,
          sentMessage: testMessage,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: '未知的action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ 飞书测试POST失败:', error);
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
