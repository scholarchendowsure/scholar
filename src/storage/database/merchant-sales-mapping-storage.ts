import { getSupabaseClient } from './supabase-client';

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
  const isProd = process.env.COZE_PROJECT_ENV === 'PROD';
  if (isProd) {
    return '/tmp/merchant-sales-mappings.json';
  }
  const workspacePath = process.env.COZE_WORKSPACE_PATH || '/workspace/projects';
  return `${workspacePath}/merchant-sales-mappings.json`;
}

// 从 fallback 文件加载数据
async function loadFromFallbackFile(): Promise<void> {
  if (fallbackDataLoaded) return;
  
  try {
    const fs = require('fs');
    const path = require('path');
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
    const fs = require('fs');
    const path = require('path');
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

// 将数据库行转换为 MerchantSalesMapping 类型
function transformRow(row: Record<string, unknown>): MerchantSalesMapping {
  return {
    id: String(row.id || ''),
    merchantId: String(row.merchant_id || ''),
    salesFeishuName: String(row.sales_feishu_name || ''),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

// 检查 Supabase 是否可用
async function isSupabaseAvailable(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { error } = await client
      .from('merchant_sales_mappings')
      .select('*')
      .limit(1);
    
    // 如果有错误，说明表不存在或者连接有问题
    if (error) {
      console.log('Supabase 不可用，使用 fallback 存储:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.log('Supabase 连接失败，使用 fallback 存储:', err);
    return false;
  }
}

// 获取所有商户-销售映射关系（分页）
export async function getAllMerchantSalesMappings(
  offset: number = 0,
  limit: number = 100000
): Promise<{ mappings: MerchantSalesMapping[]; total: number }> {
  const supabaseAvailable = await isSupabaseAvailable();
  
  if (supabaseAvailable) {
    try {
      const client = getSupabaseClient();
      
      // 先获取总数
      const { count, error: countError } = await client
        .from('merchant_sales_mappings')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('获取商户-销售映射关系总数失败:', countError);
      }
      
      // 再获取分页数据
      const { data, error } = await client
        .from('merchant_sales_mappings')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {
        console.error('获取商户-销售映射关系失败:', error);
        throw error;
      }
      
      const mappings = (data || []).map(transformRow);
      return { mappings, total: count || mappings.length };
    } catch (err) {
      console.error('Supabase 查询失败，使用 fallback:', err);
    }
  }
  
  // Fallback: 使用本地存储
  console.log('使用本地 fallback 存储获取数据');
  await loadFromFallbackFile();
  const end = offset + limit;
  const mappings = fallbackData.slice(offset, end);
  return { mappings, total: fallbackData.length };
}

// 根据ID获取商户-销售映射关系
export async function getMerchantSalesMapping(id: string): Promise<MerchantSalesMapping | null> {
  const supabaseAvailable = await isSupabaseAvailable();
  
  if (supabaseAvailable) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('merchant_sales_mappings')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        return transformRow(data);
      }
      throw error;
    } catch (err) {
      console.error('Supabase 查询失败，使用 fallback:', err);
    }
  }
  
  // Fallback: 使用本地存储
  console.log('使用本地 fallback 存储获取单条数据');
  await loadFromFallbackFile();
  const mapping = fallbackData.find(m => m.id === id);
  return mapping || null;
}

// 根据商户ID获取销售人员
export async function getSalesByMerchantId(merchantId: string): Promise<MerchantSalesMapping | null> {
  const supabaseAvailable = await isSupabaseAvailable();
  
  if (supabaseAvailable) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('merchant_sales_mappings')
        .select('*')
        .eq('merchant_id', merchantId)
        .maybeSingle();
      
      if (!error && data) {
        return transformRow(data);
      }
      throw error;
    } catch (err) {
      console.error('Supabase 查询失败，使用 fallback:', err);
    }
  }
  
  // Fallback: 使用本地存储
  console.log('使用本地 fallback 存储根据商户ID查询');
  await loadFromFallbackFile();
  const mapping = fallbackData.find(m => m.merchantId === merchantId);
  return mapping || null;
}

// 创建商户-销售映射关系
export async function createMerchantSalesMapping(
  merchantId: string,
  salesFeishuName: string
): Promise<MerchantSalesMapping> {
  const supabaseAvailable = await isSupabaseAvailable();
  
  if (supabaseAvailable) {
    try {
      const client = getSupabaseClient();
      const now = new Date().toISOString();
      
      const { data, error } = await client
        .from('merchant_sales_mappings')
        .insert({
          merchant_id: merchantId,
          sales_feishu_name: salesFeishuName,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();
      
      if (!error && data) {
        return transformRow(data);
      }
      throw error;
    } catch (err) {
      console.error('Supabase 插入失败，使用 fallback:', err);
    }
  }
  
  // Fallback: 使用本地存储
  console.log('使用本地 fallback 存储创建数据');
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
  console.log('数据已保存到本地 fallback 存储');
  return mapping;
}

// 更新商户-销售映射关系
export async function updateMerchantSalesMapping(
  id: string,
  updates: Partial<{ merchantId: string; salesFeishuName: string }>
): Promise<MerchantSalesMapping> {
  const supabaseAvailable = await isSupabaseAvailable();
  
  if (supabaseAvailable) {
    try {
      const client = getSupabaseClient();
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (updates.merchantId !== undefined) {
        updateData.merchant_id = updates.merchantId;
      }
      if (updates.salesFeishuName !== undefined) {
        updateData.sales_feishu_name = updates.salesFeishuName;
      }
      
      const { data, error } = await client
        .from('merchant_sales_mappings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (!error && data) {
        return transformRow(data);
      }
      throw error;
    } catch (err) {
      console.error('Supabase 更新失败，使用 fallback:', err);
    }
  }
  
  // Fallback: 使用本地存储
  console.log('使用本地 fallback 存储更新数据');
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
  console.log('数据已更新到本地 fallback 存储');
  return fallbackData[index];
}

// 删除商户-销售映射关系
export async function deleteMerchantSalesMapping(id: string): Promise<void> {
  const supabaseAvailable = await isSupabaseAvailable();
  
  if (supabaseAvailable) {
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('merchant_sales_mappings')
        .delete()
        .eq('id', id);
      
      if (!error) {
        return;
      }
      throw error;
    } catch (err) {
      console.error('Supabase 删除失败，使用 fallback:', err);
    }
  }
  
  // Fallback: 使用本地存储
  console.log('使用本地 fallback 存储删除数据');
  await loadFromFallbackFile();
  const index = fallbackData.findIndex(m => m.id === id);
  if (index !== -1) {
    fallbackData.splice(index, 1);
    await saveToFallbackFile();
    console.log('数据已从本地 fallback 存储删除');
  }
}

// 批量导入商户-销售映射关系
export async function batchImportMerchantSalesMappings(
  mappings: Array<{ merchantId: string; salesFeishuName: string }>,
  mode: 'append' | 'replace' = 'append'
): Promise<{ inserted: number; updated: number }> {
  const supabaseAvailable = await isSupabaseAvailable();
  
  if (supabaseAvailable) {
    try {
      const client = getSupabaseClient();
      let inserted = 0;
      let updated = 0;
      const now = new Date().toISOString();

      if (mode === 'replace') {
        // 替换模式：先删除所有现有数据
        const { error: deleteError } = await client
          .from('merchant_sales_mappings')
          .delete()
          .neq('id', '');
        
        if (deleteError) {
          console.error('清空商户-销售映射关系失败:', deleteError);
        }
      }

      // 分批处理，每批 100 条
      const BATCH_SIZE = 100;
      for (let i = 0; i < mappings.length; i += BATCH_SIZE) {
        const batch = mappings.slice(i, i + BATCH_SIZE);
        
        if (mode === 'append') {
          // 追加模式：需要检查是否已存在，然后更新或插入
          for (const mapping of batch) {
            // 检查是否已存在
            const { data: existing } = await client
              .from('merchant_sales_mappings')
              .select('*')
              .eq('merchant_id', mapping.merchantId)
              .maybeSingle();
            
            if (existing) {
              // 更新已有数据
              const { error } = await client
                .from('merchant_sales_mappings')
                .update({
                  sales_feishu_name: mapping.salesFeishuName,
                  updated_at: now,
                })
                .eq('merchant_id', mapping.merchantId);
              
              if (!error) updated++;
            } else {
              // 插入新数据
              const { error } = await client
                .from('merchant_sales_mappings')
                .insert({
                  merchant_id: mapping.merchantId,
                  sales_feishu_name: mapping.salesFeishuName,
                  created_at: now,
                  updated_at: now,
                });
              
              if (!error) inserted++;
            }
          }
        } else {
          // 替换模式：直接插入
          const insertData = batch.map(mapping => ({
            merchant_id: mapping.merchantId,
            sales_feishu_name: mapping.salesFeishuName,
            created_at: now,
            updated_at: now,
          }));
          
          const { error } = await client
            .from('merchant_sales_mappings')
            .insert(insertData);
          
          if (!error) {
            inserted += batch.length;
          }
        }
      }

      return { inserted, updated };
    } catch (err) {
      console.error('Supabase 批量导入失败，使用 fallback:', err);
    }
  }
  
  // Fallback: 使用本地存储
  console.log('使用本地 fallback 存储批量导入数据');
  await loadFromFallbackFile();
  let inserted = 0;
  let updated = 0;
  const now = new Date();

  if (mode === 'replace') {
    // 替换模式：先删除所有现有数据
    fallbackData = [];
    fallbackNextId = 1;
  }

  for (const mapping of mappings) {
    const existingIndex = fallbackData.findIndex(m => m.merchantId === mapping.merchantId);
    
    if (existingIndex !== -1 && mode === 'append') {
      // 追加模式：更新已有数据
      fallbackData[existingIndex] = {
        ...fallbackData[existingIndex],
        salesFeishuName: mapping.salesFeishuName,
        updatedAt: now,
      };
      updated++;
    } else {
      // 插入新数据
      const newMapping: MerchantSalesMapping = {
        id: generateFallbackId(),
        merchantId: mapping.merchantId,
        salesFeishuName: mapping.salesFeishuName,
        createdAt: now,
        updatedAt: now,
      };
      fallbackData.push(newMapping);
      inserted++;
    }
  }

  await saveToFallbackFile();
  console.log(`批量导入完成: 插入 ${inserted} 条, 更新 ${updated} 条`);
  return { inserted, updated };
}

// 清空所有商户-销售映射关系
export async function clearAllMerchantSalesMappings(): Promise<void> {
  const supabaseAvailable = await isSupabaseAvailable();
  
  if (supabaseAvailable) {
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('merchant_sales_mappings')
        .delete()
        .neq('id', '');
      
      if (!error) {
        return;
      }
      throw error;
    } catch (err) {
      console.error('Supabase 清空失败，使用 fallback:', err);
    }
  }
  
  // Fallback: 使用本地存储
  console.log('使用本地 fallback 存储清空所有数据');
  await loadFromFallbackFile();
  fallbackData = [];
  fallbackNextId = 1;
  await saveToFallbackFile();
  console.log('所有数据已从本地 fallback 存储清空');
}
