import { NextRequest, NextResponse } from 'next/server';
import { getAllFeishuUsers, FeishuUser } from '@/lib/feishu-api';
import { 
  getFeishuConfig, 
  syncFeishuUsers as syncFeishuUsersToStorage,
  getFeishuAppCredentials 
} from '@/storage/database/feishu-config-storage';
import { userStorage } from '@/storage/database/user-storage';
import * as crypto from 'crypto';
import * as path from 'path';
import { existsSync, readFileSync } from 'fs';

// 密码加密
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// 生成盐
function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

const INITIAL_PASSWORD = 'admin123';
const FEISHU_USERS_FILE = path.join(process.cwd(), 'public', 'data', 'feishu_users.json');

// 同步飞书用户到用户管理
export async function POST(request: NextRequest) {
  console.log('🔄 开始同步飞书用户到用户管理...');
  
  try {
    let feishuUsers: FeishuUser[] = [];
    let source: string = '';
    
    // 1. 优先从企业自建应用API获取（最新数据）
    try {
      console.log('🚀 尝试从企业自建应用API获取用户...');
      const credentials = await getFeishuAppCredentials();
      
      if (!credentials.appId || !credentials.appSecret) {
        console.log('⚠️ 未配置企业自建应用，尝试从备份文件读取');
        throw new Error('未配置企业自建应用');
      }
      
      feishuUsers = await getAllFeishuUsers(credentials.appId, credentials.appSecret);
      
      if (feishuUsers.length > 0) {
        source = '企业自建应用API';
        console.log(`✅ 从企业自建应用API获取了 ${feishuUsers.length} 个飞书用户`);
      } else {
        console.log('⚠️ API返回用户为空，尝试从备份文件读取');
        throw new Error('API返回用户为空');
      }
    } catch (apiError) {
      console.log('⚠️ 企业自建应用API获取失败:', apiError);
      source = '备份文件';
      
      // 2. 从备份文件读取（备用方案）
      if (existsSync(FEISHU_USERS_FILE)) {
        console.log('📄 发现 feishu_users.json，使用此文件数据');
        const fileContent = readFileSync(FEISHU_USERS_FILE, 'utf-8');
        feishuUsers = JSON.parse(fileContent);
        console.log(`✅ 从 feishu_users.json 读取到 ${feishuUsers.length} 个用户`);
      } else {
        throw new Error('既无法从API获取用户，也没有备份文件');
      }
    }
    
    console.log(`✅ 共获取到 ${feishuUsers.length} 个飞书用户（来源: ${source}）`);
    
    // 保存到feishu-users.json（保持原有逻辑）
    if (source === '企业自建应用API') {
      await syncFeishuUsersToStorage(feishuUsers);
    }
    
    // 读取现有用户
    const existingUsers = userStorage.findAll();
    console.log(`📊 当前系统已有 ${existingUsers.length} 个用户`);
    
    // 同步到users-v2.json
    let newUsersCount = 0;
    let updatedUsersCount = 0;
    
    // 处理每个飞书用户
    for (const feishuUser of feishuUsers) {
      // 查找是否已存在该用户（通过open_id/union_id/user_id）
      const existingUser = existingUsers.find(u => 
        (u as any).openId === feishuUser.openId || 
        (u as any).unionId === feishuUser.unionId ||
        u.username === feishuUser.userId
      );
      
      if (existingUser) {
        // 更新现有用户
        userStorage.update(existingUser.id, {
          realName: feishuUser.name,
          email: feishuUser.email || existingUser.email,
          phone: feishuUser.mobile || existingUser.phone,
          ...({
            openId: feishuUser.openId || (existingUser as any).openId,
            unionId: feishuUser.unionId || (existingUser as any).unionId,
          } as any),
        });
        updatedUsersCount++;
        console.log(`🔄 更新用户: ${feishuUser.name} (${feishuUser.userId})`);
      } else {
        // 创建新用户
        userStorage.create({
          username: feishuUser.userId,
          realName: feishuUser.name,
          email: feishuUser.email || '',
          phone: feishuUser.mobile || '',
          department: '',
          position: '',
          role: 'agent',
          status: feishuUser.status === 'active' ? 'active' : 'inactive',
          allowedIps: [],
          ...({
            openId: feishuUser.openId || '',
            unionId: feishuUser.unionId || '',
          } as any),
        });
        newUsersCount++;
        console.log(`➕ 新增用户: ${feishuUser.name} (${feishuUser.userId})`);
      }
    }
    
    console.log(`💾 用户管理同步完成！共处理 ${feishuUsers.length} 个用户（来源: ${source}）`);
    
    // 返回用户名单
    const userList = feishuUsers.map((u, index) => ({
      序号: index + 1,
      用户ID: u.userId,
      姓名: u.name,
      邮箱: u.email || '',
      状态: u.status,
      数据来源: source,
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        total: feishuUsers.length,
        newUsers: newUsersCount,
        updatedUsers: updatedUsersCount,
        users: feishuUsers,
        userList: userList,
        source: source,
      },
      message: `同步成功！新增 ${newUsersCount} 个用户，更新 ${updatedUsersCount} 个用户（来源: ${source}）`,
    });
    
  } catch (error: any) {
    console.error('❌ 同步飞书用户失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '同步失败',
    }, { status: 500 });
  }
}
