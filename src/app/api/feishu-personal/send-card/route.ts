import { NextRequest, NextResponse } from 'next/server';
import { getTenantAccessToken } from '@/lib/feishu-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { openId, title, template = 'blue', fields = [], selects = [], buttons = [] } = body;

    if (!openId) {
      return NextResponse.json({ error: '缺少 openId 参数' }, { status: 400 });
    }

    // 获取 tenant_access_token
    const appId = process.env.FEISHU_APP_ID || 'cli_a9652497d7389bd6';
    const appSecret = process.env.FEISHU_APP_SECRET || '';
    const token = await getTenantAccessToken(appId, appSecret);
    if (!token) {
      return NextResponse.json({ error: '获取飞书访问令牌失败' }, { status: 500 });
    }

    // 构建案件信息
    const caseInfoElements = fields.map((field: { label: string; value: string }) => ({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**${field.label}：** ${field.value}`
      }
    }));

    // 构建选择框元素和输入框
    const formElements = selects.flatMap((sel: {
      label: string;
      name: string;
      placeholder?: string;
      options?: Array<{ text: string; value: string }>;
    }) => {
      // 如果有选项，使用select_static
      if (sel.options && sel.options.length > 0) {
        return [
          {
            tag: 'div' as const,
            text: {
              tag: 'lark_md' as const,
              content: `**${sel.label}**`
            }
          },
          {
            tag: 'select_static' as const,
            name: sel.name || sel.label,
            placeholder: { tag: 'plain_text' as const, content: sel.placeholder || '请选择' },
            options: sel.options.map((opt: { text: string; value: string }) => ({
              text: { tag: 'plain_text' as const, content: opt.text },
              value: opt.value || opt.text
            }))
          }
        ];
      }
      // 如果没有选项，使用input组件
      return [{
        tag: 'input' as const,
        name: sel.name || sel.label,
        placeholder: { tag: 'plain_text' as const, content: sel.placeholder || '请输入' },
        label: { tag: 'plain_text' as const, content: sel.label },
        input_type: 'multiline_text' as const,
        rows: 3
      }];
    });

    // 构建按钮元素（JSON 2.0中按钮放在form内，action_type设为form_submit）
    const buttonElements = buttons.map((btn: { text: string; value: any }) => ({
      tag: 'button' as const,
      text: { tag: 'plain_text' as const, content: btn.text },
      type: 'primary' as const,
      action_type: 'form_submit' as const,
      value: typeof btn.value === 'string' ? { action: btn.value } : btn.value
    }));

    // 使用 JSON 2.0 格式，form容器包含所有表单项和提交按钮
    const cardContent = {
      schema: '2.0',
      config: {
        wide_screen_mode: true
      },
      header: {
        title: { tag: 'plain_text' as const, content: title || '案件跟进提醒' },
        template: template as string
      },
      body: {
        elements: [
          ...caseInfoElements,
          { tag: 'hr' as const },
          {
            tag: 'form' as const,
            name: 'followup_form',
            elements: [
              ...formElements,
              ...buttonElements
            ]
          }
        ]
      }
    };

    // 发送消息
    const response = await fetch(
      'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receive_id: openId,
          msg_type: 'interactive',
          content: JSON.stringify(cardContent)
        })
      }
    );

    const result = await response.json();
    console.log('飞书卡片发送结果:', JSON.stringify(result));

    if (result.code === 0) {
      return NextResponse.json({ success: true, message_id: result.data?.message_id });
    } else {
      return NextResponse.json({ 
        error: `飞书API错误: ${result.msg}`,
        code: result.code 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('发送飞书卡片失败:', error);
    return NextResponse.json({ error: '发送飞书卡片失败' }, { status: 500 });
  }
}
