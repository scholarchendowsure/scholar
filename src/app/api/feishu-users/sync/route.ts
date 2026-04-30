import { NextRequest, NextResponse } from 'next/server';
import { 
  syncFeishuUsers as syncFeishuUsersToStorage
} from '@/storage/database/feishu-config-storage';
import { getFeishuAppCredentials } from '@/storage/database/feishu-config-storage';
import { getAllFeishuUsers } from '@/lib/feishu-api';

export async function POST() {
  try {
    const credentials = await getFeishuAppCredentials();
    
    if (!credentials.appId || !credentials.appSecret) {
      return NextResponse.json(
        { success: false, message: '请先配置 App ID 和 App Secret' },
        { status: 400 }
      );
    }

    console.log('🔄 开始同步飞书用户...');
    
    // 从飞书API获取用户
    const apiUsers = await getAllFeishuUsers(credentials.appId, credentials.appSecret);
    
    // 同步到本地存储
    const syncedUsers = await syncFeishuUsersToStorage(apiUsers);
    
    console.log(`✅ 成功同步 ${syncedUsers.length} 个飞书用户`);

    return NextResponse.json({
      success: true,
      count: syncedUsers.length,
      users: syncedUsers,
      message: `成功同步 ${syncedUsers.length} 个用户`,
    });
  } catch (error) {
    console.error('同步飞书用户失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '同步用户失败' 
      },
      { status: 500 }
    );
  }
}
