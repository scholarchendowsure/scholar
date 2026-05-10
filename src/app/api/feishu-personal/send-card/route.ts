import { NextRequest, NextResponse } from 'next/server';
import { getTenantAccessToken } from '@/lib/feishu-api';

const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

interface CardField {
  label: string;
  value: string;
}

interface CardButton {
  text: string;
  value?: any;
  type?: 'primary' | 'default' | 'danger';
}

interface SelectOption {
  text: string;
  value: string;
}

interface SelectField {
  label: string;
  name: string;
  options: SelectOption[];
}

export async function POST(request: NextRequest) {
  try {
    const { openId, title, fields, buttons, selects, template = 'blue' } = await request.json();

    if (!openId) {
      return NextResponse.json({ error: '缺少 openId 参数' }, { status: 400 });
    }

    // 获取 tenant_access_token
    const tenantAccessToken = await getTenantAccessToken();
    if (!tenantAccessToken) {
      return NextResponse.json({ error: '获取飞书 access_token 失败' }, { status: 500 });
    }

    const elements: any[] = [];

    // 1. 添加案件基本信息（使用 markdown）
    if (fields && fields.length > 0) {
      const infoText = fields
        .map((f: CardField) => `**${f.label}：** ${f.value}`)
        .join('\n');
      elements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: infoText
        }
      });
      elements.push({ tag: 'hr' });
    }

    // 2. 使用按钮组替代 select/input 实现选择功能
    if (selects && selects.length > 0) {
      for (const sel of selects) {
        // 添加字段标题
        elements.push({
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**${sel.label}**`
          }
        });

        // 添加选项按钮组
        const optionButtons = (sel.options || []).map((opt: SelectOption) => ({
          tag: 'button',
          text: {
            tag: 'plain_text',
            content: opt.text
          },
          type: 'default',
          value: {
            action: 'select_option',
            field: sel.name,
            label: sel.label,
            value: opt.value,
            text: opt.text
          }
        }));

        elements.push({
          tag: 'action',
          layout: 'bisecting',
          actions: optionButtons
        });

        elements.push({ tag: 'hr' });
      }
    }

    // 3. 添加提交按钮
    if (buttons && buttons.length > 0) {
      const submitButton = buttons[0];
      elements.push({
        tag: 'action',
        layout: 'default',
        actions: [
          {
            tag: 'button',
            text: {
              tag: 'plain_text',
              content: submitButton.text
            },
            type: submitButton.type || 'primary',
            value: submitButton.value
          }
        ]
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
          content: title
        },
        template: template
      },
      elements: elements
    };

    const cardJson = JSON.stringify(card);
    console.log('📋 完整卡片JSON:', cardJson);
    console.log('📋 卡片JSON长度:', cardJson.length);

    // 发送消息
    const response = await fetch(`${FEISHU_API_BASE}/im/v1/messages?receive_id_type=open_id`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tenantAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receive_id: openId,
        msg_type: 'interactive',
        content: cardJson,
        uuid: Date.now().toString(),
      }),
    });

    const responseData = await response.json();
    console.log('📦 卡片消息API响应状态:', response.status);
    console.log('📦 卡片消息API完整响应:', JSON.stringify(responseData));

    if (responseData.code !== 0) {
      return NextResponse.json({
        error: `发送飞书卡片消息失败: ${responseData.msg}`,
        details: responseData
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: responseData.data?.message_id,
      data: responseData.data
    });

  } catch (error) {
    console.error('❌ 发送飞书卡片消息异常:', error);
    return NextResponse.json({
      error: '服务器内部错误',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
