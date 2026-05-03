import { FeishuPersonalPermanentConfig, DEFAULT_PERMANENT_CONFIG } from '../../types/feishu-personal-permanent';
import fs from 'fs';
import path from 'path';

const PERMANENT_CONFIG_FILE = path.join(process.cwd(), 'public', 'data', 'feishu-personal-permanent.json');

export class FeishuPersonalPermanentStorage {
  private static instance: FeishuPersonalPermanentStorage;

  private constructor() {
    // 确保目录存在
    const dir = path.dirname(PERMANENT_CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  static getInstance(): FeishuPersonalPermanentStorage {
    if (!FeishuPersonalPermanentStorage.instance) {
      FeishuPersonalPermanentStorage.instance = new FeishuPersonalPermanentStorage();
    }
    return FeishuPersonalPermanentStorage.instance;
  }

  /**
   * 获取永久配置
   */
  async get(): Promise<FeishuPersonalPermanentConfig | null> {
    try {
      if (fs.existsSync(PERMANENT_CONFIG_FILE)) {
        const content = fs.readFileSync(PERMANENT_CONFIG_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('读取永久配置失败:', error);
    }
    return null;
  }

  /**
   * 保存永久配置
   */
  async save(config: Partial<FeishuPersonalPermanentConfig>): Promise<FeishuPersonalPermanentConfig> {
    const existing = await this.get();
    const now = Date.now();
    
    const newConfig: FeishuPersonalPermanentConfig = {
      id: existing?.id || `perm_${now}`,
      isPermanent: true,
      larkCliConfigPath: config.larkCliConfigPath || existing?.larkCliConfigPath || '/root/.lark-cli',
      currentUser: config.currentUser || existing?.currentUser || {
        userOpenId: '',
        userName: ''
      },
      appConfig: config.appConfig || existing?.appConfig || {
        appId: '',
        brand: 'feishu',
        lang: 'zh'
      },
      authStatus: config.authStatus || existing?.authStatus || {
        tokenStatus: 'valid',
        lastAuthTime: now
      },
      enabled: config.enabled !== undefined ? config.enabled : (existing?.enabled !== undefined ? existing.enabled : true),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    fs.writeFileSync(PERMANENT_CONFIG_FILE, JSON.stringify(newConfig, null, 2));
    return newConfig;
  }

  /**
   * 从当前 lark-cli 状态初始化永久配置
   */
  async initializeFromCurrentState(): Promise<FeishuPersonalPermanentConfig> {
    const configPath = '/root/.lark-cli/config.json';
    let currentConfig: any = null;
    
    try {
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        currentConfig = JSON.parse(configContent);
      }
    } catch (error) {
      console.warn('读取 lark-cli 配置失败:', error);
    }

    const appConfig = currentConfig?.apps?.[0] || {};
    const userConfig = appConfig?.users?.[0] || {};

    const permanentConfig = await this.save({
      larkCliConfigPath: '/root/.lark-cli',
      currentUser: {
        userOpenId: userConfig?.userOpenId || 'ou_f8bf0f553338438d89338033cc255a5e',
        userName: userConfig?.userName || '高乐 | Scholar',
      },
      appConfig: {
        appId: appConfig?.appId || 'cli_a9652497d7389bd6',
        brand: (appConfig?.brand as 'feishu' | 'lark') || 'feishu',
        lang: appConfig?.lang || 'zh',
      },
      authStatus: {
        tokenStatus: 'valid',
        lastAuthTime: Date.now(),
      },
      enabled: true,
    });

    return permanentConfig;
  }
}