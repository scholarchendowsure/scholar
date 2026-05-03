
import { NextRequest, NextResponse } from 'next/server';
import { getTenantAccessToken } from '@/lib/feishu-api';
import { getFeishuAppCredentials } from '@/storage/database/feishu-config-storage';

export async function POST(request: NextRequest) {
  try {
    const { openId, message } = await request.json();

    if (!openId) {
      return NextResponse.json({ success: false, error: '接收人Open ID不能为空' }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ success: false, error: '消息内容不能为空' }, { status: 400 });
    }

    // 获取企业自建应用凭证
    const credentials = await getFeishuAppCredentials();
    if (!credentials?.appId) {
      return NextResponse.json({ 
        success: false, 
        error: '请先配置飞书自建应用App ID和App Secret' 
      }, { status: 400 });
    }

    // 获取tenant_access_token
    const tenantAccessToken = await getTenantAccessToken(credentials.appId, credentials.appSecret || '');

    // 构建飞书API请求
    const feishuUrl = `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id`;
    
    const content = {
      text: message
    };

    const payload = {
      receive_id: openId,
      msg_type: "text",
      content: JSON.stringify(content)
    };

    const response = await fetch(feishuUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tenantAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.code === 0) {
      return NextResponse.json({
        success: true,
        messageId: result.data?.message_id,
        chatId: result.data?.chat_id
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `发送消息失败: ${result.msg} (code: ${result.code})`
      }, { status: 500 });
    }

  } catch (error) {
    console.error('发送消息失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '发送消息失败'
    }, { status: 500 });
  }
}
