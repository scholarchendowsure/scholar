import { NextRequest, NextResponse } from 'next/server';
import { getTenantAccessToken } from '@/lib/feishu-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { openId, title, template = 'blue', fields = [] } = body;

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
    const elements: any[] = fields.map((field: { label: string; value: string }) => ({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**${field.label}：** ${field.value}`
      }
    }));

    // 添加分割线
    elements.push({ tag: 'hr' as const });
    
    // 添加跟进记录区域 - 直接用div显示，用户可以在卡片下方回复
    elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: '**跟进记录填写说明：\n' +
                 '跟进类型：线上 / 线下 / 其他\n' +
                 '联系人：法人 / 实控人 / 其他\n' +
                 '跟进结果：正常还款 / 预警上升 / 逾期承诺 / 其他\n' +
                 '跟进记录：（请在此回复中填写跟进记录内容）'
      }
    });

    // 构建卡片内容
    const cardContent = {
      config: {
        wide_screen_mode: true
      },
      header: {
        title: { tag: 'plain_text' as const, content: title || '案件跟进提醒' },
        template: template as string
      },
      elements: elements
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
