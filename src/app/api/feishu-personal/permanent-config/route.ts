import { NextRequest, NextResponse } from 'next/server';
import { FeishuPersonalPermanentStorage } from '@/storage/database/feishu-personal-permanent-storage';

export async function GET() {
  try {
    const storage = FeishuPersonalPermanentStorage.getInstance();
    const config = await storage.get();
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('获取永久配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取永久配置失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const storage = FeishuPersonalPermanentStorage.getInstance();
    const config = await storage.save(body);
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('保存永久配置失败:', error);
    return NextResponse.json(
      { success: false, error: '保存永久配置失败' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const storage = FeishuPersonalPermanentStorage.getInstance();
    const config = await storage.initializeFromCurrentState();
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('初始化永久配置失败:', error);
    return NextResponse.json(
      { success: false, error: '初始化永久配置失败' },
      { status: 500 }
    );
  }
}