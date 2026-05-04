import { NextResponse } from 'next/server';
import { bitableConfigStorage } from '@/storage/database/feishu-bitable-storage';

export async function GET() {
  try {
    const configs = bitableConfigStorage.findAll();
    return NextResponse.json({
      success: true,
      configs,
    });
  } catch (error) {
    console.error('获取飞书多维表格配置失败:', error);
    return NextResponse.json(
      { success: false, message: '获取配置失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { appId, appSecret, appToken, tableId, syncEnabled, syncDirection, fieldMapping } = body;

    if (!appId || !appToken || !tableId) {
      return NextResponse.json(
        { success: false, message: '请填写完整的配置信息' },
        { status: 400 }
      );
    }

    const existingConfig = bitableConfigStorage.findByAppId(appId);
    if (existingConfig) {
      const updateData: any = {
        appToken,
        tableId,
        syncEnabled,
        syncDirection,
        fieldMapping,
      };
      // 只有提供了新的appSecret才更新
      if (appSecret) {
        updateData.appSecret = appSecret;
      }
      
      const updated = bitableConfigStorage.update(existingConfig.id, updateData);

      return NextResponse.json({
        success: true,
        config: updated,
      });
    } else {
      const newConfig = bitableConfigStorage.create({
        appId,
        appSecret: appSecret || '',
        appToken,
        tableId,
        syncEnabled: syncEnabled ?? true,
        syncDirection: syncDirection ?? 'bidirectional',
        fieldMapping: fieldMapping ?? {},
      });

      return NextResponse.json({
        success: true,
        config: newConfig,
      });
    }
  } catch (error) {
    console.error('保存飞书多维表格配置失败:', error);
    return NextResponse.json(
      { success: false, message: '保存配置失败' },
      { status: 500 }
    );
  }
}
