import { FollowupWebhookRecord } from '@/types/followup-webhook';
import * as fs from 'fs';
import * as path from 'path';

const STORAGE_FILE = path.join(process.cwd(), 'public', 'data', 'followup-webhook-records.json');

class FollowupWebhookStorage {
  private records: FollowupWebhookRecord[] = [];

  constructor() {
    this.loadFromFile();
  }

  private loadFromFile() {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
        this.records = JSON.parse(data);
      }
    } catch (error) {
      console.error('加载跟进记录webhook记录失败:', error);
      this.records = [];
    }
  }

  private saveToFile() {
    try {
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(this.records, null, 2));
    } catch (error) {
      console.error('保存跟进记录webhook记录失败:', error);
    }
  }

  addRecord(payload: any, processResult?: any): FollowupWebhookRecord {
    const record: FollowupWebhookRecord = {
      id: Date.now().toString(),
      receivedAt: new Date().toISOString(),
      payload,
      processResult
    };
    
    // 最多保存100条记录，超过则删除最早的
    if (this.records.length >= 100) {
      this.records.shift();
    }
    
    this.records.unshift(record);
    this.saveToFile();
    return record;
  }

  updateRecordProcessResult(id: string, processResult: any): void {
    const record = this.records.find(r => r.id === id);
    if (record) {
      record.processResult = processResult;
      record.processed = true;
      record.processedAt = new Date().toISOString();
      this.saveToFile();
    }
  }

  getRecords(limit: number = 50): FollowupWebhookRecord[] {
    return this.records.slice(0, limit);
  }

  getRecord(id: string): FollowupWebhookRecord | undefined {
    return this.records.find(r => r.id === id);
  }

  clearRecords(): void {
    this.records = [];
    this.saveToFile();
  }

  markProcessed(id: string): void {
    const record = this.records.find(r => r.id === id);
    if (record) {
      record.processed = true;
      record.processedAt = new Date().toISOString();
      this.saveToFile();
    }
  }
}

export const followupWebhookStorage = new FollowupWebhookStorage();
