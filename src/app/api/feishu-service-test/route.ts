import { NextResponse } from 'next/server';
import { FeishuService } from '@/lib/feishu-service';

export async function POST(request: Request) {
  try {
    const { action, receiveId, message, caseData } = await request.json();
    
    console.log('📨 收到飞书服务测试请求:', { action, receiveId, message });

    // 初始化飞书服务
    const feishuService = new FeishuService();

    if (action === 'send-text') {
      // 发送文本消息
      if (!receiveId || !message) {
        return NextResponse.json({ 
          success: false, 
          error: '缺少receiveId或message参数' 
        }, { status: 400 });
      }

      try {
        const result = await feishuService.sendTextMessage(receiveId, message);
        console.log('✅ 文本消息发送成功:', result);
        
        return NextResponse.json({
          success: true,
          message: '消息发送成功',
          data: result
        });
      } catch (error: any) {
        console.error('❌ 文本消息发送失败:', error);
        return NextResponse.json({
          success: false,
          error: error.message,
          hint: '可能是机器人权限问题，请检查飞书后台权限配置'
        }, { status: 500 });
      }
    }

    if (action === 'send-overdue') {
      // 发送逾期提醒
      if (!receiveId || !caseData) {
        return NextResponse.json({ 
          success: false, 
          error: '缺少receiveId或caseData参数' 
        }, { status: 400 });
      }

      try {
        const result = await feishuService.sendOverdueReminder(receiveId, caseData);
        console.log('✅ 逾期提醒发送成功:', result);
        
        return NextResponse.json({
          success: true,
          message: '逾期提醒发送成功',
          data: result
        });
      } catch (error: any) {
        console.error('❌ 逾期提醒发送失败:', error);
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }
    }

    if (action === 'search-user') {
      // 搜索用户
      const { query } = await request.json();
      if (!query) {
        return NextResponse.json({ 
          success: false, 
          error: '缺少query参数' 
        }, { status: 400 });
      }

      try {
        const users = await feishuService.searchUser(query);
        console.log('🔍 用户搜索成功:', users.length, '个用户');
        
        return NextResponse.json({
          success: true,
          users: users
        });
      } catch (error: any) {
        console.error('❌ 用户搜索失败:', error);
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: false, 
      error: '不支持的操作' 
    }, { status: 400 });

  } catch (error: any) {
    console.error('❌ 飞书服务测试API错误:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '服务器错误'
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const receiveId = searchParams.get('receiveId');
  const message = searchParams.get('message');

  if (action === 'send-text' && receiveId && message) {
    return POST(request);
  }

  return NextResponse.json({
    success: false,
    error: '请使用POST方法调用'
  }, { status: 405 });
}
