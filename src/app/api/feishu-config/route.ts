import { NextRequest, NextResponse } from 'next/server';
import { 
  getFeishuConfig, 
  saveFeishuConfig, 
  updateFeishuAppCredentials,
  getFeishuAppCredentials 
} from '@/storage/database/feishu-config-storage';

export async function GET() {
  try {
    const config = await getFeishuConfig();
    // 不返回加密的 secret
    const { appSecretEncrypted, ...safeConfig } = config;
    return NextResponse.json({
      success: true,
      config: safeConfig,
    });
  } catch (error) {
    console.error('获取飞书配置失败:', error);
    return NextResponse.json(
      { success: false, message: '获取配置失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appId, appSecret, webhookUrl, sendMode } = body;

    const currentConfig = await getFeishuConfig();
    const updatedConfig = {
      ...currentConfig,
      webhookUrl: webhookUrl || '',
      sendMode: sendMode || 'private',
    };

    // 如果提供了 appId 和 appSecret，更新凭证
    if (appId && appSecret) {
      await updateFeishuAppCredentials(appId, appSecret);
      updatedConfig.appId = appId;
    } else if (appId) {
      // 只更新 appId
      updatedConfig.appId = appId;
      await saveFeishuConfig(updatedConfig);
    } else {
      // 更新其他配置
      await saveFeishuConfig(updatedConfig);
    }

    const { appSecretEncrypted, ...safeConfig } = updatedConfig;

    return NextResponse.json({
      success: true,
      config: safeConfig,
      message: '配置保存成功',
    });
  } catch (error) {
    console.error('保存飞书配置失败:', error);
    return NextResponse.json(
      { success: false, message: '保存配置失败' },
      { status: 500 }
    );
  }
}
