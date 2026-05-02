import { NextRequest, NextResponse } from 'next/server';
import { cozeApiStorage } from '@/storage/database/coze-api-storage';

export async function GET() {
  try {
    const config = cozeApiStorage.getConfig();
    return NextResponse.json({
      success: true,
      config: {
        ...config,
        apiKey: config.apiKey ? '******' : '' // 不返回真实的API Key
      }
    });
  } catch (error) {
    console.error('获取Coze API配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取配置失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const config = cozeApiStorage.saveConfig(data);
    return NextResponse.json({
      success: true,
      config: {
        ...config,
        apiKey: config.apiKey ? '******' : ''
      }
    });
  } catch (error) {
    console.error('保存Coze API配置失败:', error);
    return NextResponse.json(
      { success: false, error: '保存配置失败' },
      { status: 500 }
    );
  }
}
