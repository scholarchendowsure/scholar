import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 调用飞书Webhook
    const response = await fetch('https://dowsure88.feishu.cn/base/workflow/webhook/event/SgG6arWhQwJXR2hovzIcQJubnfg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error('飞书Webhook调用失败:', response.status, response.statusText);
      return NextResponse.json({ success: false, error: '飞书Webhook调用失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook API错误:', error);
    return NextResponse.json({ success: false, error: 'Webhook API错误' }, { status: 500 });
  }
}
