import { FeishuOAuthToken, FeishuOAuthTokenData } from '@/types/feishu-oauth';
import { promises as fs } from 'fs';
import path from 'path';

// 数据存储目录 - 迁移到public/data目录
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const OAUTH_TOKEN_FILE = path.join(DATA_DIR, 'feishu-oauth-token.json');

// 确保目录存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

export class FeishuOAuthStorage {
  async getToken(): Promise<FeishuOAuthToken | null> {
    try {
      await ensureDataDir();
      const data = await fs.readFile(OAUTH_TOKEN_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.log('读取OAuth token失败:', error);
      return null;
    }
  }

  async saveToken(token: FeishuOAuthToken | FeishuOAuthTokenData): Promise<void> {
    await ensureDataDir();
    await fs.writeFile(OAUTH_TOKEN_FILE, JSON.stringify(token, null, 2), 'utf-8');
  }

  async deleteToken(): Promise<void> {
    try {
      await fs.unlink(OAUTH_TOKEN_FILE);
    } catch (error) {
      console.log('删除OAuth token失败:', error);
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
let storageInstance: FeishuOAuthStorage | null = null;

export async function getFeishuOAuthStorage(): Promise<FeishuOAuthStorage> {
  if (!storageInstance) {
    storageInstance = new FeishuOAuthStorage();
  }
  return storageInstance;
}

// 兼容旧代码的导出
export async function saveOAuthToken(token: any): Promise<void> {
  const storage = await getFeishuOAuthStorage();
  await storage.saveToken({
    accessToken: token.access_token || token.accessToken,
    tokenType: token.token_type || token.tokenType || 'Bearer',
    expiresAt: token.expires_at || token.expiresAt || Date.now() + 7200000,
    refreshToken: token.refresh_token || token.refreshToken,
    refreshTokenExpiresAt: token.refreshTokenExpiresAt,
    userId: token.user_id || token.userId,
    userName: token.user_name || token.userName,
    userEmail: token.user_email || token.userEmail,
    userAvatar: token.user_avatar || token.userAvatar,
    createdAt: Date.now(),
  });
}
