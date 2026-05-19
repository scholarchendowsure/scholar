import * as fs from 'fs';
import * as path from 'path';

// 商户-销售人员映射关系类型
export interface MerchantSalesMapping {
  id: string;
  merchantId: string;
  salesFeishuName: string;
  createdAt: Date;
  updatedAt: Date;
}

// Fallback 存储：内存+文件
let fallbackData: MerchantSalesMapping[] = [];
let fallbackNextId: number = 1;
let fallbackDataLoaded = false;

// 确定 fallback 存储文件路径
function getFallbackStorageFilePath(): string {
  return path.join(process.cwd(), 'public', 'data', 'merchant-sales-mappings.json');
}

// 从 fallback 文件加载数据
async function loadFromFallbackFile(): Promise<void> {
  if (fallbackDataLoaded) return;
  
  try {
    const filePath = getFallbackStorageFilePath();
    
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(data);
      fallbackData = parsed.mappings.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      }));
      fallbackNextId = parsed.nextId || 1;
    }
    fallbackDataLoaded = true;
  } catch (error) {
    console.error('从 fallback 文件加载数据失败:', error);
    fallbackDataLoaded = true;
  }
}

// 保存数据到 fallback 文件
async function saveToFallbackFile(): Promise<void> {
  try {
    const filePath = getFallbackStorageFilePath();
    
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const dataToSave = {
      mappings: fallbackData,
      nextId: fallbackNextId,
    };
    
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf8');
  } catch (error) {
    console.error('保存数据到 fallback 文件失败:', error);
  }
}

// 生成 fallback 唯一 ID
function generateFallbackId(): string {
  return String(fallbackNextId++);
}

// 获取所有商户-销售映射关系（分页）
export async function getAllMerchantSalesMappings(
  offset: number = 0,
  limit: number = 100000
): Promise<{ mappings: MerchantSalesMapping[]; total: number }> {
  console.log('使用本地存储获取商户-销售映射关系');
  await loadFromFallbackFile();
  const end = offset + limit;
  const mappings = fallbackData.slice(offset, end);
  return { mappings, total: fallbackData.length };
}

// 根据ID获取商户-销售映射关系
export async function getMerchantSalesMapping(id: string): Promise<MerchantSalesMapping | null> {
  console.log('使用本地存储获取单条商户-销售映射关系');
  await loadFromFallbackFile();
  const mapping = fallbackData.find(m => m.id === id);
  return mapping || null;
}

// 根据商户ID获取销售人员
export async function getSalesByMerchantId(merchantId: string): Promise<MerchantSalesMapping | null> {
  console.log('使用本地存储根据商户ID查询');
  await loadFromFallbackFile();
  const mapping = fallbackData.find(m => m.merchantId === merchantId);
  return mapping || null;
}

// 创建商户-销售映射关系
export async function createMerchantSalesMapping(
  merchantId: string,
  salesFeishuName: string
): Promise<MerchantSalesMapping> {
  console.log('使用本地存储创建商户-销售映射关系');
  await loadFromFallbackFile();
  const now = new Date();
  const mapping: MerchantSalesMapping = {
    id: generateFallbackId(),
    merchantId,
    salesFeishuName,
    createdAt: now,
    updatedAt: now,
  };
  
  fallbackData.push(mapping);
  await saveToFallbackFile();
  console.log('数据已保存到本地存储');
  return mapping;
}

// 更新商户-销售映射关系
export async function updateMerchantSalesMapping(
  id: string,
  updates: Partial<{ merchantId: string; salesFeishuName: string }>
): Promise<MerchantSalesMapping> {
  console.log('使用本地存储更新商户-销售映射关系');
  await loadFromFallbackFile();
  const index = fallbackData.findIndex(m => m.id === id);
  if (index === -1) {
    throw new Error('商户-销售映射关系不存在');
  }

  fallbackData[index] = {
    ...fallbackData[index],
    ...updates,
    updatedAt: new Date(),
  };
  
  await saveToFallbackFile();
  console.log('数据已更新到本地存储');
  return fallbackData[index];
}

// 删除商户-销售映射关系
export async function deleteMerchantSalesMapping(id: string): Promise<void> {
  console.log('使用本地存储删除商户-销售映射关系');
  await loadFromFallbackFile();
  const index = fallbackData.findIndex(m => m.id === id);
  if (index !== -1) {
    fallbackData.splice(index, 1);
    await saveToFallbackFile();
    console.log('数据已从本地存储删除');
  }
}
