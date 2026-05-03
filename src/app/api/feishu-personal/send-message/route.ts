
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, message } = await request.json();

    if (!userId || !message) {
      return NextResponse.json(
        { success: false, error: '请提供用户ID和消息内容' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: false,
      error: '发送消息功能需要企业自建应用权限，当前已成功搜索到用户，请等待权限配置完成'
    });

  } catch (error) {
    console.error('发送飞书消息失败:', error);
    return NextResponse.json(
      { success: false, error: '发送失败' },
      { status: 500 }
    );
  }
}
