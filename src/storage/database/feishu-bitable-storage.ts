import { FeishuBitableConfig, BitableSyncRecord } from '@/types/feishu-bitable';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join('/tmp', 'feishu-bitable-configs-v2.json');
const SYNC_RECORDS_FILE = path.join('/tmp', 'feishu-bitable-sync-records-v2.json');

function ensureFilesExist() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(SYNC_RECORDS_FILE)) {
    fs.writeFileSync(SYNC_RECORDS_FILE, JSON.stringify([], null, 2));
  }
}

export const bitableConfigStorage = {
  findAll(): FeishuBitableConfig[] {
    ensureFilesExist();
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  },

  findById(id: string): FeishuBitableConfig | undefined {
    const configs = this.findAll();
    return configs.find(c => c.id === id);
  },

  findByAppId(appId: string): FeishuBitableConfig | undefined {
    const configs = this.findAll();
    return configs.find(c => c.appId === appId);
  },

  create(config: Omit<FeishuBitableConfig, 'id' | 'createdAt' | 'updatedAt' | 'syncCount'>): FeishuBitableConfig {
    const configs = this.findAll();
    const newConfig: FeishuBitableConfig = {
      ...config,
      id: crypto.randomUUID(),
      syncCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    configs.push(newConfig);
    fs.writeFileSync(DATA_FILE, JSON.stringify(configs, null, 2));
    return newConfig;
  },

  update(id: string, updateData: Partial<FeishuBitableConfig>): FeishuBitableConfig | null {
    const configs = this.findAll();
    const index = configs.findIndex(c => c.id === id);
    if (index === -1) return null;

    configs[index] = {
      ...configs[index],
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(configs, null, 2));
    return configs[index];
  },

  delete(id: string): boolean {
    const configs = this.findAll();
    const index = configs.findIndex(c => c.id === id);
    if (index === -1) return false;

    configs.splice(index, 1);
    fs.writeFileSync(DATA_FILE, JSON.stringify(configs, null, 2));
    return true;
  },

  incrementSyncCount(id: string): FeishuBitableConfig | null {
    const config = this.findById(id);
    if (!config) return null;

    return this.update(id, {
      syncCount: (config.syncCount || 0) + 1,
      lastSyncTime: new Date().toISOString(),
    });
  },
};

export const bitableSyncRecordStorage = {
  findAll(): BitableSyncRecord[] {
    ensureFilesExist();
    const data = fs.readFileSync(SYNC_RECORDS_FILE, 'utf-8');
    return JSON.parse(data);
  },

  findByConfigId(configId: string, limit: number = 50): BitableSyncRecord[] {
    const records = this.findAll();
    return records
      .filter(r => r.configId === configId)
      .sort((a, b) => new Date(b.syncTime).getTime() - new Date(a.syncTime).getTime())
      .slice(0, limit);
  },

  create(record: Omit<BitableSyncRecord, 'id'>): BitableSyncRecord {
    const records = this.findAll();
    const newRecord: BitableSyncRecord = {
      ...record,
      id: crypto.randomUUID(),
    };
    records.push(newRecord);
    fs.writeFileSync(SYNC_RECORDS_FILE, JSON.stringify(records, null, 2));
    return newRecord;
  },

  update(id: string, updateData: Partial<BitableSyncRecord>): BitableSyncRecord | null {
    const records = this.findAll();
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return null;

    records[index] = {
      ...records[index],
      ...updateData,
    };
    fs.writeFileSync(SYNC_RECORDS_FILE, JSON.stringify(records, null, 2));
    return records[index];
  },
};
