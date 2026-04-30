import { NextRequest, NextResponse } from 'next/server';
import { 
  getFeishuUsers, 
  syncFeishuUsers as syncFeishuUsersToStorage,
  saveFeishuUsers
} from '@/storage/database/feishu-config-storage';
import { getFeishuAppCredentials } from '@/storage/database/feishu-config-storage';
import { getAllFeishuUsers } from '@/lib/feishu-api';

export async function GET() {
  try {
    const users = await getFeishuUsers();
    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('获取飞书用户失败:', error);
    return NextResponse.json(
      { success: false, message: '获取用户失败' },
      { status: 500 }
    );
  }
}
