import { Case } from '@/types/case';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// 存储文件路径
const STORAGE_FILE = path.join('/tmp', 'cases-v2.json');

// 确保存储目录存在
function ensureStorageDir() {
  const dir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 从文件读取数据
function readFromFile(): Case[] {
  ensureStorageDir();
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const data = JSON.parse(content);
      console.log('Read from file, cases count:', data.length);
      return data;
    }
  } catch (error) {
    console.error('Error reading from file:', error);
  }
  return [];
}

// 写入数据到文件
function writeToFile(cases: Case[]) {
  ensureStorageDir();
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(cases, null, 2), 'utf-8');
    console.log('Written to file, cases count:', cases.length);
  } catch (error) {
    console.error('Error writing to file:', error);
  }
}

// 内存缓存
let cachedCases: Case[] | null = null;

export const caseStorage = {
  async getAll(): Promise<Case[]> {
    if (!cachedCases) {
      cachedCases = readFromFile();
      // 如果文件为空，初始化空数组
      if (cachedCases.length === 0) {
        writeToFile([]);
      }
    }
    return cachedCases;
  },

  async getById(id: string): Promise<Case | null> {
    const cases = await this.getAll();
    return cases.find(c => c.id === id) || null;
  },

  async create(data: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>): Promise<Case> {
    const newCase: Case = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('Creating new case:', newCase.loanNo);
    
    // 获取当前数据
    const cases = await this.getAll();
    
    // 添加新案件到开头
    cases.unshift(newCase);
    
    // 更新缓存
    cachedCases = [...cases];
    
    // 保存到文件
    writeToFile(cases);
    
    console.log('Case created and saved, total cases now:', cases.length);

    return newCase;
  },

  async update(id: string, data: Partial<Case>): Promise<Case | null> {
    const cases = await this.getAll();
    const index = cases.findIndex(c => c.id === id);
    if (index === -1) return null;

    cases[index] = {
      ...cases[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    cachedCases = [...cases];
    writeToFile(cases);
    return cases[index];
  },

  async delete(id: string): Promise<boolean> {
    const cases = await this.getAll();
    const index = cases.findIndex(c => c.id === id);
    if (index === -1) return false;

    cases.splice(index, 1);
    cachedCases = [...cases];
    writeToFile(cases);
    return true;
  },

  async importCases(casesData: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Case[]> {
    const importedCases: Case[] = [];

    for (const data of casesData) {
      const newCase: Case = {
        ...data,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      importedCases.push(newCase);
    }

    const cases = await this.getAll();
    cachedCases = [...importedCases, ...cases];
    writeToFile(cachedCases);

    return importedCases;
  },

  async getStats(): Promise<{ total: number; byStatus: Record<string, number>; byRiskLevel: Record<string, number> }> {
    const cases = await this.getAll();
    const byStatus: Record<string, number> = {};
    const byRiskLevel: Record<string, number> = {};

    cases.forEach(c => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      byRiskLevel[c.riskLevel] = (byRiskLevel[c.riskLevel] || 0) + 1;
    });

    return {
      total: cases.length,
      byStatus,
      byRiskLevel,
    };
  },
};
