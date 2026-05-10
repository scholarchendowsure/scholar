import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // 构建一个示例卡片JSON
  const title = '测试卡片';
  const content = '这是测试卡片内容\n用户ID：123456\n待还款金额：¥1,000,000.00\n还款日：2026-06-30';
  const buttons = [{ text: '立即跟进', type: 'primary' as const, url: 'https://example.com/followup/123' }];
  const template = 'blue';

  const elements: any[] = [];

  // 标题
  if (title) {
    elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**${title}**`
      }
    });
  }

  // 内容
  if (content) {
    elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: content
      }
    });
  }

  // 分割线
  if (title || content) {
    elements.push({ tag: 'hr' });
  }

  // 添加按钮
  if (buttons && buttons.length > 0) {
    elements.push({
      tag: 'action',
      layout: 'default',
      actions: buttons.map(btn => {
        const button: any = {
          tag: 'button',
          text: {
            tag: 'plain_text',
            content: btn.text
          },
          type: btn.type || 'primary'
        };
        if (btn.url) {
          button.url = btn.url;
        }
        return button;
      })
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

  const cardJson = JSON.stringify(card, null, 2);
  console.log('🧪 测试卡片JSON:\n', cardJson);

  return Response.json({
    message: '测试卡片JSON已输出到控制台',
    card: card,
    cardJson: cardJson,
    isValid: validateJson(cardJson)
  });
}

function validateJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    console.error('JSON验证失败:', e);
    return false;
  }
}
