import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 从环境变量获取 Supabase 配置
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

/**
 * 检查 Supabase 是否正确配置
 */
export function isSupabaseConfigured(): boolean {
  // 必须同时配置 URL 和 KEY，且不能是默认值
  const hasValidUrl = Boolean(SUPABASE_URL && 
    SUPABASE_URL !== 'https://example.supabase.co' && 
    SUPABASE_URL.startsWith('https://'));
  const hasValidKey = Boolean(SUPABASE_ANON_KEY && 
    SUPABASE_ANON_KEY !== 'your-anon-key' && 
    SUPABASE_ANON_KEY.length > 20);
  
  return hasValidUrl && hasValidKey;
}

/**
 * 创建 Supabase 客户端（仅当配置正确时）
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    console.warn('⚠️ Supabase 环境变量未正确配置 (SUPABASE_URL/SUPABASE_ANON_KEY)，将使用本地存储');
    return null;
  }

  // 创建客户端
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return client;
}
