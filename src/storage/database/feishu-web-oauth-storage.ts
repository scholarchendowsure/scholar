import { FeishuWebOAuthToken, FeishuWebOAuthTokenData } from '@/types/feishu-web-oauth';
import { promises as fs } from 'fs';
import path from 'path';

// 数据存储目录 - 迁移到public/data目录
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const OAUTH_TOKEN_FILE = path.join(DATA_DIR, 'feishu-web-oauth-token.json');

// 确保目录存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

export class FeishuWebOAuthStorage {
  async getToken(): Promise<FeishuWebOAuthToken | null> {
    try {
      await ensureDataDir();
      const data = await fs.readFile(OAUTH_TOKEN_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.log('读取飞书网页应用OAuth token失败:', error);
      return null;
    }
  }

  async saveToken(token: FeishuWebOAuthToken | FeishuWebOAuthTokenData): Promise<void> {
    await ensureDataDir();
    await fs.writeFile(OAUTH_TOKEN_FILE, JSON.stringify(token, null, 2), 'utf-8');
  }

  async deleteToken(): Promise<void> {
    try {
      await fs.unlink(OAUTH_TOKEN_FILE);
    } catch (error) {
      console.log('删除飞书网页应用OAuth token失败:', error);
    }
  }

  async isTokenValid(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;
    return token.expiresAt > Date.now();
  }

  async isTokenExpiring(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return true;
    // 检查是否在1小时内过期
    const oneHour = 3600000;
    return token.expiresAt < Date.now() + oneHour;
  }

  async shouldRefreshToken(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return true;
    // 检查是否在2小时内过期
    const twoHours = 7200000;
    return token.expiresAt < Date.now() + twoHours;
  }
}

// 单例实例
let storageInstance: FeishuWebOAuthStorage | null = null;

export async function getFeishuWebOAuthStorage(): Promise<FeishuWebOAuthStorage> {
  if (!storageInstance) {
    storageInstance = new FeishuWebOAuthStorage();
  }
  return storageInstance;
}
