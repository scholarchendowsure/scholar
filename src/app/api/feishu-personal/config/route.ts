import { NextRequest, NextResponse } from 'next/server';
import { feishuPersonalStorage } from '@/storage/database/feishu-personal-storage';

export async function GET() {
  try {
    const config = feishuPersonalStorage.getConfig();
    return NextResponse.json({
      success: true,
      config: {
        ...config,
        // 不返回敏感信息
      }
    });
  } catch (error) {
    console.error('获取个人账号配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取配置失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const config = feishuPersonalStorage.saveConfig(data);
    return NextResponse.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('保存个人账号配置失败:', error);
    return NextResponse.json(
      { success: false, error: '保存配置失败' },
      { status: 500 }
    );
  }
}
