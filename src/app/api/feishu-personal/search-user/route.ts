import { NextRequest, NextResponse } from 'next/server';
import { getFeishuWebOAuthStorage } from '@/storage/database/feishu-web-oauth-storage';
import { searchFeishuUsersWithUserToken } from '@/lib/feishu-api';
import { saveFeishuUser, FeishuUser } from '@/storage/database/feishu-user-storage';
import fs from 'fs';
import path from 'path';

const FEISHU_USERS_FILE = path.join(process.cwd(), 'public/data/feishu-users.json');
const FEISHU_USERS_BACKUP = path.join(process.cwd(), 'public/data/feishu_users.json');
const USERS_V2_FILE = path.join(process.cwd(), 'public/data/users-v2.json');

// 保存用户到 feishu-users.json
async function saveToFeishuUsers(user: FeishuUser) {
  let users: FeishuUser[] = [];
  
  try {
    if (fs.existsSync(FEISHU_USERS_FILE)) {
      const content = fs.readFileSync(FEISHU_USERS_FILE, 'utf8');
      users = JSON.parse(content);
    }
  } catch (error) {
    console.warn('读取 feishu-users.json 失败，使用空数组');
  }
  
  // 检查用户是否已存在
  const existingIndex = users.findIndex(u => 
    u.id === user.id || 
    u.openId === user.openId || 
    u.userId === user.userId ||
    u.unionId === user.unionId
  );
  
  if (existingIndex >= 0) {
    // 更新现有用户
    users[existingIndex] = {
      ...users[existingIndex],
      ...user,
      updatedAt: new Date()
    };
  } else {
    // 添加新用户
    users.push(user);
  }
  
  // 保存文件
  fs.writeFileSync(FEISHU_USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  
  // 同时保存到备份文件
  fs.writeFileSync(FEISHU_USERS_BACKUP, JSON.stringify(users, null, 2), 'utf8');
  
  console.log(`✅ 用户 ${user.name} 已保存到 feishu-users.json`);
}

// 保存用户到 users-v2.json
async function saveToUsersV2(user: FeishuUser) {
  let usersV2: any[] = [];
  
  try {
    if (fs.existsSync(USERS_V2_FILE)) {
      const content = fs.readFileSync(USERS_V2_FILE, 'utf8');
      usersV2 = JSON.parse(content);
    }
  } catch (error) {
    console.warn('读取 users-v2.json 失败，使用空数组');
  }
  
  // 转换为用户管理格式
  const userV2 = {
    id: user.openId || user.userId || user.unionId || user.id,
    openId: user.openId || '',
    userId: user.userId || '',
    unionId: user.unionId || '',
    username: user.name,
    name: user.name,
    enName: user.enName || '',
    email: user.email || '',
    mobile: user.mobile || '',
    avatar: user.avatarUrl || '',
    role: 'collector', // 默认角色为外访员
    status: 'active',
    password: 'admin123', // 默认密码
    createdAt: user.createdAt.toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // 检查用户是否已存在
  const existingIndex = usersV2.findIndex(u => 
    u.openId === userV2.openId || 
    u.userId === userV2.userId ||
    u.unionId === userV2.unionId ||
    u.id === userV2.id
  );
  
  if (existingIndex >= 0) {
    // 更新现有用户，保留原有密码
    userV2.password = usersV2[existingIndex].password || 'admin123';
    usersV2[existingIndex] = {
      ...usersV2[existingIndex],
      ...userV2,
      updatedAt: new Date().toISOString()
    };
  } else {
    // 添加新用户
    usersV2.push(userV2);
  }
  
  // 保存文件
  fs.writeFileSync(USERS_V2_FILE, JSON.stringify(usersV2, null, 2), 'utf8');
  
  console.log(`✅ 用户 ${user.name} 已保存到 users-v2.json`);
}

// 同时支持 GET 和 POST 请求
async function handleSearch(request: NextRequest, queryParam: string) {
  try {
    if (!queryParam) {
      return NextResponse.json(
        { success: false, error: '请输入搜索关键词' },
        { status: 400 }
      );
    }

    // 获取用户 OAuth token
    const storage = await getFeishuWebOAuthStorage();
    const token = await storage.getToken();

    if (!token || !token.accessToken || token.expiresAt <= Date.now()) {
      return NextResponse.json(
        { success: false, error: '请先完成飞书个人账号授权' },
        { status: 401 }
      );
    }

    // 使用个人 OAuth token 搜索用户
    const users = await searchFeishuUsersWithUserToken(token.accessToken, queryParam);

    // 自动保存搜索到的用户到数据库（永久保存）
    for (const user of users) {
      const userToSave: FeishuUser = {
        id: user.openId || user.userId || user.unionId || `user_${Date.now()}`,
        unionId: user.unionId || '',
        userId: user.userId || '',
        openId: user.openId || '',
        name: user.name || '未知用户',
        enName: user.enName,
        email: user.email,
        mobile: user.mobile,
        avatarUrl: user.avatarUrl,
        company: user.company,
        chatId: user.chatId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      try {
        // 保存到 feishu-user-storage
        await saveFeishuUser(userToSave);
        console.log(`✅ 用户 ${user.name} 已保存到数据库`);
        
        // 永久保存到 feishu-users.json（本地数据库）
        await saveToFeishuUsers(userToSave);
        
        // 同时保存到 users-v2.json（用户管理）
        await saveToUsersV2(userToSave);
        
      } catch (saveError) {
        console.warn(`⚠️ 保存用户 ${user.name} 失败:`, saveError);
      }
    }

    // 返回第一个用户作为单个用户对象（兼容前端期望格式）
    const firstUser = users[0];
    return NextResponse.json({
      success: true,
      users: users,
      user: firstUser ? {
        openId: firstUser.openId,
        name: firstUser.name
      } : null
    });

  } catch (error) {
    console.error('搜索飞书用户失败:', error);
    return NextResponse.json(
      { success: false, error: '搜索失败' },
      { status: 500 }
    );
  }
}

// POST 请求
export async function POST(request: NextRequest) {
  const { query, keyword } = await request.json();
  return handleSearch(request, query || keyword);
}

// GET 请求
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const keyword = searchParams.get('keyword');
  return handleSearch(request, query || keyword || '');
}
