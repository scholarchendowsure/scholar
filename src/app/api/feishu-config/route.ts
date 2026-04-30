import { NextRequest, NextResponse } from 'next/server';
import { getFeishuConfig, saveFeishuConfig, type FeishuConfig } from '@/storage/database/feishu-config-storage';

export async function GET() {
  try {
    const config = await getFeishuConfig();
    return NextResponse.json({
      success: true,
      data: {
        webhookUrl: config?.webhookUrl || '',
      },
    });
  } catch (error) {
    console.error('获取飞书配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取配置失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookUrl } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: '请提供 Webhook URL' },
        { status: 400 }
      );
    }

    const config: FeishuConfig = {
      webhookUrl,
    };

    const savedConfig = await saveFeishuConfig(config);

    return NextResponse.json({
      success: true,
      data: savedConfig,
      message: '配置保存成功',
    });
  } catch (error) {
    console.error('保存飞书配置失败:', error);
    return NextResponse.json(
      { success: false, error: '保存配置失败' },
      { status: 500 }
    );
  }
}
