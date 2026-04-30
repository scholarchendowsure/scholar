import fs from 'fs';
import path from 'path';

// 飞书同事类型
export interface FeishuColleague {
  id: string;
  name: string;
  feishuUserId: string;
  email?: string;
  createdAt: number;
}

// 飞书配置类型
export interface FeishuConfig {
  webhookUrl: string;
  sendMode: 'webhook' | 'private';
  appId?: string;
  appSecret?: string;
  feishuAccessToken?: string;
  feishuRefreshToken?: string;
  feishuTokenExpiresAt?: number;
  colleagues: FeishuColleague[];
}

const DEFAULT_CONFIG: FeishuConfig = {
  webhookUrl: '',
  sendMode: 'webhook',
  colleagues: [],
};

// 根据环境决定文件存储位置
const getStorageFilePath = (): string => {
  const isProd = process.env.COZE_PROJECT_ENV === 'PROD';
  if (isProd) {
    return '/tmp/feishu-config.json';
  }
  // 开发环境：保存在项目根目录
  return path.join(process.cwd(), 'feishu-config.json');
};

// 从文件加载配置
let cachedConfig: FeishuConfig | null = null;

const loadConfigFromFile = (): FeishuConfig => {
  const filePath = getStorageFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const config = JSON.parse(content);
      console.log('✅ 从文件加载飞书配置成功');
      return config;
    }
  } catch (error) {
    console.error('❌ 从文件加载飞书配置失败:', error);
  }
  return { ...DEFAULT_CONFIG };
};

// 保存配置到文件
const saveConfigToFile = (config: FeishuConfig) => {
  const filePath = getStorageFilePath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
    cachedConfig = config;
    console.log('✅ 飞书配置已保存到文件');
  } catch (error) {
    console.error('❌ 保存飞书配置到文件失败:', error);
  }
};

// 获取飞书配置
export async function getFeishuConfig(): Promise<FeishuConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  const config = loadConfigFromFile();
  cachedConfig = config;
  return config;
}

// 保存飞书配置
export async function saveFeishuConfig(config: FeishuConfig): Promise<void> {
  saveConfigToFile(config);
}

// 添加同事
export async function addFeishuColleague(colleague: Omit<FeishuColleague, 'id' | 'createdAt'>): Promise<FeishuColleague> {
  const config = await getFeishuConfig();
  const newColleague: FeishuColleague = {
    ...colleague,
    id: Date.now().toString(),
    createdAt: Date.now(),
  };
  config.colleagues = [...(config.colleagues || []), newColleague];
  await saveFeishuConfig(config);
  return newColleague;
}

// 删除同事
export async function removeFeishuColleague(colleagueId: string): Promise<void> {
  const config = await getFeishuConfig();
  config.colleagues = (config.colleagues || []).filter(c => c.id !== colleagueId);
  await saveFeishuConfig(config);
}
