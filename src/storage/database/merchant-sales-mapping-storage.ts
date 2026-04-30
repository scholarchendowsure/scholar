// 商户-销售人员映射关系类型
export interface MerchantSalesMapping {
  id: string;
  merchantId: string;
  salesFeishuName: string;
  createdAt: Date;
  updatedAt: Date;
}

// 确定存储文件路径
function getStorageFilePath(): string {
  const isProd = process.env.COZE_PROJECT_ENV === 'PROD';
  // 生产环境使用 /tmp 目录，开发环境使用项目目录
  if (isProd) {
    return '/tmp/merchant-sales-mappings.json';
  }
  // 开发环境使用项目根目录
  const workspacePath = process.env.COZE_WORKSPACE_PATH || '/workspace/projects';
  return `${workspacePath}/merchant-sales-mappings.json`;
}

// 确保文件存在
let storageFileInitialized = false;

// 内存缓存
let mockData: MerchantSalesMapping[] = [];
let nextId: number = 1;
let dataLoaded = false;

// 从文件加载数据
async function loadFromFile(): Promise<void> {
  if (dataLoaded) return;
  
  const fs = require('fs');
  const path = require('path');
  
  try {
    const filePath = getStorageFilePath();
    
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(data);
      mockData = parsed.mappings.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      }));
      nextId = parsed.nextId || 1;
    }
    dataLoaded = true;
  } catch (error) {
    console.error('从文件加载数据失败:', error);
    dataLoaded = true;
  }
}

// 保存数据到文件
async function saveToFile(): Promise<void> {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const filePath = getStorageFilePath();
    
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const dataToSave = {
      mappings: mockData,
      nextId,
    };
    
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf8');
  } catch (error) {
    console.error('保存数据到文件失败:', error);
  }
}

// 生成唯一 ID
function generateId(): string {
  return String(nextId++);
}

// 获取所有商户-销售映射关系（分页）
export async function getAllMerchantSalesMappings(
  offset: number = 0,
  limit: number = 100000
): Promise<{ mappings: MerchantSalesMapping[]; total: number }> {
  await loadFromFile();
  const end = offset + limit;
  const mappings = mockData.slice(offset, end);
  return { mappings, total: mockData.length };
}

// 根据ID获取商户-销售映射关系
export async function getMerchantSalesMapping(id: string): Promise<MerchantSalesMapping | null> {
  await loadFromFile();
  const mapping = mockData.find(m => m.id === id);
  return mapping || null;
}

// 根据商户ID获取销售人员
export async function getSalesByMerchantId(merchantId: string): Promise<MerchantSalesMapping | null> {
  await loadFromFile();
  const mapping = mockData.find(m => m.merchantId === merchantId);
  return mapping || null;
}

// 创建商户-销售映射关系
export async function createMerchantSalesMapping(
  merchantId: string,
  salesFeishuName: string
): Promise<MerchantSalesMapping> {
  await loadFromFile();
  const now = new Date();
  const mapping: MerchantSalesMapping = {
    id: generateId(),
    merchantId,
    salesFeishuName,
    createdAt: now,
    updatedAt: now,
  };
  
  mockData.push(mapping);
  await saveToFile();
  return mapping;
}

// 更新商户-销售映射关系
export async function updateMerchantSalesMapping(
  id: string,
  updates: Partial<{ merchantId: string; salesFeishuName: string }>
): Promise<MerchantSalesMapping> {
  await loadFromFile();
  const index = mockData.findIndex(m => m.id === id);
  if (index === -1) {
    throw new Error('商户-销售映射关系不存在');
  }

  mockData[index] = {
    ...mockData[index],
    ...updates,
    updatedAt: new Date(),
  };
  
  await saveToFile();
  return mockData[index];
}

// 删除商户-销售映射关系
export async function deleteMerchantSalesMapping(id: string): Promise<void> {
  await loadFromFile();
  const index = mockData.findIndex(m => m.id === id);
  if (index !== -1) {
    mockData.splice(index, 1);
    await saveToFile();
  }
}

// 批量导入商户-销售映射关系
export async function batchImportMerchantSalesMappings(
  mappings: Array<{ merchantId: string; salesFeishuName: string }>,
  mode: 'append' | 'replace' = 'append'
): Promise<{ inserted: number; updated: number }> {
  await loadFromFile();
  let inserted = 0;
  let updated = 0;
  const now = new Date();

  if (mode === 'replace') {
    // 替换模式：先删除所有现有数据
    mockData = [];
    nextId = 1;
  }

  for (const mapping of mappings) {
    const existingIndex = mockData.findIndex(m => m.merchantId === mapping.merchantId);
    
    if (existingIndex !== -1 && mode === 'append') {
      // 追加模式：更新已有数据
      mockData[existingIndex] = {
        ...mockData[existingIndex],
        salesFeishuName: mapping.salesFeishuName,
        updatedAt: now,
      };
      updated++;
    } else {
      // 插入新数据
      const newMapping: MerchantSalesMapping = {
        id: generateId(),
        merchantId: mapping.merchantId,
        salesFeishuName: mapping.salesFeishuName,
        createdAt: now,
        updatedAt: now,
      };
      mockData.push(newMapping);
      inserted++;
    }
  }

  await saveToFile();
  return { inserted, updated };
}

// 清空所有商户-销售映射关系
export async function clearAllMerchantSalesMappings(): Promise<void> {
  await loadFromFile();
  mockData = [];
  nextId = 1;
  await saveToFile();
}
