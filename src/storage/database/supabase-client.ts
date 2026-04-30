import { createClient } from '@supabase/supabase-js';

// 从环境变量获取 Supabase 配置
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

/**
 * 创建 Supabase 客户端
 * 注意：这是一个共享客户端，所有需要 Supabase 操作的地方都可以使用
 */
export function getSupabaseClient() {
  // 检查环境变量是否配置
  if (SUPABASE_URL === 'https://example.supabase.co' || SUPABASE_ANON_KEY === 'your-anon-key') {
    console.warn('⚠️ Supabase 环境变量未配置，将使用 Supabase 存储');
  }

  // 创建客户端
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('✅ Supabase 客户端已创建');

  return client;
}

// 导出单例客户端
export const supabase = getSupabaseClient();
