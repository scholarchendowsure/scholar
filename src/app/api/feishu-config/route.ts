import { NextRequest, NextResponse } from 'next/server';
import { getFeishuConfig, saveFeishuConfig } from '@/storage/database/feishu-config-storage';
import { sendFeishuWebhookMessage } from '@/lib/feishu-api';

// 获取飞书配置
export async function GET() {
  try {
    const config = await getFeishuConfig();
    console.log('飞书配置加载成功:', config);
    return NextResponse.json({ config });
  } catch (error) {
    console.error('获取飞书配置失败:', error);
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}

// 保存飞书配置
export async function PUT(request: NextRequest) {
  try {
    const config = await request.json();
    await saveFeishuConfig(config);
    console.log('飞书配置保存成功:', config);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('保存飞书配置失败:', error);
    return NextResponse.json({ error: '保存配置失败' }, { status: 500 });
  }
}

// 测试发送
export async function POST(request: NextRequest) {
  try {
    const config = await getFeishuConfig();
    
    if (!config.webhookUrl) {
      return NextResponse.json({ success: false, message: '请先配置 Webhook URL' }, { status: 400 });
    }

    const result = await sendFeishuWebhookMessage(
      config.webhookUrl,
      '🎉 测试消息！\n这是一条从贷后管理系统发送的测试消息。'
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('测试发送失败:', error);
    return NextResponse.json({ success: false, message: '发送失败' }, { status: 500 });
  }
}
