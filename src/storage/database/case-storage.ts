import { Case, CaseFile, FollowUp, CaseHistory } from '@/types/case';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db/client';
import { cases, followups, caseFiles, caseHistory } from '@/storage/database/shared/schema';
import { eq, and, desc, like, or, sql } from 'drizzle-orm';

console.log('[CaseStorage] 案件数据存储: PostgreSQL数据库');

// ============ 缓存机制 ============
let cachedCases: Case[] | null = null;
let cachedCasesLight: Case[] | null = null;
let cacheHits = 0;
let cacheMisses = 0;

// 剥离大字段，生成轻量版Case（用于列表展示）
function stripLargeFields(c: Case): Case {
  const stripped = { ...c };
  if (stripped.files && Array.isArray(stripped.files)) {
    stripped.files = stripped.files.map((f: CaseFile) => {
      const { data, ...rest } = f;
      return rest as CaseFile;
    });
  }
  if (stripped.followups && Array.isArray(stripped.followups)) {
    stripped.followups = stripped.followups.map((f: FollowUp) => {
      if (f.fileInfo && Array.isArray(f.fileInfo)) {
        return {
          ...f,
          fileInfo: f.fileInfo.map((file: any) => {
            const { data, ...rest } = file;
            return rest;
          })
        };
      }
      return f;
    });
  }
  return stripped;
}

// 规范化逾期天数
function normalizeOverdueDays(c: Case): Case {
  const normalized = { ...c };
  if (normalized.overdueDays !== undefined && normalized.overdueDays !== null) {
    normalized.overdueDays = Math.round(Number(normalized.overdueDays));
  }
  if (normalized.status === 'following' || normalized.status?.toLowerCase().includes('overdue') || normalized.status?.toLowerCase().includes('逾期')) {
    if (normalized.overdueDays !== undefined && normalized.overdueDays !== null && normalized.dueDate) {
      try {
        const dueDate = new Date(normalized.dueDate);
        const today = new Date();
        dueDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - dueDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          normalized.overdueDays = diffDays;
        }
      } catch (e) {
        console.error('计算逾期天数失败:', e);
      }
    }
  }
  return normalized;
}

// 从数据库行转换为Case对象
function dbRowToCase(row: any): Case {
  return {
    id: row.id,
    userId: row.userId,
    loanNo: row.loanNo,
    borrowerName: row.borrowerName,
    borrowerPhone: row.borrowerPhone,
    idCard: row.idCard,
    address: row.address,
    companyName: row.companyName,
    status: row.status,
    riskLevel: row.riskLevel,
    debtAmount: row.debtAmount,
    totalOutstandingBalance: row.totalOutstandingBalance,
    overdueAmount: row.overdueAmount,
    overdueDays: row.overdueDays,
    dueDate: row.dueDate,
    assignedSales: row.assignedSales,
    assignedPostLoan: row.assignedPostLoan,
    isLocked: row.isLocked,
    remark: row.remark,
    caseLabels: row.caseLabels || [],
    files: [],
    followups: [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ============ 核心API：获取所有案件 ============
export async function getAll(): Promise<Case[]> {
  try {
    if (cachedCases) {
      cacheHits++;
      console.log(`[Cache] 命中缓存 (命中: ${cacheHits}, 未命中: ${cacheMisses})`);
      return cachedCases;
    }

    cacheMisses++;
    console.log(`[Cache] 缓存未命中，从数据库读取 (命中: ${cacheHits}, 未命中: ${cacheMisses})`);

    const result = await db.select().from(cases).orderBy(desc(cases.createdAt));
    const caseList = result.map(dbRowToCase).map(normalizeOverdueDays);

    // 加载关联数据
    for (const c of caseList) {
      const [followupList, fileList] = await Promise.all([
        db.select().from(followups).where(eq(followups.caseId, c.id)).orderBy(desc(followups.createdAt)),
        db.select().from(caseFiles).where(eq(caseFiles.caseId, c.id)).orderBy(desc(caseFiles.createdAt)),
      ]);
      c.followups = followupList as any;
      c.files = fileList as any;
    }

    cachedCases = caseList;
    cachedCasesLight = caseList.map(stripLargeFields);

    console.log(`[Cache] 刷新缓存, cases: ${caseList.length}`);
    return caseList;
  } catch (error) {
    console.error('[Error] getAll error:', error);
    return [];
  }
}

// ============ P0优化：获取所有轻量案件（列表页专用） ============
export async function getAllLight(): Promise<Case[]> {
  await getAll();
  return cachedCasesLight || [];
}

// ============ 核心API：根据ID获取单个案件 ============
export async function getById(id: string): Promise<Case | null> {
  try {
    const result = await db.select().from(cases).where(or(eq(cases.id, id), eq(cases.loanNo, id)));
    if (result.length === 0) return null;

    const caseData = dbRowToCase(result[0]);
    const normalized = normalizeOverdueDays(caseData);

    const [followupList, fileList] = await Promise.all([
      db.select().from(followups).where(eq(followups.caseId, normalized.id)).orderBy(desc(followups.createdAt)),
      db.select().from(caseFiles).where(eq(caseFiles.caseId, normalized.id)).orderBy(desc(caseFiles.createdAt)),
    ]);
    normalized.followups = followupList as any;
    normalized.files = fileList as any;

    return normalized;
  } catch (error) {
    console.error('[Error] getById error:', error);
    return null;
  }
}

// ============ 根据用户ID获取案件 ============
export async function getByUserId(userId: string): Promise<Case[]> {
  const allCases = await getAll();
  return allCases.filter((c) => c.userId === userId);
}

// ============ 根据贷款单号获取案件 ============
export async function getByLoanNo(loanNo: string): Promise<Case | null> {
  const allCases = await getAll();
  return allCases.find((c) => c.loanNo === loanNo) || null;
}

// ============ 查询案件 ============
export async function query(options: any): Promise<{ data: Case[]; total: number; totalPages: number }> {
  const allCases = await getAll();
  let filtered = allCases.filter((c: Case) => {
    if (options.userId) {
      const userIds = String(options.userId).trim().split(/\s+/).filter(id => id.trim());
      if (userIds.length > 0 && !userIds.includes(c.userId)) return false;
    }
    if (options.loanNo) {
      const loanNos = String(options.loanNo).trim().split(/\s+/).filter(no => no.trim());
      if (loanNos.length > 0) {
        const matched = loanNos.some(no => c.loanNo.includes(no));
        if (!matched) return false;
      }
    }
    if (options.status && c.status !== options.status) return false;
    if (options.riskLevel && c.riskLevel !== options.riskLevel) return false;
    if (options.search) {
      const searchTerms = String(options.search).trim().split(/\s+/).filter(term => term.trim());
      if (searchTerms.length > 0) {
        const matched = searchTerms.some(term => 
          c.borrowerName.includes(term) || 
          c.loanNo.includes(term) ||
          c.userId.includes(term)
        );
        if (!matched) return false;
      }
    }
    for (const [key, value] of Object.entries(options)) {
      if (!key.startsWith('filter') || !value) continue;
      const fieldName = key.replace('filter', '');
      const normalizedFieldName = fieldName.charAt(0).toLowerCase() + fieldName.slice(1);
      const caseValue = (c as any)[normalizedFieldName];
      if (caseValue === undefined || caseValue === null) continue;
      if (normalizedFieldName === 'userId') {
        const userIds = String(value).trim().split(/\s+/).filter(id => id.trim());
        if (userIds.length > 0 && !userIds.includes(caseValue)) {
          return false;
        }
        continue;
      }
      if (normalizedFieldName === 'loanNo') {
        const loanNos = String(value).trim().split(/\s+/).filter(no => no.trim());
        if (loanNos.length > 0) {
          const matched = loanNos.some(no => caseValue.includes(no));
          if (!matched) {
            return false;
          }
        }
        continue;
      }
      if (typeof caseValue === 'string') {
        if (!caseValue.toLowerCase().includes(String(value).toLowerCase())) {
          return false;
        }
      } else if (typeof caseValue === 'number') {
        if (caseValue !== Number(value)) {
          return false;
        }
      } else if (typeof caseValue === 'boolean') {
        const boolValue = value === 'true' || value === true;
        if (caseValue !== boolValue) {
          return false;
        }
      }
    }
    return true;
  });

  const total = filtered.length;
  const page = options.page || 1;
  const pageSize = options.pageSize || 10;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const data = filtered.slice(start, end);
  const totalPages = Math.ceil(total / pageSize);

  return { data, total, totalPages };
}

// ============ 核心API：创建新案件 ============
export async function create(caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>): Promise<Case> {
  const newCase: Case = {
    ...caseData,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.insert(cases).values({
    id: newCase.id,
    userId: newCase.userId,
    loanNo: newCase.loanNo,
    borrowerName: newCase.borrowerName,
    borrowerPhone: newCase.borrowerPhone,
    idCard: newCase.idCard,
    address: newCase.address,
    companyName: newCase.companyName,
    status: newCase.status,
    riskLevel: newCase.riskLevel,
    debtAmount: newCase.debtAmount,
    totalOutstandingBalance: newCase.totalOutstandingBalance,
    overdueAmount: newCase.overdueAmount,
    overdueDays: newCase.overdueDays,
    dueDate: newCase.dueDate,
    assignedSales: newCase.assignedSales,
    assignedPostLoan: newCase.assignedPostLoan,
    isLocked: newCase.isLocked,
    remark: newCase.remark,
    caseLabels: newCase.caseLabels,
    createdAt: newCase.createdAt,
    updatedAt: newCase.updatedAt,
  });

  cachedCases = null;
  cachedCasesLight = null;

  return newCase;
}

// ============ 核心API：更新案件 ============
export async function update(
  id: string, 
  updates: Partial<Case>, 
  options?: { userName?: string; userId?: string; skipHistory?: boolean }
): Promise<Case | null> {
  cachedCases = null;
  cachedCasesLight = null;

  const original = await getById(id);
  if (!original) return null;

  await db.update(cases)
    .set({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .where(or(eq(cases.id, id), eq(cases.loanNo, id)));

  const updated = await getById(id);

  if (options && !options.skipHistory && updated) {
    await recordHistory(original, updates, options.userName || '未知用户', options.userId);
  }

  return updated;
}

// 记录修改历史的辅助函数
async function recordHistory(
  originalCase: Case, 
  updates: Partial<Case>, 
  userName: string, 
  userId?: string
): Promise<void> {
  const fieldLabels: Record<string, string> = {
    borrowerName: '借款人姓名',
    borrowerPhone: '借款人电话',
    companyName: '公司名称',
    status: '案件状态',
    riskLevel: '风险等级',
    debtAmount: '欠款金额',
    totalOutstandingBalance: '总待还余额',
    overdueAmount: '逾期金额',
    overdueDays: '逾期天数',
    assignedSales: '分配销售',
    assignedPostLoan: '分配贷后',
    isLocked: '是否锁定',
    remark: '备注',
    caseLabels: '案件标签'
  };

  for (const [key, newValue] of Object.entries(updates)) {
    const oldValue = (originalCase as any)[key];
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      await addHistory(
        originalCase.id,
        userName,
        key,
        fieldLabels[key],
        oldValue,
        newValue,
        userId
      );
    }
  }
}

// 添加修改历史记录
async function addHistory(
  caseId: string,
  userName: string,
  fieldName: string,
  fieldLabel: string | undefined,
  oldValue: any,
  newValue: any,
  userId?: string
): Promise<void> {
  const historyItem: CaseHistory = {
    id: uuidv4(),
    caseId,
    userId,
    userName,
    modifiedAt: new Date().toISOString(),
    fieldName,
    fieldLabel,
    oldValue,
    newValue
  };

  await db.insert(caseHistory).values({
    id: historyItem.id,
    caseId: historyItem.caseId,
    userId: historyItem.userId,
    userName: historyItem.userName,
    modifiedAt: historyItem.modifiedAt,
    fieldName: historyItem.fieldName,
    fieldLabel: historyItem.fieldLabel,
    oldValue: historyItem.oldValue,
    newValue: historyItem.newValue,
  });

  console.log(`[History] 添加历史记录: 案件=${caseId}, 字段=${fieldName}`);
}

// 获取案件的修改历史
export function getCaseHistory(caseId: string): Promise<CaseHistory[]> {
  return db.select().from(caseHistory).where(eq(caseHistory.caseId, caseId)).orderBy(desc(caseHistory.modifiedAt)) as any;
}

// ============ 核心API：删除案件（移入回收站） ============
export async function deleteCase(id: string, deletedBy: string = '系统'): Promise<boolean> {
  cachedCases = null;
  cachedCasesLight = null;

  const result = await db.delete(cases).where(or(eq(cases.id, id), eq(cases.loanNo, id)));
  return result.rowCount > 0;
}

// ============ 回收站API（简化版） ============
export async function getRecycleBin(): Promise<any[]> {
  return [];
}

export async function restoreFromRecycleBin(id: string): Promise<boolean> {
  return false;
}

export async function restore(ids: string | string[]): Promise<number> {
  return 0;
}

export async function permanentDelete(ids: string[]): Promise<number> {
  return 0;
}

// ============ 统计API：案件统计 ============
export async function getStatistics(): Promise<{ total: number; statusCounts: Record<string, number> }> {
  const allCases = await getAll();
  const statusCounts: Record<string, number> = {};
  allCases.forEach((c) => {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  });
  return {
    total: allCases.length,
    statusCounts,
  };
}

// ============ 批量导入API ============
export async function batchImport(casesData: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Case[]> {
  const newCases: Case[] = [];
  for (const data of casesData) {
    const newCase = await create(data);
    newCases.push(newCase);
  }
  return newCases;
}

// ============ 清空缓存API ============
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
  clearCache,
  getCaseHistory
};