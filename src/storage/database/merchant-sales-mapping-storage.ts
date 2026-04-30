// 商户-销售人员映射关系类型
export interface MerchantSalesMapping {
  id: string;
  merchantId: string;
  salesFeishuName: string;
  createdAt: Date;
  updatedAt: Date;
}

// 内存存储
let mockData: MerchantSalesMapping[] = [];
let nextId = 1;

// 生成唯一 ID
function generateId(): string {
  return String(nextId++);
}

// 获取所有商户-销售映射关系（分页）
export async function getAllMerchantSalesMappings(
  offset: number = 0,
  limit: number = 100
): Promise<{ mappings: MerchantSalesMapping[]; total: number }> {
  const end = offset + limit;
  const mappings = mockData.slice(offset, end);
  return { mappings, total: mockData.length };
}

// 根据ID获取商户-销售映射关系
export async function getMerchantSalesMapping(id: string): Promise<MerchantSalesMapping | null> {
  const mapping = mockData.find(m => m.id === id);
  return mapping || null;
}

// 根据商户ID获取销售人员
export async function getSalesByMerchantId(merchantId: string): Promise<MerchantSalesMapping | null> {
  const mapping = mockData.find(m => m.merchantId === merchantId);
  return mapping || null;
}

// 创建商户-销售映射关系
export async function createMerchantSalesMapping(
  merchantId: string,
  salesFeishuName: string
): Promise<MerchantSalesMapping> {
  const now = new Date();
  const mapping: MerchantSalesMapping = {
    id: generateId(),
    merchantId,
    salesFeishuName,
    createdAt: now,
    updatedAt: now,
  };
  
  mockData.push(mapping);
  return mapping;
}

// 更新商户-销售映射关系
export async function updateMerchantSalesMapping(
  id: string,
  updates: Partial<{ merchantId: string; salesFeishuName: string }>
): Promise<MerchantSalesMapping> {
  const index = mockData.findIndex(m => m.id === id);
  if (index === -1) {
    throw new Error('商户-销售映射关系不存在');
  }

  mockData[index] = {
    ...mockData[index],
    ...updates,
    updatedAt: new Date(),
  };

  return mockData[index];
}

// 删除商户-销售映射关系
export async function deleteMerchantSalesMapping(id: string): Promise<void> {
  const index = mockData.findIndex(m => m.id === id);
  if (index !== -1) {
    mockData.splice(index, 1);
  }
}

// 批量导入商户-销售映射关系
export async function batchImportMerchantSalesMappings(
  mappings: Array<{ merchantId: string; salesFeishuName: string }>,
  mode: 'append' | 'replace' = 'append'
): Promise<{ inserted: number; updated: number }> {
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

  return { inserted, updated };
}

// 清空所有商户-销售映射关系
export async function clearAllMerchantSalesMappings(): Promise<void> {
  mockData = [];
  nextId = 1;
}
