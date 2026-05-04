import { Case } from '@/types/case';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// 存储文件路径
const STORAGE_FILE = path.join(process.cwd(), 'public', 'data', 'cases-v2.json');
const RECYCLE_BIN_FILE = path.join(process.cwd(), 'public', 'data', 'cases-recycle-bin.json');

// 回收站案件类型
interface RecycleBinItem {
  id: string;
  caseData: Case;
  deletedAt: string;
  deletedBy: string;
}

// 内存缓存
let cache: {
  cases: Case[];
  recycleBin: RecycleBinItem[];
  lastModified: number;
  indexes: {
    byId: Map<string, Case>;
    byUserId: Map<string, Case[]>;
    byLoanNo: Map<string, Case>;
    byStatus: Map<string, Case[]>;
    byRiskLevel: Map<string, Case[]>;
  };
} | null = null;

// 文件最后修改时间缓存
let fileLastModified = 0;

// 确保存储目录存在
function ensureStorageDir() {
  const dir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 检查文件是否有更新
function checkFileUpdated(): boolean {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const stats = fs.statSync(STORAGE_FILE);
      const newModified = stats.mtimeMs;
      if (newModified > fileLastModified) {
        fileLastModified = newModified;
        return true;
      }
    }
  } catch (e) {
    // 忽略错误
  }
  return false;
}

// 构建索引
function buildIndexes(cases: Case[]) {
  const byId = new Map<string, Case>();
  const byUserId = new Map<string, Case[]>();
  const byLoanNo = new Map<string, Case>();
  const byStatus = new Map<string, Case[]>();
  const byRiskLevel = new Map<string, Case[]>();

  cases.forEach(c => {
    byId.set(c.id, c);
    byLoanNo.set(c.loanNo, c);

    // 用户ID索引
    const userIdKey = String(c.userId);
    if (!byUserId.has(userIdKey)) {
      byUserId.set(userIdKey, []);
    }
    byUserId.get(userIdKey)!.push(c);

    // 状态索引
    if (!byStatus.has(c.status)) {
      byStatus.set(c.status, []);
    }
    byStatus.get(c.status)!.push(c);

    // 风险等级索引
    if (c.riskLevel) {
      if (!byRiskLevel.has(c.riskLevel)) {
        byRiskLevel.set(c.riskLevel, []);
      }
      byRiskLevel.get(c.riskLevel)!.push(c);
    }
  });

  return { byId, byUserId, byLoanNo, byStatus, byRiskLevel };
}

// 从文件读取数据 - 优化版，带缓存
function readFromFile(): Case[] {
  ensureStorageDir();
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      if (!content || content.trim().length === 0) {
        return [];
      }
      const data = JSON.parse(content);
      console.log('[Optimized] Read from file, cases count:', data.length);
      return data;
    }
  } catch (error) {
    console.error('[Optimized] Error reading from file:', error);
    return [];
  }
  return [];
}

// 从回收站读取数据
function readRecycleBin(): RecycleBinItem[] {
  ensureStorageDir();
  try {
    if (fs.existsSync(RECYCLE_BIN_FILE)) {
      const content = fs.readFileSync(RECYCLE_BIN_FILE, 'utf-8');
      if (!content || content.trim().length === 0) {
        return [];
      }
      const data = JSON.parse(content);
      return data;
    }
  } catch (error) {
    console.error('[Optimized] Error reading recycle bin:', error);
    return [];
  }
  return [];
}

// 获取缓存数据（如果有更新则重新加载）
function getCachedData() {
  const needsReload = !cache || checkFileUpdated();
  
  if (needsReload) {
    console.log('[Optimized] Reloading cache...');
    const cases = readFromFile();
    const recycleBin = readRecycleBin();
    const indexes = buildIndexes(cases);
    
    cache = {
      cases,
      recycleBin,
      lastModified: Date.now(),
      indexes,
    };
  }
  
  return cache!;
}

// 写入数据到文件并更新缓存
function writeToFileAndUpdateCache(cases: Case[]) {
  ensureStorageDir();
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(cases, null, 2), 'utf-8');
    fileLastModified = Date.now();
    console.log('[Optimized] Written to file, cases count:', cases.length);
    
    // 更新缓存
    if (cache) {
      cache.cases = cases;
      cache.indexes = buildIndexes(cases);
    }
  } catch (error) {
    console.error('[Optimized] Error writing to file:', error);
  }
}

// 写入回收站数据
function writeRecycleBinAndUpdateCache(items: RecycleBinItem[]) {
  ensureStorageDir();
  try {
    fs.writeFileSync(RECYCLE_BIN_FILE, JSON.stringify(items, null, 2), 'utf-8');
    console.log('[Optimized] Written to recycle bin, items count:', items.length);
    
    if (cache) {
      cache.recycleBin = items;
    }
  } catch (error) {
    console.error('[Optimized] Error writing recycle bin:', error);
  }
}

// 快速搜索函数 - 优化版
function searchCasesOptimized(
  cases: Case[],
  search: string
): Case[] {
  if (!search || !search.trim()) {
    return cases;
  }

  const searchLower = search.toLowerCase();
  const searchTerms = searchLower.trim().split(/\s+/).filter(Boolean);
  
  if (searchTerms.length === 0) {
    return cases;
  }

  // 使用预编译的正则表达式提高性能
  const regexPattern = searchTerms.map((term: string) => 
    term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|');
  const regex = new RegExp(regexPattern, 'i');

  // 如果有多个搜索词，优先使用索引快速匹配
  if (searchTerms.length > 1 && cache) {
    const matchedIds = new Set<string>();
    searchTerms.forEach((term: string) => {
      // 快速匹配用户ID
      const byUserId = cache!.indexes.byUserId;
      for (const [userId, userCases] of byUserId) {
        if (userId.toLowerCase().includes(term)) {
          userCases.forEach(c => matchedIds.add(c.id));
        }
      }
    });
    if (matchedIds.size > 0) {
      return cases.filter(c => matchedIds.has(c.id));
    }
  }

  // 单个搜索词或索引匹配失败时，使用快速线性搜索
  return cases.filter(c => {
    // 优先检查索引字段
    if (c.loanNo.toLowerCase().includes(searchLower)) return true;
    if (c.userId.toLowerCase().includes(searchLower)) return true;
    if (c.borrowerName.toLowerCase().includes(searchLower)) return true;
    
    // 使用正则检查其他字段
    if (regex.test(c.contactInfo || '')) return true;
    if (regex.test(c.borrowerPhone || '')) return true;
    if (regex.test(c.companyAddress || '')) return true;
    
    return false;
  });
}

// 筛选优化版
function filterCasesOptimized(
  cases: Case[],
  filters: {
    status?: string;
    riskLevel?: string;
    [key: string]: any;
  }
): Case[] {
  let result = cases;
  
  // 优先使用索引筛选
  if (cache && filters.status && filters.status !== 'all') {
    const statusCases = cache.indexes.byStatus.get(filters.status);
    if (statusCases) {
      result = statusCases;
    }
  }
  
  if (cache && filters.riskLevel && filters.riskLevel !== 'all') {
    const riskCases = cache.indexes.byRiskLevel.get(filters.riskLevel);
    if (riskCases) {
      result = result.filter(c => riskCases.some(rc => rc.id === c.id));
    }
  }
  
  // 其他筛选条件
  const filterKeys = Object.keys(filters).filter(key => 
    !['status', 'riskLevel', 'search', 'page', 'pageSize'].includes(key)
  );
  
  if (filterKeys.length > 0) {
    result = result.filter(c => {
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
          case 'filterIsLocked':
            const lockVal = value.toLowerCase();
            const lockedText = c.isLocked ? '已锁定' : '未锁定';
            if (!lockedText.toLowerCase().includes(lockVal) && !String(c.isLocked).toLowerCase().includes(lockVal)) {
              return false;
            }
            break;
          case 'filterIsExtended':
            const extVal = value.toLowerCase();
            const extText = c.isExtended ? '已展期' : '未展期';
            if (!extText.toLowerCase().includes(extVal) && !String(c.isExtended).toLowerCase().includes(extVal)) {
              return false;
            }
            break;
          case 'filterOverdueDaysMin':
            const minDays = Number(value);
            if (!isNaN(minDays) && c.overdueDays < minDays) {
              return false;
            }
            break;
          case 'filterOverdueDaysMax':
            const maxDays = Number(value);
            if (!isNaN(maxDays) && c.overdueDays > maxDays) {
              return false;
            }
            break;
          case 'filterFollowupContent':
            const followVal = value.toLowerCase();
            if (c.followups && Array.isArray(c.followups)) {
              const hasFollowup = c.followups.some((f: any) => 
                ((f.followRecord || f.content)?.toLowerCase() || '').includes(followVal)
              );
              if (!hasFollowup) return false;
            } else {
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
  
  return result;
}

export const caseStorageOptimized = {
  async getAll(): Promise<Case[]> {
    const data = getCachedData();
    return data.cases;
  },

  async getById(id: string): Promise<Case | null> {
    const data = getCachedData();
    return data.indexes.byId.get(id) || null;
  },

  async getByUserId(userId: string | number): Promise<Case[]> {
    const data = getCachedData();
    return data.indexes.byUserId.get(String(userId)) || [];
  },

  async getByLoanNo(loanNo: string): Promise<Case | null> {
    const data = getCachedData();
    return data.indexes.byLoanNo.get(loanNo) || null;
  },

  // 优化的查询方法
  async query(options: {
    page?: number;
    pageSize?: number;
    status?: string;
    riskLevel?: string;
    search?: string;
    [key: string]: any;
  }): Promise<{
    data: Case[];
    total: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      pageSize = 10,
      search,
      ...filters
    } = options;

    const data = getCachedData();
    let cases = data.cases;

    // 先使用索引快速筛选
    cases = filterCasesOptimized(cases, filters);
    
    // 再搜索
    if (search) {
      cases = searchCasesOptimized(cases, search);
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

  async create(data: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>): Promise<Case> {
    const newCase: Case = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('[Optimized] Creating new case:', newCase.loanNo);
    
    const currentData = getCachedData();
    const cases = [newCase, ...currentData.cases];
    
    writeToFileAndUpdateCache(cases);
    
    console.log('[Optimized] Case created, total cases:', cases.length);

    return newCase;
  },

  async update(id: string, data: Partial<Case>): Promise<Case | null> {
    const currentData = getCachedData();
    const cases = [...currentData.cases];
    const index = cases.findIndex(c => c.id === id);
    if (index === -1) return null;

    cases[index] = {
      ...cases[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    writeToFileAndUpdateCache(cases);
    return cases[index];
  },

  async delete(id: string): Promise<boolean> {
    const currentData = getCachedData();
    const cases = [...currentData.cases];
    const index = cases.findIndex(c => c.id === id);
    if (index === -1) return false;

    // 移动到回收站
    const deletedCase = cases[index];
    const recycleBin = [...currentData.recycleBin];
    
    const recycleItem: RecycleBinItem = {
      id: id,
      caseData: deletedCase,
      deletedAt: new Date().toISOString(),
      deletedBy: '系统',
    };
    
    recycleBin.unshift(recycleItem);
    writeRecycleBinAndUpdateCache(recycleBin);

    // 从主列表中删除
    cases.splice(index, 1);
    writeToFileAndUpdateCache(cases);
    
    return true;
  },

  // ===== 回收站相关方法 =====
  async getRecycleBin(): Promise<RecycleBinItem[]> {
    const data = getCachedData();
    return data.recycleBin;
  },

  async restore(ids: string[]): Promise<number> {
    const currentData = getCachedData();
    const cases = [...currentData.cases];
    const recycleBin = [...currentData.recycleBin];
    
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
    
    itemsToRestore.forEach(item => {
      cases.unshift(item.caseData);
    });
    
    writeToFileAndUpdateCache(cases);
    writeRecycleBinAndUpdateCache(remainingItems);
    
    return restoredCount;
  },

  async permanentDelete(ids: string[]): Promise<number> {
    const currentData = getCachedData();
    const recycleBin = [...currentData.recycleBin];
    
    let deletedCount = 0;
    const remainingItems: RecycleBinItem[] = [];
    
    recycleBin.forEach(item => {
      if (ids.includes(item.id)) {
        deletedCount++;
      } else {
        remainingItems.push(item);
      }
    });
    
    writeRecycleBinAndUpdateCache(remainingItems);
    
    return deletedCount;
  },

  async importCases(casesData: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Case[]> {
    const importedCases: Case[] = casesData.map(data => ({
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const currentData = getCachedData();
    const allCases = [...importedCases, ...currentData.cases];
    
    writeToFileAndUpdateCache(allCases);
    
    return importedCases;
  },

  async getStats(): Promise<{ total: number; byStatus: Record<string, number>; byRiskLevel: Record<string, number> }> {
    const data = getCachedData();
    const byStatus: Record<string, number> = {};
    const byRiskLevel: Record<string, number> = {};

    // 使用索引快速计算统计
    data.indexes.byStatus.forEach((cases, status) => {
      byStatus[status] = cases.length;
    });
    
    data.indexes.byRiskLevel.forEach((cases, riskLevel) => {
      byRiskLevel[riskLevel] = cases.length;
    });

    return {
      total: data.cases.length,
      byStatus,
      byRiskLevel,
    };
  },

  // 清除缓存（用于调试）
  clearCache() {
    cache = null;
    fileLastModified = 0;
    console.log('[Optimized] Cache cleared');
  },
};
