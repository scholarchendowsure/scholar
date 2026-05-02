import { NextRequest, NextResponse } from 'next/server';
import { feishuBitableWebhookStorage } from '@/storage/database/feishu-bitable-webhook-storage';

export async function POST(request: NextRequest) {
  try {
    // 尝试解析JSON
    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      // 如果JSON解析失败，尝试读取文本
      const text = await request.text();
      payload = { raw: text };
    }

    console.log('[飞书多维表格Webhook] 收到请求:', payload);

    // 保存接收到的记录
    const record = feishuBitableWebhookStorage.addRecord(payload);

    console.log('[飞书多维表格Webhook] 记录已保存:', record.id);

    // 飞书挑战验证（如果有challenge字段，直接返回）
    if (payload && payload.challenge) {
      return NextResponse.json({
        challenge: payload.challenge
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook接收成功',
      recordId: record.id,
      receivedAt: record.receivedAt
    });
  } catch (error) {
    console.error('[飞书多维表格Webhook] 处理失败:', error);
    return NextResponse.json(
      { success: false, error: '处理失败' },
      { status: 500 }
    );
  }
}

// 同时支持GET方法，用于测试
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const records = feishuBitableWebhookStorage.getRecords(limit);
    
    return NextResponse.json({
      success: true,
      count: records.length,
      records
    });
  } catch (error) {
    console.error('获取webhook记录失败:', error);
    return NextResponse.json(
      { success: false, error: '获取失败' },
      { status: 500 }
    );
  }
}

// 删除记录
export async function DELETE(request: NextRequest) {
  try {
    feishuBitableWebhookStorage.clearRecords();
    
    return NextResponse.json({
      success: true,
      message: '记录已清空'
    });
  } catch (error) {
    console.error('清空记录失败:', error);
    return NextResponse.json(
      { success: false, error: '清空失败' },
      { status: 500 }
    );
  }
}
