// 飞书用户存储
// 支持 Supabase 和本地 JSON 文件 fallback

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 本地 JSON 文件路径（fallback）
const path = require('path');
const LOCAL_DATA_PATH = path.join(process.cwd(), 'public', 'data', 'feishu_users.json');
const FALLBACK_DATA_PATH = path.join(process.cwd(), 'public', 'data', 'feishu_users.json');

// 飞书用户类型
export interface FeishuUser {
  id: string;
  unionId: string;
  userId: string;
  name: string;
  enName?: string;
  email?: string;
  mobile?: string;
  avatarUrl?: string;
  status: 'active' | 'inactive';
  departmentIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// 内存缓存
let usersCache: FeishuUser[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 60000; // 1分钟缓存

// 初始化 Supabase 客户端
let supabase: any = null;
try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase 客户端已创建（飞书用户）');
  } else {
    console.log('⚠️ Supabase 环境变量未配置，将使用 fallback 存储（飞书用户）');
  }
} catch (error) {
  console.log('⚠️ Supabase 客户端创建失败，使用 fallback 存储（飞书用户）:', error);
}

// 读取本地 JSON 文件
async function readLocalFile(): Promise<FeishuUser[]> {
  const fs = require('fs').promises;
  const path = require('path');
  
  // 尝试多个路径
  for (const filePath of [LOCAL_DATA_PATH, FALLBACK_DATA_PATH]) {
    try {
      const dirPath = path.dirname(filePath);
      try {
        await fs.access(dirPath);
      } catch {
        await fs.mkdir(dirPath, { recursive: true });
      }
      
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(data);
        console.log(`📖 从 ${filePath} 读取了 ${parsed.length} 个飞书用户`);
        return parsed.map((u: any) => ({
          ...u,
          createdAt: new Date(u.createdAt || u.created_at || Date.now()),
          updatedAt: new Date(u.updatedAt || u.updated_at || Date.now()),
        }));
      } catch {
        // 文件不存在，返回空数组
        return [];
      }
    } catch (error) {
      console.log(`⚠️ 无法读取 ${filePath}，尝试下一个路径`);
    }
  }
  return [];
}

// 写入本地 JSON 文件
async function writeLocalFile(users: FeishuUser[]): Promise<void> {
  const fs = require('fs').promises;
  const path = require('path');
  
  const data = users.map(u => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }));
  
  // 写入多个路径确保至少有一个成功
  for (const filePath of [LOCAL_DATA_PATH, FALLBACK_DATA_PATH]) {
    try {
      const dirPath = path.dirname(filePath);
      try {
        await fs.access(dirPath);
      } catch {
        await fs.mkdir(dirPath, { recursive: true });
      }
      
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`💾 已保存 ${users.length} 个飞书用户到 ${filePath}`);
      return; // 成功写入一个就返回
    } catch (error) {
      console.warn(`⚠️ 无法写入 ${filePath}:`, error);
    }
  }
}

/**
 * 获取所有飞书用户
 */
export async function getFeishuUsers(): Promise<FeishuUser[]> {
  // 检查缓存
  const now = Date.now();
  if (usersCache && now - lastCacheTime < CACHE_TTL) {
    console.log('📦 使用缓存的飞书用户列表');
    return usersCache;
  }

  try {
    // 优先使用 Supabase
    if (supabase) {
      try {
        console.log('🔍 从 Supabase 获取飞书用户...');
        const { data, error } = await supabase
          .from('feishu_users')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (!error && data) {
          const users = data.map((u: any) => ({
            id: u.id,
            unionId: u.union_id || u.unionId || '',
            userId: u.user_id || u.userId || '',
            name: u.name || '未知用户',
            enName: u.en_name || u.enName,
            email: u.email,
            mobile: u.mobile,
            avatarUrl: u.avatar_url || u.avatarUrl,
            status: u.status || 'active',
            departmentIds: u.department_ids || u.departmentIds,
            createdAt: new Date(u.created_at || u.createdAt || Date.now()),
            updatedAt: new Date(u.updated_at || u.updatedAt || Date.now()),
          }));
          
          console.log(`✅ 从 Supabase 获取了 ${users.length} 个飞书用户`);
          usersCache = users;
          lastCacheTime = now;
          return users;
        }
        console.warn('⚠️ Supabase 查询失败，使用 fallback:', error);
      } catch (dbError) {
        console.warn('⚠️ Supabase 操作失败，使用 fallback:', dbError);
      }
    }
  } catch (error) {
    console.warn('⚠️ Supabase 不可用，使用 fallback 存储:', error);
  }

  // Fallback: 本地 JSON 文件
  console.log('💾 使用本地 fallback 存储获取飞书用户');
  const users = await readLocalFile();
  usersCache = users;
  lastCacheTime = now;
  return users;
}

/**
 * 保存飞书用户
 */
export async function saveFeishuUser(user: FeishuUser): Promise<FeishuUser> {
  const now = new Date();
  const userToSave = {
    ...user,
    updatedAt: now,
    createdAt: user.createdAt || now,
  };

  try {
    // 优先使用 Supabase
    if (supabase) {
      try {
        console.log('💾 保存飞书用户到 Supabase:', user.name);
        
        const { data, error } = await supabase
          .from('feishu_users')
          .upsert({
            id: userToSave.id,
            union_id: userToSave.unionId,
            user_id: userToSave.userId,
            name: userToSave.name,
            en_name: userToSave.enName,
            email: userToSave.email,
            mobile: userToSave.mobile,
            avatar_url: userToSave.avatarUrl,
            status: userToSave.status,
            department_ids: userToSave.departmentIds,
            updated_at: userToSave.updatedAt.toISOString(),
            created_at: userToSave.createdAt.toISOString(),
          })
          .select()
          .single();
          
        if (!error && data) {
          console.log('✅ 飞书用户已保存到 Supabase:', user.name);
          // 清除缓存
          usersCache = null;
          return userToSave;
        }
        console.warn('⚠️ Supabase 保存失败，使用 fallback:', error);
      } catch (dbError) {
        console.warn('⚠️ Supabase 操作失败，使用 fallback:', dbError);
      }
    }
  } catch (error) {
    console.warn('⚠️ Supabase 不可用，使用 fallback 存储:', error);
  }

  // Fallback: 本地 JSON 文件
  console.log('💾 使用本地 fallback 存储保存飞书用户:', user.name);
  const users = await readLocalFile();
  
  // 检查是否已存在
  const existingIndex = users.findIndex(u => u.id === userToSave.id || u.userId === userToSave.userId);
  
  if (existingIndex >= 0) {
    users[existingIndex] = userToSave;
  } else {
    users.push(userToSave);
  }
  
  await writeLocalFile(users);
  usersCache = null; // 清除缓存
  return userToSave;
}

/**
 * 删除飞书用户
 */
export async function deleteFeishuUser(userId: string): Promise<void> {
  try {
    // 优先使用 Supabase
    if (supabase) {
      try {
        console.log('🗑️ 从 Supabase 删除飞书用户:', userId);
        
        const { error } = await supabase
          .from('feishu_users')
          .delete()
          .eq('id', userId)
          .eq('user_id', userId);
          
        if (!error) {
          console.log('✅ 飞书用户已从 Supabase 删除:', userId);
          usersCache = null; // 清除缓存
          return;
        }
        console.warn('⚠️ Supabase 删除失败，使用 fallback:', error);
      } catch (dbError) {
        console.warn('⚠️ Supabase 操作失败，使用 fallback:', dbError);
      }
    }
  } catch (error) {
    console.warn('⚠️ Supabase 不可用，使用 fallback 存储:', error);
  }

  // Fallback: 本地 JSON 文件
  console.log('🗑️ 使用本地 fallback 存储删除飞书用户:', userId);
  const users = await readLocalFile();
  const filteredUsers = users.filter(u => u.id !== userId && u.userId !== userId);
  await writeLocalFile(filteredUsers);
  usersCache = null; // 清除缓存
}
