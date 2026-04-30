import { getSupabaseClient } from './supabase-client';

// 商户-销售人员映射关系类型
export interface MerchantSalesMapping {
  id: string;
  merchantId: string;
  salesFeishuName: string;
  createdAt: string;
  updatedAt?: string;
}

// 初始化 Supabase 客户端
function getClient() {
  return getSupabaseClient();
}

// 将数据库行转换为 MerchantSalesMapping 类型
function transformRow(row: Record<string, unknown>): MerchantSalesMapping {
  return {
    id: String(row.id || ''),
    merchantId: String(row.merchant_id || ''),
    salesFeishuName: String(row.sales_feishu_name || ''),
    createdAt: String(row.created_at || ''),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

// 获取所有商户-销售人员映射关系
export async function getAllMerchantSalesMappings(): Promise<MerchantSalesMapping[]> {
  try {
    const client = getClient();
    const allMappings: MerchantSalesMapping[] = [];
    const BATCH_SIZE = 1000;

    while (true) {
      const { data, error } = await client
        .from('merchant_sales_mappings')
        .select('*')
        .order('merchant_id')
        .range(allMappings.length, allMappings.length + BATCH_SIZE - 1);

      if (error) {
        console.error('获取商户-销售映射关系失败:', error);
        throw new Error(`获取商户-销售映射关系失败: ${error.message}`);
      }

      if (!data || data.length === 0) break;
      allMappings.push(...data.map(transformRow));

      if (data.length < BATCH_SIZE) break;
    }

    return allMappings;
  } catch (err) {
    console.error('获取商户-销售映射关系失败:', err);
    return [];
  }
}

// 根据商户ID获取对应的销售飞书名称
export async function getSalesFeishuNameByMerchantId(merchantId: string): Promise<string | null> {
  try {
    const client = getClient();
    const { data, error } = await client
      .from('merchant_sales_mappings')
      .select('sales_feishu_name')
      .eq('merchant_id', merchantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('获取销售飞书名称失败:', error);
      throw new Error(`获取销售飞书名称失败: ${error.message}`);
    }

    return data?.sales_feishu_name ? String(data.sales_feishu_name) : null;
  } catch (err) {
    console.error('获取销售飞书名称失败:', err);
    return null;
  }
}

// 批量保存商户-销售人员映射关系
export async function saveMerchantSalesMappings(
  mappings: Array<{ merchantId: string; salesFeishuName: string }>,
  mode: 'replace' | 'merge' = 'replace'
): Promise<void> {
  const client = getClient();

  if (mode === 'replace') {
    // 覆盖模式：删除所有旧数据
    const { error: deleteError } = await client
      .from('merchant_sales_mappings')
      .delete()
      .neq('id', 0);

    if (deleteError) {
      console.error('删除旧映射关系失败:', deleteError);
      // 不抛出错误，继续插入
    }
  }

  // 转换数据格式
  const dbMappings = mappings.map(mapping => ({
    merchant_id: mapping.merchantId,
    sales_feishu_name: mapping.salesFeishuName,
  }));

  // 分批插入数据（每次最多 500 条）
  const BATCH_SIZE = 500;
  for (let i = 0; i < dbMappings.length; i += BATCH_SIZE) {
    const batch = dbMappings.slice(i, i + BATCH_SIZE);
    console.log(`插入第 ${Math.floor(i / BATCH_SIZE) + 1} 批映射关系，共 ${batch.length} 条`);
    const { error } = await client
      .from('merchant_sales_mappings')
      .upsert(batch, { onConflict: 'merchant_id' });

    if (error) {
      console.error('保存商户-销售映射关系失败:', error);
      throw new Error(`保存商户-销售映射关系失败: ${error.message}`);
    }
  }
}

// 更新单个商户-销售人员映射关系
export async function updateMerchantSalesMapping(
  id: string,
  merchantId: string,
  salesFeishuName: string
): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from('merchant_sales_mappings')
    .update({
      merchant_id: merchantId,
      sales_feishu_name: salesFeishuName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('更新商户-销售映射关系失败:', error);
    throw new Error(`更新商户-销售映射关系失败: ${error.message}`);
  }
}

// 删除单个商户-销售人员映射关系
export async function deleteMerchantSalesMapping(id: string): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from('merchant_sales_mappings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除商户-销售映射关系失败:', error);
    throw new Error(`删除商户-销售映射关系失败: ${error.message}`);
  }
}

// 批量删除商户-销售人员映射关系
export async function deleteMerchantSalesMappings(ids: string[]): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from('merchant_sales_mappings')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('批量删除商户-销售映射关系失败:', error);
    throw new Error(`批量删除商户-销售映射关系失败: ${error.message}`);
  }
}
