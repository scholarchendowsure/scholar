import { BitableCaseUpdateRecord } from '@/types/bitable-case-update';
import fs from 'fs';
import path from 'path';

const STORAGE_FILE = path.join(process.cwd(), 'public', 'data', 'bitable-case-update-records.json');

// 初始化存储文件
function initStorageFile() {
  const dir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STORAGE_FILE)) {
    fs.writeFileSync(STORAGE_FILE, '[]', 'utf-8');
  }
}

// 读取记录
export const bitableCaseUpdateStorage = {
  // 添加记录
  addRecord(payload: any, processResult?: BitableCaseUpdateRecord['processResult']): BitableCaseUpdateRecord {
    initStorageFile();
    
    const record: BitableCaseUpdateRecord = {
      id: crypto.randomUUID(),
      receivedAt: new Date().toISOString(),
      payload,
      processResult,
    };

    try {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      let records: BitableCaseUpdateRecord[] = [];
      try {
        records = JSON.parse(content);
      } catch (e) {
        records = [];
      }
      
      records.unshift(record);
      
      // 只保留最近100条记录
      if (records.length > 100) {
        records = records.slice(0, 100);
      }
      
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(records, null, 2), 'utf-8');
      return record;
    } catch (error) {
      console.error('保存多维案件更新记录失败:', error);
      return record;
    }
  },

  // 获取记录
  getRecords(limit: number = 20): BitableCaseUpdateRecord[] {
    initStorageFile();
    try {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const records: BitableCaseUpdateRecord[] = JSON.parse(content);
      return records.slice(0, limit);
    } catch (error) {
      console.error('读取多维案件更新记录失败:', error);
      return [];
    }
  },

  // 清空记录
  clearRecords() {
    initStorageFile();
    try {
      fs.writeFileSync(STORAGE_FILE, '[]', 'utf-8');
    } catch (error) {
      console.error('清空多维案件更新记录失败:', error);
    }
  },
};
