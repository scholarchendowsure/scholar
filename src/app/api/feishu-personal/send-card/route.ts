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
    // 飞书 JSON 2.0: select_static 和 input 不支持 label 属性
    // 标签需要用 div + markdown 在表单元素前显示
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
      // 如果没有选项，使用textarea组件（JSON 2.0格式）
      // textarea的placeholder是对象格式: {tag: 'plain_text', content: '...'}
      return [{
        tag: 'textarea' as const,
        name: sel.name || sel.label,
        placeholder: sel.placeholder ? { tag: 'plain_text' as const, content: sel.placeholder } : undefined
      }];
    });

    // 构建按钮元素（按钮放在form内部）
    // 飞书JSON 2.0格式：按钮不需要action_type属性，直接使用button标签
    // 重要：按钮必须有name属性！
    // 重要：form内必须至少有一个action_type: 'submit'的按钮！
    const buttonElements = buttons.map((btn: { text: string; type?: string; value: any }, index: number) => {
      // 处理 value：确保是字符串或对象
      let btnValue: string | object;
      if (typeof btn.value === 'string') {
        btnValue = btn.value;
      } else if (typeof btn.value === 'object') {
        btnValue = btn.value;
      } else {
        btnValue = String(btn.value);
      }
      
      return {
        tag: 'button' as const,
        name: `btn_${index}`,  // 按钮必须有name属性
        text: { tag: 'plain_text' as const, content: btn.text },
        type: btn.type === 'primary' ? 'primary' as const : 'default' as const,
        value: btnValue
      };
    });

    // 按钮类型定义
    type ButtonElement = {
      tag: 'button';
      name: string;
      text: { tag: 'plain_text'; content: string };
      type: 'primary' | 'default';
      value: string | object;
    };

    // 如果没有按钮，添加一个默认的提交按钮
    const allButtons: ButtonElement[] = buttonElements.length > 0 ? buttonElements : [{
      tag: 'button' as const,
      name: 'btn_submit',
      text: { tag: 'plain_text' as const, content: '提交' },
      type: 'primary' as const,
      value: 'submit'
    }];

    // 使用 JSON 2.0 格式 - 不使用form标签，直接用action + button
    // 按钮使用 action_type: 'request' 代替 submit
    const cardContent = {
      config: {
        wide_screen_mode: true
      },
      header: {
        title: { tag: 'plain_text' as const, content: title || '案件跟进提醒' },
        template: template as string
      },
      elements: [
        ...caseInfoElements,
        { tag: 'hr' as const },
        ...formElements,
        {
          tag: 'action' as const,
          actions: allButtons.map((btn: any) => ({
            ...btn,
            action_type: 'request' as const  // 使用 request 而不是 submit
          }))
        }
      ]
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
