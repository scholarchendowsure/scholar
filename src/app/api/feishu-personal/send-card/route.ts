import { NextRequest, NextResponse } from 'next/server';
import { getTenantAccessToken } from '@/lib/feishu-api';
import { getFeishuAppCredentials } from '@/storage/database/feishu-config-storage';

interface CardField {
  label: string;
  value: string;
}

interface CardButton {
  text: string;
  url: string;
  type?: 'primary' | 'default' | 'danger';
}

export async function POST(request: NextRequest) {
  try {
    const { openId, title, fields, buttons, template = 'blue' } = await request.json();

    if (!openId) {
      return NextResponse.json({ success: false, error: '接收人Open ID不能为空' }, { status: 400 });
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

    // 构建卡片元素
    const elements: any[] = [];

    // 添加字段信息
    if (fields && fields.length > 0) {
      const mdContent = fields.map((f: CardField) => `**${f.label}：** ${f.value}`).join('\n');
      elements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: mdContent
        }
      });
    }

    // 添加分割线
    if (buttons && buttons.length > 0) {
      elements.push({ tag: 'hr' });
    }

    // 添加按钮
    if (buttons && buttons.length > 0) {
      elements.push({
        tag: 'action',
        layout: 'default',
        actions: buttons.map((btn: CardButton) => ({
          tag: 'button',
          text: {
            tag: 'plain_text',
            content: btn.text
          },
          type: btn.type || 'primary',
          url: btn.url
        }))
      });
    }

    // 构建卡片内容
    const card = {
      config: {
        wide_screen_mode: true
      },
      header: {
        title: {
          tag: 'plain_text',
          content: title || '消息通知'
        },
        template: template
      },
      elements: elements
    };

    // 构建飞书API请求
    const feishuUrl = `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id`;

    const payload = {
      receive_id: openId,
      msg_type: 'interactive',
      content: JSON.stringify(card)
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
        error: `发送卡片消息失败: ${result.msg} (code: ${result.code})`
      }, { status: 500 });
    }

  } catch (error) {
    console.error('发送卡片消息失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '发送卡片消息失败'
    }, { status: 500 });
  }
}
