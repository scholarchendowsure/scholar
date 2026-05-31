import { db } from '@/lib/db/client';
import { shopData as shopDataTable } from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';

// 内存缓存
let shopDataCache: any = null;

// 从数据库读取店铺数据
async function loadShopDataFromDatabase() {
  const result = await db.select().from(shopDataTable).limit(1);
  if (result.length > 0) {
    const latestData = result[0].latestDataset;
    try {
      return JSON.parse(latestData);
    } catch (e) {
      console.error('解析店铺数据失败:', e);
      return {};
    }
  }
  return {};
}

// 获取店铺数据
export async function getShopData() {
  // 使用内存缓存
  if (shopDataCache) {
    return shopDataCache;
  }
  
  try {
    const data = await loadShopDataFromDatabase();
    shopDataCache = data;
    return data;
  } catch (error) {
    console.error('读取店铺数据失败:', error);
    return {};
  }
}

// 保存店铺数据
export async function saveShopData(data: any, userId: string) {
  try {
    const now = new Date().toISOString();
    const dataStr = JSON.stringify(data);
    
    // 检查是否已存在记录
    const existing = await db.select().from(shopDataTable).limit(1);
    
    if (existing.length > 0) {
      // 更新现有记录
      await db
        .update(shopDataTable)
        .set({
          userId: userId,
          updateTime: now,
          latestDataset: dataStr,
          updatedAt: now
        })
        .where(eq(shopDataTable.id, existing[0].id));
    } else {
      // 插入新记录
      await db.insert(shopDataTable).values({
        id: crypto.randomUUID(),
        userId: userId,
        updateTime: now,
        latestDataset: dataStr,
        createdAt: now,
        updatedAt: now
      });
    }
    
    // 更新内存缓存
    shopDataCache = data;
    
    console.log('✅ 保存店铺数据到数据库成功');
  } catch (error) {
    console.error('保存店铺数据到数据库失败:', error);
    throw error;
  }
}

// 清空缓存
export function clearShopDataCache() {
  shopDataCache = null;
}

// 兼容旧接口 - 按用户ID获取店铺数据
export async function getShopDataByUserId(userId: string) {
  return await getShopData();
}

// 兼容旧接口 - 按用户ID保存店铺数据
export async function saveShopDataByUserId(userId: string, updateTime: string, latestDataset: any) {
  await saveShopData(latestDataset, userId);
  return latestDataset;
}

// 兼容旧接口 - 获取所有店铺数据
export async function getAllShopData() {
  return await getShopData();
}
