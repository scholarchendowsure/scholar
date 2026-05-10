import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const card = {
    config: {
      wide_screen_mode: true
    },
    header: {
      title: {
        tag: "plain_text",
        content: "测试卡片"
      },
      template: "blue"
    },
    elements: [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: "这是测试内容"
        }
      }
    ]
  };

  const cardJson = JSON.stringify(card);
  
  // 方案1：直接卡片JSON（当前使用）
  const content1 = cardJson;
  
  // 方案2：卡片JSON再转义一次
  const content2 = JSON.stringify(cardJson);

  console.log('📋 方案1（直接卡片JSON）:', content1);
  console.log('📋 方案2（双重转义）:', content2);

  // 模拟完整的请求体
  const body1 = JSON.stringify({
    receive_id: 'test',
    msg_type: 'interactive',
    content: content1,
  });

  const body2 = JSON.stringify({
    receive_id: 'test',
    msg_type: 'interactive',
    content: content2,
  });

  console.log('📦 完整请求体1:', body1);
  console.log('📦 完整请求体2:', body2);

  return Response.json({
    message: '已输出两种转义方案',
    schemes: {
      scheme1: {
        note: 'content = JSON.stringify(card)',
        content: content1,
        fullBody: body1
      },
      scheme2: {
        note: 'content = JSON.stringify(JSON.stringify(card))',
        content: content2,
        fullBody: body2
      }
    }
  });
}
