import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // 最小化的飞书卡片JSON
  const minimalCard = {
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

  // 方案1：content直接是卡片JSON字符串
  const content1 = JSON.stringify(minimalCard);

  // 方案2：content是{"card": {...}} JSON字符串
  const content2 = JSON.stringify({ card: minimalCard });

  console.log('📋 方案1（直接卡片）:', content1);
  console.log('📋 方案2（包装card）:', content2);

  // 验证两种JSON
  try {
    JSON.parse(content1);
    console.log('✅ 方案1 JSON有效');
  } catch (e) {
    console.log('❌ 方案1 JSON无效:', e);
  }

  try {
    JSON.parse(content2);
    console.log('✅ 方案2 JSON有效');
  } catch (e) {
    console.log('❌ 方案2 JSON无效:', e);
  }

  return Response.json({
    message: '已输出两种方案到控制台',
    scheme1: {
      content: content1,
      length: content1.length,
      note: 'content直接是卡片'
    },
    scheme2: {
      content: content2,
      length: content2.length,
      note: 'content是{"card":卡片}'
    }
  });
}
