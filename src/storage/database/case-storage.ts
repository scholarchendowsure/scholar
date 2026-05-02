import { Case } from '@/types/case';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// 存储文件路径
const STORAGE_FILE = path.join('/tmp', 'cases-v2.json');
const RECYCLE_BIN_FILE = path.join('/tmp', 'cases-recycle-bin.json');

// 回收站案件类型
interface RecycleBinItem {
  id: string;
  caseData: Case;
  deletedAt: string;
  deletedBy: string;
}

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

// 从回收站读取数据
function readRecycleBin(): RecycleBinItem[] {
  ensureStorageDir();
  try {
    if (fs.existsSync(RECYCLE_BIN_FILE)) {
      const content = fs.readFileSync(RECYCLE_BIN_FILE, 'utf-8');
      const data = JSON.parse(content);
      console.log('Read from recycle bin, items count:', data.length);
      return data;
    }
  } catch (error) {
    console.error('Error reading recycle bin:', error);
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

// 写入回收站数据
function writeRecycleBin(items: RecycleBinItem[]) {
  ensureStorageDir();
  try {
    fs.writeFileSync(RECYCLE_BIN_FILE, JSON.stringify(items, null, 2), 'utf-8');
    console.log('Written to recycle bin, items count:', items.length);
  } catch (error) {
    console.error('Error writing recycle bin:', error);
  }
}

export const caseStorage = {
  async getAll(): Promise<Case[]> {
    const cases = readFromFile();
    // 如果文件为空，初始化空数组
    if (cases.length === 0) {
      writeToFile([]);
    }
    return cases;
  },

  async getById(id: string): Promise<Case | null> {
    const cases = await this.getAll();
    return cases.find(c => c.id === id) || null;
  },

  async getByUserId(userId: string | number): Promise<Case[]> {
    const cases = await this.getAll();
    return cases.filter(c => String(c.userId) === String(userId));
  },

  async getByLoanNo(loanNo: string): Promise<Case | null> {
    const cases = await this.getAll();
    return cases.find(c => c.loanNo === loanNo) || null;
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

    writeToFile(cases);
    return cases[index];
  },

  async delete(id: string): Promise<boolean> {
    const cases = await this.getAll();
    const index = cases.findIndex(c => c.id === id);
    if (index === -1) return false;

    // 移动到回收站，而不是直接删除
    const deletedCase = cases[index];
    const recycleBin = readRecycleBin();
    
    const recycleItem: RecycleBinItem = {
      id: id,
      caseData: deletedCase,
      deletedAt: new Date().toISOString(),
      deletedBy: '系统',
    };
    
    recycleBin.unshift(recycleItem);
    writeRecycleBin(recycleBin);

    // 从主列表中删除
    cases.splice(index, 1);
    writeToFile(cases);
    return true;
  },

  // ===== 回收站相关方法 =====
  async getRecycleBin(): Promise<RecycleBinItem[]> {
    return readRecycleBin();
  },

  async restore(ids: string[]): Promise<number> {
    const cases = await this.getAll();
    const recycleBin = readRecycleBin();
    
    let restoredCount = 0;
    const itemsToRestore: RecycleBinItem[] = [];
    const remainingItems: RecycleBinItem[] = [];
    
    recycleBin.forEach(item => {
      if (ids.includes(item.id)) {
        itemsToRestore.push(item);
        restoredCount++;
      } else {
        remainingItems.push(item);
      }
    });
    
    // 恢复到主列表
    itemsToRestore.forEach(item => {
      cases.unshift(item.caseData);
    });
    
    writeToFile(cases);
    writeRecycleBin(remainingItems);
    
    return restoredCount;
  },

  async permanentDelete(ids: string[]): Promise<number> {
    const recycleBin = readRecycleBin();
    
    let deletedCount = 0;
    const remainingItems: RecycleBinItem[] = [];
    
    recycleBin.forEach(item => {
      if (ids.includes(item.id)) {
        deletedCount++;
      } else {
        remainingItems.push(item);
      }
    });
    
    writeRecycleBin(remainingItems);
    
    return deletedCount;
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
    const allCases = [...importedCases, ...cases];
    writeToFile(allCases);

    return importedCases;
  },

  async getStats(): Promise<{ total: number; byStatus: Record<string, number>; byRiskLevel: Record<string, number> }> {
    const cases = await this.getAll();
    const byStatus: Record<string, number> = {};
    const byRiskLevel: Record<string, number> = {};

    cases.forEach(c => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      if (c.riskLevel) {
        byRiskLevel[c.riskLevel] = (byRiskLevel[c.riskLevel] || 0) + 1;
      }
    });

    return {
      total: cases.length,
      byStatus,
      byRiskLevel,
    };
  },
};
