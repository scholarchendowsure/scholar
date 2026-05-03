import fs from 'fs';
import path from 'path';
import { encryptAppSecret, decryptAppSecret, FeishuUser as ApiFeishuUser } from '@/lib/feishu-api';

// 飞书配置类型
export interface FeishuConfig {
  webhookUrl?: string;
  appId?: string;
  appSecretEncrypted?: string;
  sendMode: 'webhook' | 'private';
}

// 飞书用户类型
export interface FeishuUser {
  id: string;
  unionId: string;
  userId: string;
  name: string;
  enName?: string;
  email?: string;
  mobile?: string;
  avatarUrl?: string;
  status: 'active' | 'inactive';
  syncedAt: number;
  createdAt: number;
  updatedAt: number;
}

// 商户-销售-飞书用户映射
export interface MerchantSalesFeishuMapping {
  id: string;
  merchantId: string;
  salesName: string;
  feishuUserId?: string;
  feishuUserName?: string;
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_CONFIG: FeishuConfig = {
  sendMode: 'private',
  webhookUrl: '',
};

// 根据环境决定文件存储位置
const getConfigFilePath = (): string => {
  return path.join(process.cwd(), 'public', 'data', 'feishu-config.json');
};

const getUsersFilePath = (): string => {
  return path.join(process.cwd(), 'public', 'data', 'feishu-users.json');
};

const getMappingsFilePath = (): string => {
  return path.join(process.cwd(), 'public', 'data', 'feishu-mappings.json');
};

// 从文件加载配置
let cachedConfig: FeishuConfig | null = null;
let cachedUsers: FeishuUser[] | null = null;
let cachedMappings: MerchantSalesFeishuMapping[] | null = null;

const loadFromFile = <T>(filePath: string, defaultValue: T): T => {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`❌ 从文件加载失败: ${filePath}`, error);
  }
  return defaultValue;
};

const saveToFile = (filePath: string, data: any) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✅ 数据已保存到文件: ${filePath}`);
  } catch (error) {
    console.error(`❌ 保存到文件失败: ${filePath}`, error);
  }
};

// ==================== 飞书配置管理 ====================

export async function getFeishuConfig(): Promise<FeishuConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  const config = loadFromFile<FeishuConfig>(getConfigFilePath(), DEFAULT_CONFIG);
  cachedConfig = config;
  return config;
}

export async function saveFeishuConfig(config: FeishuConfig): Promise<void> {
  saveToFile(getConfigFilePath(), config);
  cachedConfig = config;
}

export async function updateFeishuAppCredentials(
  appId: string, 
  appSecret: string
): Promise<void> {
  const config = await getFeishuConfig();
  const updatedConfig: FeishuConfig = {
    ...config,
    appId,
    appSecretEncrypted: encryptAppSecret(appSecret),
    sendMode: 'private',
  };
  await saveFeishuConfig(updatedConfig);
}

export async function getFeishuAppCredentials(): Promise<{ appId?: string; appSecret?: string }> {
  const config = await getFeishuConfig();
  return {
    appId: config.appId,
    appSecret: config.appSecretEncrypted ? decryptAppSecret(config.appSecretEncrypted) : undefined,
  };
}

// ==================== 飞书用户管理 ====================

export async function getFeishuUsers(): Promise<FeishuUser[]> {
  if (cachedUsers) {
    return cachedUsers;
  }
  
  const users = loadFromFile<FeishuUser[]>(getUsersFilePath(), []);
  cachedUsers = users;
  return users;
}

export async function saveFeishuUsers(users: FeishuUser[]): Promise<void> {
  saveToFile(getUsersFilePath(), users);
  cachedUsers = users;
}

export async function syncFeishuUsers(apiUsers: ApiFeishuUser[]): Promise<FeishuUser[]> {
  const existingUsers = await getFeishuUsers();
  const existingUserMap = new Map(existingUsers.map(u => [u.unionId, u]));
  
  const now = Date.now();
  const syncedUsers: FeishuUser[] = apiUsers.map(apiUser => {
    const existing = existingUserMap.get(apiUser.unionId);
    return {
      id: existing?.id || apiUser.unionId,
      unionId: apiUser.unionId,
      userId: apiUser.userId,
      name: apiUser.name,
      enName: apiUser.enName,
      email: apiUser.email,
      mobile: apiUser.mobile,
      avatarUrl: apiUser.avatarUrl,
      status: apiUser.status,
      syncedAt: now,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
  });
  
  await saveFeishuUsers(syncedUsers);
  return syncedUsers;
}

export async function getFeishuUserById(id: string): Promise<FeishuUser | undefined> {
  const users = await getFeishuUsers();
  return users.find(u => u.id === id || u.userId === id || u.unionId === id);
}

// ==================== 商户-销售-飞书用户映射管理 ====================

export async function getMerchantSalesFeishuMappings(): Promise<MerchantSalesFeishuMapping[]> {
  if (cachedMappings) {
    return cachedMappings;
  }
  
  const mappings = loadFromFile<MerchantSalesFeishuMapping[]>(getMappingsFilePath(), []);
  cachedMappings = mappings;
  return mappings;
}

export async function saveMerchantSalesFeishuMappings(mappings: MerchantSalesFeishuMapping[]): Promise<void> {
  saveToFile(getMappingsFilePath(), mappings);
  cachedMappings = mappings;
}

export async function createMerchantSalesFeishuMapping(
  mapping: Omit<MerchantSalesFeishuMapping, 'id' | 'createdAt' | 'updatedAt'>
): Promise<MerchantSalesFeishuMapping> {
  const mappings = await getMerchantSalesFeishuMappings();
  const now = Date.now();
  const newMapping: MerchantSalesFeishuMapping = {
    ...mapping,
    id: Date.now().toString(),
    createdAt: now,
    updatedAt: now,
  };
  
  // 替换相同商户ID的映射
  const filteredMappings = mappings.filter(m => m.merchantId !== mapping.merchantId);
  await saveMerchantSalesFeishuMappings([...filteredMappings, newMapping]);
  
  return newMapping;
}

export async function updateMerchantSalesFeishuMapping(
  id: string,
  updates: Partial<Omit<MerchantSalesFeishuMapping, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<MerchantSalesFeishuMapping | null> {
  const mappings = await getMerchantSalesFeishuMappings();
  const index = mappings.findIndex(m => m.id === id);
  
  if (index === -1) {
    return null;
  }
  
  const updatedMapping: MerchantSalesFeishuMapping = {
    ...mappings[index],
    ...updates,
    updatedAt: Date.now(),
  };
  
  mappings[index] = updatedMapping;
  await saveMerchantSalesFeishuMappings(mappings);
  
  return updatedMapping;
}

export async function getMappingByMerchantId(merchantId: string): Promise<MerchantSalesFeishuMapping | undefined> {
  const mappings = await getMerchantSalesFeishuMappings();
  return mappings.find(m => m.merchantId === merchantId);
}

export async function deleteMerchantSalesFeishuMapping(id: string): Promise<boolean> {
  const mappings = await getMerchantSalesFeishuMappings();
  const filtered = mappings.filter(m => m.id !== id);
  
  if (filtered.length === mappings.length) {
    return false;
  }
  
  await saveMerchantSalesFeishuMappings(filtered);
  return true;
}
