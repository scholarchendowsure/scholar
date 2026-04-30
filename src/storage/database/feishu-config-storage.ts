import { getSupabaseClient } from './supabase-client';
import * as fs from 'fs';
import * as path from 'path';

export interface FeishuConfig {
  id?: number;
  webhookUrl: string;
  createdAt?: string;
  updatedAt?: string;
}

const CONFIG_FILE_PATH = path.join(
  process.env.COZE_WORKSPACE_PATH || '/workspace/projects',
  'feishu-config.json'
);

const PROD_CONFIG_FILE_PATH = '/tmp/feishu-config.json';

const getConfigFilePath = (): string => {
  return process.env.COZE_PROJECT_ENV === 'PROD' ? PROD_CONFIG_FILE_PATH : CONFIG_FILE_PATH;
};

let cachedConfig: FeishuConfig | null = null;
let configLoaded = false;

const loadConfigFromFile = (): FeishuConfig | null => {
  try {
    const filePath = getConfigFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const config = JSON.parse(content);
      cachedConfig = config;
      configLoaded = true;
      console.log('从文件加载飞书配置:', config);
      return config;
    }
  } catch (error) {
    console.error('从文件加载飞书配置失败:', error);
  }
  configLoaded = true;
  return null;
};

const saveConfigToFile = (config: FeishuConfig) => {
  try {
    const filePath = getConfigFilePath();
    const configToSave = {
      ...config,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(filePath, JSON.stringify(configToSave, null, 2));
    cachedConfig = configToSave;
    console.log('飞书配置已保存到文件:', configToSave);
  } catch (error) {
    console.error('保存飞书配置到文件失败:', error);
  }
};

// 获取飞书配置
export async function getFeishuConfig(): Promise<FeishuConfig | null> {
  // 先尝试从 Supabase 获取
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('feishu_configs')
      .select('*')
      .order('id', { ascending: false })
      .limit(1);
    
    if (!error && data && data.length > 0) {
      console.log('从 Supabase 获取飞书配置成功');
      return data[0] as FeishuConfig;
    }
  } catch (error) {
    console.error('从 Supabase 获取飞书配置失败，使用本地文件:', error);
  }

  // Supabase 不可用时，从本地文件加载
  if (!configLoaded) {
    loadConfigFromFile();
  }
  
  return cachedConfig;
}

// 保存飞书配置
export async function saveFeishuConfig(config: FeishuConfig): Promise<FeishuConfig> {
  // 先尝试保存到 Supabase
  try {
    const client = getSupabaseClient();
    const existingConfig = await getFeishuConfig();
    
    if (existingConfig && existingConfig.id) {
      // 更新现有配置
      const { data, error } = await client
        .from('feishu_configs')
        .update({
          webhook_url: config.webhookUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConfig.id)
        .select();
      
      if (!error && data) {
        console.log('飞书配置已更新到 Supabase');
        saveConfigToFile(data[0] as FeishuConfig);
        return data[0] as FeishuConfig;
      }
    } else {
      // 创建新配置
      const { data, error } = await client
        .from('feishu_configs')
        .insert({
          webhook_url: config.webhookUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();
      
      if (!error && data) {
        console.log('飞书配置已保存到 Supabase');
        saveConfigToFile(data[0] as FeishuConfig);
        return data[0] as FeishuConfig;
      }
    }
  } catch (error) {
    console.error('保存飞书配置到 Supabase 失败，使用本地文件:', error);
  }

  // Supabase 不可用时，保存到本地文件
  const configToSave = {
    ...config,
    id: cachedConfig?.id || 1,
    createdAt: cachedConfig?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveConfigToFile(configToSave);
  return configToSave;
}
