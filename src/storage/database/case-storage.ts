import { Case, CaseFile, FollowUp } from '@/types/case';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// 存储文件路径
const STORAGE_FILE = path.join(process.cwd(), 'public', 'data', 'cases-v2.json');
const RECYCLE_BIN_FILE = path.join(process.cwd(), 'public', 'data', 'cases-recycle-bin.json');

// ============ P0优化：双缓存机制 ============
// 完整缓存（用于详情页等需要全部数据的场景）
let cachedCases: Case[] | null = null;
// 轻量缓存（用于列表页，剥离了files.data和followups.fileInfo大字段）
let cachedCasesLight: Case[] | null = null;
let lastModifiedTime: number = 0;
let cacheHits = 0;
let cacheMisses = 0;

// 剥离大字段，生成轻量版Case（用于列表展示）
function stripLargeFields(c: Case): Case {
  const stripped = { ...c };
  // 剥离 files 中的 base64 data
  if (stripped.files && Array.isArray(stripped.files)) {
    stripped.files = stripped.files.map((f: CaseFile) => {
      const { data, ...rest } = f;
      return rest as CaseFile;
    });
  }
  // 剥离 followups 中的 fileInfo 大字段
  if (stripped.followups && Array.isArray(stripped.followups)) {
    stripped.followups = stripped.followups.map((f: FollowUp) => {
      const { fileInfo, ...rest } = f;
      return rest as FollowUp;
    });
  }
  return stripped;
}

// 获取文件修改时间
function getFileMtime(filePath: string): number {
  try {
    if (fs.existsSync(filePath)) {
      return fs.statSync(filePath).mtimeMs;
    }
  } catch {
    // 忽略错误
  }
  return 0;
}

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



// 从回收站读取数据
function readRecycleBin(): RecycleBinItem[] {
  ensureStorageDir();
  try {
    if (fs.existsSync(RECYCLE_BIN_FILE)) {
      const content = fs.readFileSync(RECYCLE_BIN_FILE, 'utf-8');
      // 如果内容为空或只有空白字符，返回空数组
      if (!content || content.trim().length === 0) {
        console.log('Recycle bin file is empty');
        return [];
      }
      const data = JSON.parse(content);
      console.log('Read from recycle bin, items count:', data.length);
      return data;
    }
  } catch (error) {
    console.error('Error reading recycle bin:', error);
    // 如果JSON解析失败，返回空数组而不是崩溃
    return [];
  }
  return [];
}

// ============ P0优化：写入后清除缓存 ============
// 写入数据到文件
function writeToFile(cases: Case[]) {
  ensureStorageDir();
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(cases, null, 2), 'utf-8');
    // ✅ 写入后清除缓存，强制下次重新读取
    cachedCases = null;
    lastModifiedTime = 0;
    console.log('Written to file, cases count:', cases.length, 'Cache cleared');
  } catch (error) {
    console.error('Error writing to file:', error);
  }
}

// ============ P0优化：双缓存读取 ============
// 从文件读取完整数据（用于详情页等）
function readFromFile(): Case[] {
  ensureStorageDir();
  
  // 检查缓存是否有效
  const currentMtime = getFileMtime(STORAGE_FILE);
  
  if (cachedCases && currentMtime === lastModifiedTime) {
    cacheHits++;
    if (cacheHits % 100 === 0) {
      console.log(`[Cache] Hits: ${cacheHits}, Misses: ${cacheMisses}`);
    }
    return cachedCases;
  }
  
  // 缓存未命中，从磁盘读取
  cacheMisses++;
  lastModifiedTime = currentMtime;
  
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const startTime = Date.now();
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const readTime = Date.now() - startTime;
      
      if (!content || content.trim().length === 0) {
        console.log('Storage file is empty');
        cachedCases = [];
        cachedCasesLight = [];
        return cachedCases;
      }
      
      const parseStart = Date.now();
      cachedCases = JSON.parse(content);
      const parseTime = Date.now() - parseStart;
      
      // ✅ 同时生成轻量缓存（剥离大字段）
      const stripStart = Date.now();
      cachedCasesLight = cachedCases!.map(stripLargeFields);
      const stripTime = Date.now() - stripStart;
      
      const fullSizeMB = (JSON.stringify(cachedCases!).length / 1024 / 1024).toFixed(1);
      const lightSizeMB = (JSON.stringify(cachedCasesLight).length / 1024 / 1024).toFixed(1);
      
      console.log(`[Cache] Refreshed, cases: ${cachedCases!.length}, Read: ${readTime}ms, Parse: ${parseTime}ms, Strip: ${stripTime}ms, Full: ${fullSizeMB}MB, Light: ${lightSizeMB}MB`);
      return cachedCases!;
    }
  } catch (error) {
    console.error('Error reading from file:', error);
    cachedCases = [];
    cachedCasesLight = [];
    return cachedCases;
  }
  cachedCases = [];
  cachedCasesLight = [];
  return cachedCases;
}

// 从文件读取轻量数据（用于列表页，不包含base64大字段）
function readFromFileLight(): Case[] {
  ensureStorageDir();
  
  const currentMtime = getFileMtime(STORAGE_FILE);
  
  if (cachedCasesLight && currentMtime === lastModifiedTime) {
    return cachedCasesLight;
  }
  
  // 轻量缓存未命中，先读取完整数据（会同时生成轻量缓存）
  readFromFile();
  return cachedCasesLight!;
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
  // ✅ 轻量版 - 用于列表页（不包含files.data和followups.fileInfo）
  async getAllLight(): Promise<Case[]> {
    const cases = readFromFileLight();
    return cases;
  },

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

  async query(options: {
    page?: number;
    pageSize?: number;
    status?: string;
    riskLevel?: string;
    search?: string;
    useLightData?: boolean;
    [key: string]: any;
  }): Promise<{
    data: Case[];
    total: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      pageSize = 10,
      status,
      riskLevel,
      search,
      useLightData = false,
      ...filters
    } = options;

    // ✅ 关键优化：列表查询使用轻量数据，避免加载80MB的base64字段
    let cases = useLightData ? await this.getAllLight() : await this.getAll();
    
    // 筛选
    if (status && status !== 'all') {
      cases = cases.filter(c => c.status === status);
    }
    
    if (riskLevel && riskLevel !== 'all') {
      cases = cases.filter(c => c.riskLevel === riskLevel);
    }
    
    // 搜索
    if (search) {
      const searchLower = search.toLowerCase();
      cases = cases.filter(c => 
        c.loanNo.toLowerCase().includes(searchLower) ||
        c.userId.toLowerCase().includes(searchLower) ||
        c.borrowerName.toLowerCase().includes(searchLower) ||
        (c.contactInfo?.toLowerCase().includes(searchLower) || '') ||
        (c.borrowerPhone?.toLowerCase().includes(searchLower) || '') ||
        (c.companyAddress?.toLowerCase().includes(searchLower) || '')
      );
    }
    
    // 其他筛选条件
    const filterKeys = Object.keys(filters).filter(key => 
      !['status', 'riskLevel', 'search', 'page', 'pageSize', 'useLightData'].includes(key)
    );
    
    if (filterKeys.length > 0) {
      cases = cases.filter(c => {
        for (const key of filterKeys) {
          const value = filters[key];
          if (!value) continue;
          
          switch (key) {
            case 'filterUserId':
              const terms = value.trim().toLowerCase().split(/\s+/).filter(Boolean);
              if (terms.length > 0 && !terms.some((term: string) => c.userId.toLowerCase().includes(term))) {
                return false;
              }
              break;
            case 'filterContactInfo':
              const val = value.toLowerCase();
              const contactInfo = c.contactInfo?.toLowerCase() || '';
              const borrowerPhone = c.borrowerPhone?.toLowerCase() || '';
              const registeredPhone = c.registeredPhone?.toLowerCase() || '';
              if (!contactInfo.includes(val) && !borrowerPhone.includes(val) && !registeredPhone.includes(val)) {
                return false;
              }
              break;
            case 'filterAddress':
              const addrVal = value.toLowerCase();
              const companyAddr = c.companyAddress?.toLowerCase() || '';
              const homeAddr = c.homeAddress?.toLowerCase() || '';
              const householdAddr = c.householdAddress?.toLowerCase() || '';
              if (!companyAddr.includes(addrVal) && !homeAddr.includes(addrVal) && !householdAddr.includes(addrVal)) {
                return false;
              }
              break;
            default:
              // 通用字符串筛选
              const fieldKey = key.replace('filter', '');
              const camelKey = fieldKey.charAt(0).toLowerCase() + fieldKey.slice(1);
              const fieldVal = (c as any)[camelKey];
              if (fieldVal !== undefined && fieldVal !== null) {
                if (!String(fieldVal).toLowerCase().includes(value.toLowerCase())) {
                  return false;
                }
              }
          }
        }
        return true;
      });
    }

    const total = cases.length;
    const totalPages = Math.ceil(total / pageSize);
    
    // 分页
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedCases = cases.slice(start, end);

    return {
      data: paginatedCases,
      total,
      totalPages,
    };
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
