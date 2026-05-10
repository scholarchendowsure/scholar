import { NextRequest, NextResponse } from 'next/server';
import { getTenantAccessToken } from '@/lib/feishu-api';
import { getFeishuAppCredentials } from '@/storage/database/feishu-config-storage';

interface CardField {
  label: string;
  value: string;
}

interface CardSelectOption {
  text: string;
  value: string;
}

interface CardSelect {
  label: string;
  placeholder: string;
  options: CardSelectOption[];
  name?: string;
}

interface CardButton {
  text: string;
  url?: string;
  type?: 'primary' | 'default' | 'danger';
  value?: Record<string, any>;
}

const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

export async function POST(request: NextRequest) {
  try {
    const { openId, title, fields, buttons, selects, template = 'blue' } = await request.json();

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

    // 添加表单说明
    if (selects && selects.length > 0) {
      // 先添加说明文字
      elements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: '**请填写以下跟进信息：**'
        }
      });

      // 构建form内的元素数组 - button直接放在elements里
      const formItems: any[] = [];

      // 添加输入框
      for (const sel of selects) {
        formItems.push({
          tag: 'input',
          name: sel.name || sel.label,
          placeholder: { tag: 'plain_text', content: sel.placeholder || `请输入${sel.label}` },
          label: { tag: 'plain_text', content: sel.label }
        });
      }

      // 添加提交按钮（直接放在formItems里，不是actions）
      if (buttons && buttons.length > 0) {
        const btn = buttons[0];
        // btn.value 已经是对象 {action, case_id, loan_no}，直接使用
        const btnValue = typeof btn.value === 'string' ? { action: btn.value } : btn.value;
        formItems.push({
          tag: 'button',
          name: 'submit_btn',  // 必须有name
          text: { tag: 'plain_text', content: btn.text },
          type: 'primary',
          value: btnValue
        });
      }

      // 最终form结构 - 没有actions字段！
      elements.push({
        tag: 'form',
        name: 'follow_form',  // 必须有name
        elements: formItems   // 输入框+按钮 都放这里
      });
    } else if (buttons && buttons.length > 0) {
      // 没有表单元素时，直接添加按钮
      const buttonActions = buttons.map((btn: CardButton) => {
        const button: any = {
          tag: 'button',
          text: {
            tag: 'plain_text',
            content: btn.text
          },
          type: btn.type || 'primary'
        };
        if (btn.value) {
          button.value = btn.value;
        }
        return button;
      });

      elements.push({
        tag: 'action',
        layout: 'default',
        actions: buttonActions
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

    console.log('📡 卡片消息API响应状态:', response.status);

    const data = await response.json();
    console.log('📊 卡片消息API完整响应:', JSON.stringify(data, null, 2));

    if (data.code !== 0) {
      return NextResponse.json({
        success: false,
        error: `发送飞书卡片消息失败: ${data.msg} (code: ${data.code})`,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: data.data?.message_id,
    });

  } catch (error) {
    console.error('发送飞书卡片消息失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '发送失败',
    }, { status: 500 });
  }
}
