import { NextRequest, NextResponse } from 'next/server';
import { getAllFeishuUsers, FeishuUser } from '@/lib/feishu-api';
import { 
  getFeishuConfig, 
  syncFeishuUsers as syncFeishuUsersToStorage,
  getFeishuAppCredentials 
} from '@/storage/database/feishu-config-storage';
import { userStorage } from '@/storage/database/user-storage';
import { User } from '@/types/user';
import * as crypto from 'crypto';

// 密码加密
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// 生成盐
function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

const INITIAL_PASSWORD = 'admin123';

// 同步飞书用户到用户管理
export async function POST(request: NextRequest) {
  console.log('🔄 开始同步飞书用户到用户管理...');
  
  try {
    // 获取飞书配置
    const credentials = await getFeishuAppCredentials();
    
    if (!credentials.appId || !credentials.appSecret) {
      return NextResponse.json({
        success: false,
        error: '请先配置飞书企业应用（App ID 和 App Secret）',
      }, { status: 400 });
    }
    
    // 获取所有飞书用户
    console.log('📥 从飞书获取用户列表...');
    const feishuUsers = await getAllFeishuUsers(credentials.appId, credentials.appSecret);
    
    console.log(`✅ 获取到 ${feishuUsers.length} 个飞书用户`);
    
    // 保存到feishu-users.json（保持原有逻辑）
    await syncFeishuUsersToStorage(feishuUsers);
    console.log('💾 已保存到飞书用户数据文件');
    
    // 读取现有用户
    const existingUsers = userStorage.findAll();
    console.log(`📊 当前系统已有 ${existingUsers.length} 个用户`);
    
    // 同步到users-v2.json
    let newUsersCount = 0;
    let updatedUsersCount = 0;
    const now = new Date().toISOString();
    
    // 处理每个飞书用户
    for (const feishuUser of feishuUsers) {
      // 查找是否已存在该用户（通过open_id/union_id/user_id）
      const existingUser = existingUsers.find(u => 
        u.openId === feishuUser.openId || 
        u.unionId === feishuUser.unionId ||
        u.username === feishuUser.userId
      );
      
      if (existingUser) {
        // 更新现有用户
        userStorage.update(existingUser.id, {
          realName: feishuUser.name,
          email: feishuUser.email || existingUser.email,
          phone: feishuUser.mobile || existingUser.phone,
          openId: feishuUser.openId || existingUser.openId,
          unionId: feishuUser.unionId || existingUser.unionId,
        });
        updatedUsersCount++;
        console.log(`🔄 更新用户: ${feishuUser.name} (${feishuUser.userId})`);
      } else {
        // 创建新用户
        const salt = generateSalt();
        userStorage.create({
          username: feishuUser.userId,
          realName: feishuUser.name,
          email: feishuUser.email || '',
          phone: feishuUser.mobile || '',
          department: '',
          position: '',
          role: 'agent',
          status: feishuUser.status === 'active' ? 'active' : 'inactive',
          openId: feishuUser.openId || '',
          unionId: feishuUser.unionId || '',
          allowedIps: [],
        });
        newUsersCount++;
        console.log(`➕ 新增用户: ${feishuUser.name} (${feishuUser.userId})`);
      }
    }
    
    console.log(`💾 用户管理同步完成！共处理 ${feishuUsers.length} 个用户`);
    
    return NextResponse.json({
      success: true,
      data: {
        total: feishuUsers.length,
        newUsers: newUsersCount,
        updatedUsers: updatedUsersCount,
        users: feishuUsers,
      },
      message: `同步成功！新增 ${newUsersCount} 个用户，更新 ${updatedUsersCount} 个用户`,
    });
    
  } catch (error: any) {
    console.error('❌ 同步飞书用户失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '同步失败',
    }, { status: 500 });
  }
}
