import { CozeApiConfig } from '@/types/coze-api';
import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.join('/tmp', 'coze-api-config.json');

// 默认配置
const defaultConfig: CozeApiConfig = {
  id: 'default',
  apiKey: '',
  botId: '',
  webhookUrl: '',
  isEnabled: false,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

function ensureFileExists() {
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
  }
}

export const cozeApiStorage = {
  // 获取配置
  getConfig(): CozeApiConfig {
    ensureFileExists();
    try {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data) || defaultConfig;
    } catch (error) {
      return defaultConfig;
    }
  },

  // 保存配置
  saveConfig(config: Partial<CozeApiConfig>): CozeApiConfig {
    ensureFileExists();
    const currentConfig = this.getConfig();
    const newConfig: CozeApiConfig = {
      ...currentConfig,
      ...config,
      id: 'default',
      updatedAt: Date.now()
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
    return newConfig;
  }
};
