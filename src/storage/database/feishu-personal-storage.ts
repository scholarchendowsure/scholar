import { FeishuPersonalAccount, FeishuPersonalConfig, PersonalSendMode } from '@/types/feishu-personal';
import fs from 'fs';
import path from 'path';

const ACCOUNTS_FILE = path.join('/tmp', 'feishu-personal-accounts.json');
const CONFIG_FILE = path.join('/tmp', 'feishu-personal-config.json');

// 初始化默认配置
const defaultConfig: FeishuPersonalConfig = {
  id: 'default',
  sendMode: 'cli',
  cliPath: 'lark',
  createdAt: Date.now(),
  updatedAt: Date.now()
};

function ensureFilesExist() {
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
  }
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify([], null, 2));
  }
}

export const feishuPersonalStorage = {
  // 获取个人账号配置
  getConfig(): FeishuPersonalConfig {
    ensureFilesExist();
    try {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data) || defaultConfig;
    } catch (error) {
      return defaultConfig;
    }
  },

  // 保存个人账号配置
  saveConfig(config: Partial<FeishuPersonalConfig>): FeishuPersonalConfig {
    ensureFilesExist();
    const currentConfig = this.getConfig();
    const newConfig: FeishuPersonalConfig = {
      ...currentConfig,
      ...config,
      id: 'default',
      updatedAt: Date.now()
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
    return newConfig;
  },

  // 获取所有个人账号
  getAllAccounts(): FeishuPersonalAccount[] {
    ensureFilesExist();
    try {
      const data = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
      return JSON.parse(data) || [];
    } catch (error) {
      return [];
    }
  },

  // 获取系统用户的个人账号
  getByUserId(userId: string): FeishuPersonalAccount | null {
    const accounts = this.getAllAccounts();
    return accounts.find(acc => acc.userId === userId) || null;
  },

  // 获取飞书用户ID对应的账号
  getByFeishuUserId(feishuUserId: string): FeishuPersonalAccount | null {
    const accounts = this.getAllAccounts();
    return accounts.find(acc => acc.feishuUserId === feishuUserId) || null;
  },

  // 创建个人账号
  createAccount(data: Omit<FeishuPersonalAccount, 'id' | 'createdAt' | 'updatedAt'>): FeishuPersonalAccount {
    ensureFilesExist();
    const accounts = this.getAllAccounts();
    const newAccount: FeishuPersonalAccount = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    accounts.push(newAccount);
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
    return newAccount;
  },

  // 更新个人账号
  updateAccount(id: string, data: Partial<FeishuPersonalAccount>): FeishuPersonalAccount | null {
    ensureFilesExist();
    const accounts = this.getAllAccounts();
    const index = accounts.findIndex(acc => acc.id === id);
    if (index === -1) return null;
    
    accounts[index] = {
      ...accounts[index],
      ...data,
      updatedAt: Date.now()
    };
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
    return accounts[index];
  },

  // 删除个人账号
  deleteAccount(id: string): boolean {
    ensureFilesExist();
    const accounts = this.getAllAccounts();
    const filteredAccounts = accounts.filter(acc => acc.id !== id);
    if (filteredAccounts.length === accounts.length) return false;
    
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(filteredAccounts, null, 2));
    return true;
  },

  // 解绑个人账号
  unbindAccount(userId: string): boolean {
    const account = this.getByUserId(userId);
    if (!account) return false;
    
    return this.updateAccount(account.id, {
      isBound: false,
      feishuUserId: undefined,
      feishuName: undefined,
      accessToken: undefined,
      refreshToken: undefined,
      tokenExpiresAt: undefined
    }) !== null;
  }
};
