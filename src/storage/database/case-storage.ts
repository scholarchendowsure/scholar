import { Case, CaseFile, FollowUp } from '@/types/case';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// 判断是否是生产环境
const isProd = process.env.COZE_PROJECT_ENV === 'PROD';

// 存储文件路径 - 生产环境使用 /tmp，开发环境使用 public/data
function getStoragePath(): string {
  if (isProd) {
    return path.join('/tmp', 'cases-v2.json');
  }
  return path.join(process.cwd(), 'public', 'data', 'cases-v2.json');
}

function getRecycleBinPath(): string {
  if (isProd) {
    return path.join('/tmp', 'cases-recycle-bin.json');
  }
  return path.join(process.cwd(), 'public', 'data', 'cases-recycle-bin.json');
}

const STORAGE_FILE = getStoragePath();
const RECYCLE_BIN_FILE = getRecycleBinPath();

console.log(`[CaseStorage] 环境: ${isProd ? '生产环境' : '开发环境'}`);
console.log(`[CaseStorage] 案件数据路径: ${STORAGE_FILE}`);
console.log(`[CaseStorage] 回收站路径: ${RECYCLE_BIN_FILE}`);

// ============ P0优化：双缓存机制 ============
// 完整缓存（用于详情页等需要全部数据的场景）
let cachedCases: Case[] | null = null;
// 轻量缓存（用于列表页，剥离了files.data和followups.fileInfo大字段）
let cachedCasesLight: Case[] | null = null;
let lastModifiedTime: number = 0;
let cacheHits = 0;
let cacheMisses = 0;

// 剥离大字段，生成轻量版Case（用于列表展示）
export function stripLargeFields(c: Case): Case {
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

// 安全读取JSON文件（处理文件不存在、内容为空、解析失败等所有异常
function safeReadJSON<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`safeReadJSON: 文件不存在，返回默认值: ${filePath}`);
      // 如果是生产环境且文件不存在，尝试从public/data复制初始数据
      if (isProd) {
        const devPath = filePath.includes('cases-v2.json')
          ? path.join(process.cwd(), 'public', 'data', 'cases-v2.json')
          : path.join(process.cwd(), 'public', 'data', 'cases-recycle-bin.json');
        if (fs.existsSync(devPath)) {
          try {
            const devContent = fs.readFileSync(devPath, 'utf-8');
            if (devContent && devContent.trim().length > 0) {
              const data = JSON.parse(devContent);
              console.log(`safeReadJSON: 从开发环境路径复制初始数据: ${devPath}`);
              // 写入到生产环境路径
              const dir = path.dirname(filePath);
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
              return data;
            }
          } catch (e) {
            console.error(`safeReadJSON: 复制初始数据失败:`, e);
          }
        }
      }
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content || content.trim().length === 0) {
      console.log(`safeReadJSON: 文件内容为空，返回默认值: ${filePath}`);
      return defaultValue;
    }
    const data = JSON.parse(content);
    console.log(`safeReadJSON: 成功读取文件: ${filePath}, 数据类型: ${typeof data}, 是数组: ${Array.isArray(data)}`);
    return data;
  } catch (error) {
    console.error(`safeReadJSON: 读取文件异常，返回默认值:`, error);
    return defaultValue;
  }
}

// 安全写入JSON文件（先写临时文件再重命名，防文件损坏
function safeWriteJSON(filePath: string, data: any): void {
  try {
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const jsonContent = JSON.stringify(data, null, 2);
    
    // 生产环境：直接写（防止只读文件系统问题
    if (isProd) {
      fs.writeFileSync(filePath, jsonContent, 'utf-8');
      console.log(`safeWriteJSON: 生产环境直接写入成功: ${filePath}`);
    } else {
      // 开发环境：使用临时文件+原子重命名策略，防损坏
      const tempPath = `${filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, jsonContent, 'utf-8');
      console.log(`safeWriteJSON: 临时文件写入成功: ${tempPath}`);
      // 原子重命名
      fs.renameSync(tempPath, filePath);
      console.log(`safeWriteJSON: 原子重命名成功: ${filePath}`);
    }
  } catch (error) {
    console.error(`safeWriteJSON: 写入文件失败: ${filePath}`, error);
    throw error;
  }
}

// 从文件读取案件数据
function readFromFile(): Case[] {
  console.log('[Cache] 读取文件');
  return safeReadJSON<Case[]>(STORAGE_FILE, []);
}

// 读取回收站数据
function readRecycleBin(): any[] {
  return safeReadJSON<any[]>(RECYCLE_BIN_FILE, []);
}

// 写入案件数据到文件（同时清除缓存）
function writeToFile(cases: Case[]): void {
  console.log('writeToFile: 已清除所有缓存');
  // 清除所有缓存
  cachedCases = null;
  cachedCasesLight = null;
  safeWriteJSON(STORAGE_FILE, cases);
}

// 写入回收站数据
function writeRecycleBin(data: any[]): void {
  safeWriteJSON(RECYCLE_BIN_FILE, data);
  console.log('writeRecycleBin: 写入成功');
}

// ============ 核心API：获取所有案件 ============
export async function getAll(): Promise<Case[]> {
  try {
    // 检查文件是否修改过
    let currentMtime = 0;
    if (fs.existsSync(STORAGE_FILE)) {
      const stats = fs.statSync(STORAGE_FILE);
      currentMtime = stats.mtimeMs;
    }

    // 优先检查缓存是否有效
    if (cachedCases && currentMtime === lastModifiedTime) {
      cacheHits++;
      console.log(`[Cache] 命中缓存 (命中: ${cacheHits}, 未命中: ${cacheMisses})`);
      return cachedCases;
    }

    // 缓存未命中或文件已修改，重新读取
    cacheMisses++;
    console.log(`[Cache] 缓存未命中或文件已修改，重新读取 (命中: ${cacheHits}, 未命中: ${cacheMisses})`);
    
    const cases = readFromFile();
    // 更新缓存和最后修改时间
    cachedCases = cases;
    lastModifiedTime = currentMtime;
    // 同时预生成轻量缓存
    cachedCasesLight = cases.map(stripLargeFields);
    
    console.log(`[Cache] 刷新缓存, cases: ${cases.length}, Read: 0ms, Parse: 0ms, Strip: 0ms, Full: 0.0MB, Light: 0.0MB`);
    
    return cases;
  } catch (error) {
    console.error('[Error] getAll error:', error);
    return [];
  }
}

// ============ P0优化：获取所有轻量案件（列表页专用） ============
export async function getAllLight(): Promise<Case[]> {
  // 先触发getAll()来确保缓存是最新的
  await getAll();
  // 直接返回预先生成的轻量缓存
  return cachedCasesLight || [];
}

// ============ 核心API：根据ID获取单个案件 ============
export async function getById(id: string): Promise<Case | null> {
  const cases = await getAll();
  const found = cases.find((c) => c.id === id) || null;
  // 也尝试通过贷款单号查找
  if (!found) {
    return cases.find((c) => c.loanNo === id) || null;
  }
  return found;
}

// ============ 根据用户ID获取案件 ============
export async function getByUserId(userId: string): Promise<Case[]> {
  const cases = await getAll();
  return cases.filter((c) => c.userId === userId);
}

// ============ 根据贷款单号获取案件 ============
export async function getByLoanNo(loanNo: string): Promise<Case | null> {
  const cases = await getAll();
  return cases.find((c) => c.loanNo === loanNo) || null;
}

// ============ 查询案件 ============
export async function query(options: any): Promise<{ data: Case[]; total: number; totalPages: number }> {
  const cases = await getAll();
  
  // 先应用筛选
  let filtered = cases.filter((c: Case) => {
    if (options.userId && c.userId !== options.userId) return false;
    if (options.loanNo && !c.loanNo.includes(options.loanNo)) return false;
    if (options.status && c.status !== options.status) return false;
    if (options.riskLevel && c.riskLevel !== options.riskLevel) return false;
    if (options.search && !c.borrowerName.includes(options.search) && !c.loanNo.includes(options.search)) return false;
    return true;
  });
  
  // 获取总数
  const total = filtered.length;
  
  // 应用分页
  const page = options.page || 1;
  const pageSize = options.pageSize || 10;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const data = filtered.slice(start, end);
  const totalPages = Math.ceil(total / pageSize);
  
  return { data, total, totalPages };
}

// ============ 恢复案件（支持批量） ============
export async function restore(ids: string | string[]): Promise<number> {
  const idList = Array.isArray(ids) ? ids : [ids];
  let count = 0;
  
  for (const id of idList) {
    const success = await restoreFromRecycleBin(id);
    if (success) count++;
  }
  
  return count;
}

// ============ 核心API：创建新案件 ============
export async function create(caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>): Promise<Case> {
  const cases = await getAll();
  const newCase: Case = {
    ...caseData,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  cases.push(newCase);
  writeToFile(cases);
  return newCase;
}

// ============ 核心API：更新案件 ============
export async function update(id: string, updates: Partial<Case>): Promise<Case | null> {
  // 立即清除所有缓存
  cachedCases = null;
  cachedCasesLight = null;
  
  // 直接从文件读取最新数据，不走getAll()防止旧缓存
  const cases = safeReadJSON<Case[]>(STORAGE_FILE, []);
  
  const index = cases.findIndex((c) => c.id === id);
  if (index === -1) {
    // 也尝试通过贷款单号查找
    const loanIndex = cases.findIndex((c) => c.loanNo === id);
    if (loanIndex === -1) return null;
    cases[loanIndex] = {
      ...cases[loanIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    writeToFile(cases);
    return cases[loanIndex];
  }
  
  cases[index] = {
    ...cases[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeToFile(cases);
  return cases[index];
}

// ============ 核心API：删除案件（移入回收站） ============
export async function deleteCase(id: string, deletedBy: string = '系统'): Promise<boolean> {
  // 立即清除所有缓存
  cachedCases = null;
  cachedCasesLight = null;
  
  // 直接从文件读取最新数据，不走getAll()防止旧缓存
  const cases = safeReadJSON<Case[]>(STORAGE_FILE, []);
  
  const index = cases.findIndex((c) => c.id === id);
  if (index === -1) {
    // 也尝试通过贷款单号查找
    const loanIndex = cases.findIndex((c) => c.loanNo === id);
    if (loanIndex === -1) return false;
    const [deletedCase] = cases.splice(loanIndex, 1);
    // 同时从回收站
    const recycleBin = readRecycleBin();
    recycleBin.push({
      id: deletedCase.id,
      caseData: deletedCase,
      deletedAt: new Date().toISOString(),
      deletedBy,
    });
    writeRecycleBin(recycleBin);
    writeToFile(cases);
    return true;
  }
  
  const [deletedCase] = cases.splice(index, 1);
  
  // 同时从回收站
  const recycleBin = readRecycleBin();
  recycleBin.push({
    id: deletedCase.id,
    caseData: deletedCase,
    deletedAt: new Date().toISOString(),
    deletedBy,
  });
  writeRecycleBin(recycleBin);
  writeToFile(cases);
  return true;
}

// ============ 回收站API：获取回收站列表 ============
export async function getRecycleBin(): Promise<any[]> {
  return readRecycleBin();
}

// ============ 回收站API：恢复案件 ============
export async function restoreFromRecycleBin(id: string): Promise<boolean> {
  const recycleBin = readRecycleBin();
  const index = recycleBin.findIndex((item) => item.id === id);
  if (index === -1) return false;
  
  const [restoredItem] = recycleBin.splice(index, 1);
  
  // 恢复到案件列表
  const cases = await getAll();
  cases.push(restoredItem.caseData);
  
  writeRecycleBin(recycleBin);
  writeToFile(cases);
  return true;
}

// ============ 回收站API：永久删除 ============
export async function permanentDelete(ids: string[]): Promise<number> {
  // 立即清除所有缓存
  cachedCases = null;
  cachedCasesLight = null;
  
  // 直接读取回收站
  let recycleBin = safeReadJSON<any[]>(RECYCLE_BIN_FILE, []);
  
  const originalCount = recycleBin.length;
  const idsSet = new Set(ids);
  recycleBin = recycleBin.filter((item) => !idsSet.has(item.id));
  const deletedCount = originalCount - recycleBin.length;
  
  // 同时从主数据文件删除
  let cases = safeReadJSON<Case[]>(STORAGE_FILE, []);
  cases = cases.filter((c) => !idsSet.has(c.id));
  
  writeRecycleBin(recycleBin);
  writeToFile(cases);
  
  return deletedCount;
}

// ============ 统计API：案件统计 ============
export async function getStatistics(): Promise<{ total: number; statusCounts: Record<string, number> }> {
  const cases = await getAll();
  const statusCounts: Record<string, number> = {};
  cases.forEach((c) => {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  });
  return {
    total: cases.length,
    statusCounts,
  };
}

// ============ 批量导入API ============
export async function batchImport(casesData: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Case[]> {
  const cases = await getAll();
  const newCases: Case[] = casesData.map((data) => ({
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  cases.push(...newCases);
  writeToFile(cases);
  return newCases;
}

// ============ 清空缓存API（用于数据变更后强制刷新） ============
export function clearCache(): void {
  cachedCases = null;
  cachedCasesLight = null;
  console.log('[Cache] 已清空缓存');
}

// ============ 导出对象（保持向后兼容） ============
export const caseStorage = {
  getAll,
  getAllLight,
  getById,
  getByUserId,
  getByLoanNo,
  query,
  create,
  update,
  delete: deleteCase,
  deleteCase,
  getRecycleBin,
  restoreFromRecycleBin,
  restore,
  permanentDelete,
  getStatistics,
  batchImport,
  clearCache
};

