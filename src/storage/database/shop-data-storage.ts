import * as fs from 'fs';
import * as path from 'path';

// 店铺数据类型
export interface ShopDataRecord {
  id: string;
  loanCode: string;
  updateTime: string;
  latestDataset: string; // JSON字符串
  createdAt: string;
  updatedAt: string;
}

// 本地存储文件路径
const STORAGE_FILE = path.join(process.cwd(), 'public', 'data', 'shop-data.json');

// 内存缓存
let shopDataCache: ShopDataRecord[] | null = null;
let lastModifiedTime: number = 0;

// 确保存储目录存在
function ensureStorageDir() {
  const dir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 从本地文件加载数据
function loadFromLocalStorage(): ShopDataRecord[] {
  try {
    ensureStorageDir();
    if (fs.existsSync(STORAGE_FILE)) {
      const stats = fs.statSync(STORAGE_FILE);
      lastModifiedTime = stats.mtimeMs;
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const data = JSON.parse(content);
      console.log(`✅ 从本地文件加载了 ${data.length} 条店铺数据`);
      return data;
    }
  } catch (err) {
    console.error('从本地文件加载店铺数据失败:', err);
  }
  return [];
}

// 保存到本地文件
function saveToLocalStorage(records: ShopDataRecord[]) {
  try {
    ensureStorageDir();
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(records, null, 2));
    const stats = fs.statSync(STORAGE_FILE);
    lastModifiedTime = stats.mtimeMs;
    console.log(`✅ 保存了 ${records.length} 条店铺数据到本地文件`);
  } catch (err) {
    console.error('保存店铺数据到本地文件失败:', err);
  }
}

// 初始化内存缓存
function initCache(forceReload = false) {
  if (shopDataCache === null || forceReload) {
    shopDataCache = loadFromLocalStorage();
  } else {
    // 检查文件是否被修改
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const stats = fs.statSync(STORAGE_FILE);
        if (stats.mtimeMs > lastModifiedTime) {
          console.log('📁 检测到店铺数据文件已更新，重新加载');
          shopDataCache = loadFromLocalStorage();
        }
      }
    } catch (err) {
      console.error('检查店铺数据文件修改时间失败:', err);
    }
  }
}

// 根据贷款单号获取店铺数据（最新的一条）
export async function getShopDataByLoanCode(
  loanCode: string
): Promise<ShopDataRecord | null> {
  initCache();
  if (!shopDataCache) return null;
  
  // 过滤该贷款单号的记录
  const records = shopDataCache.filter(r => r.loanCode === loanCode);
  
  // 按更新时间倒序，取最新的一条
  if (records.length > 0) {
    records.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return records[0];
  }
  
  return null;
}

// 保存店铺数据
export async function saveShopData(
  loanCode: string,
  updateTime: string,
  latestDataset: string
): Promise<ShopDataRecord> {
  initCache();
  if (!shopDataCache) {
    shopDataCache = [];
  }
  
  const now = new Date().toISOString();
  const id = `shop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const newRecord: ShopDataRecord = {
    id,
    loanCode,
    updateTime,
    latestDataset,
    createdAt: now,
    updatedAt: now
  };
  
  // 检查是否已存在相同贷款单号的记录，如果存在则更新
  const existingIndex = shopDataCache.findIndex(
    r => r.loanCode === loanCode
  );
  
  if (existingIndex >= 0) {
    // 更新现有记录
    newRecord.id = shopDataCache[existingIndex].id;
    newRecord.createdAt = shopDataCache[existingIndex].createdAt;
    shopDataCache[existingIndex] = newRecord;
    console.log(`🔄 更新店铺数据: loanCode=${loanCode}`);
  } else {
    // 新增记录
    shopDataCache.push(newRecord);
    console.log(`➕ 新增店铺数据: loanCode=${loanCode}`);
  }
  
  // 保存到文件
  saveToLocalStorage(shopDataCache);
  
  return newRecord;
}

// 获取所有店铺数据
export async function getAllShopData(): Promise<ShopDataRecord[]> {
  initCache();
  return shopDataCache || [];
}
