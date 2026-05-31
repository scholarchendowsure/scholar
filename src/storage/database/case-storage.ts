import { db } from '@/lib/db/client';
import { cases, followups, caseFiles, caseHistory } from './shared/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import type { Case, FollowUp, CaseFile, CaseHistory } from '@/types/case';

// 内存缓存
let cachedCases: Case[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 5000; // 5秒缓存

// 生成唯一ID
function generateId(): string {
  return 'case_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 获取当前时间字符串
function getCurrentTime(): string {
  return new Date().toISOString();
}

// 转换数据库案件到类型
function dbCaseToCase(dbCase: any): Case {
  return {
    id: dbCase.id,
    batchNo: dbCase.batchNo,
    loanNo: dbCase.loanNo,
    userId: dbCase.userId,
    borrowerName: dbCase.borrowerName,
    status: dbCase.status,
    totalOutstandingBalance: dbCase.totalOutstandingBalance,
    overdueAmount: dbCase.overdueAmount,
    overdueDays: dbCase.overdueDays,
    productName: dbCase.productName,
    funder: dbCase.funder,
    fundCategory: dbCase.fundCategory,
    isExtended: dbCase.isExtended,
    currency: dbCase.currency,
    loanAmount: dbCase.loanAmount,
    outstandingBalance: dbCase.outstandingBalance,
    loanTerm: dbCase.loanTerm,
    loanTermUnit: dbCase.loanTermUnit,
    loanDate: dbCase.loanDate,
    dueDate: dbCase.dueDate,
    companyName: dbCase.companyName,
    borrowerPhone: dbCase.borrowerPhone,
    assignedSales: dbCase.assignedSales,
    assignedPostLoan: dbCase.assignedPostLoan,
    createdAt: dbCase.createdAt.toISOString(),
    updatedAt: dbCase.updatedAt.toISOString(),
    followups: [],
    files: []
  };
}

// 转换类型案件到数据库
function caseToDbCase(caseData: Case): any {
  return {
    id: caseData.id,
    batchNo: caseData.batchNo,
    loanNo: caseData.loanNo,
    userId: caseData.userId,
    borrowerName: caseData.borrowerName,
    status: caseData.status,
    totalOutstandingBalance: caseData.totalOutstandingBalance,
    overdueAmount: caseData.overdueAmount,
    overdueDays: caseData.overdueDays,
    productName: caseData.productName,
    funder: caseData.funder,
    fundCategory: caseData.fundCategory,
    isExtended: caseData.isExtended,
    currency: caseData.currency,
    loanAmount: caseData.loanAmount,
    outstandingBalance: caseData.outstandingBalance,
    loanTerm: caseData.loanTerm,
    loanTermUnit: caseData.loanTermUnit,
    loanDate: caseData.loanDate,
    dueDate: caseData.dueDate,
    companyName: caseData.companyName,
    borrowerPhone: caseData.borrowerPhone,
    assignedSales: caseData.assignedSales,
    assignedPostLoan: caseData.assignedPostLoan,
    createdAt: new Date(caseData.createdAt),
    updatedAt: new Date(caseData.updatedAt)
  };
}

// 转换数据库跟进到类型
function dbFollowupToFollowup(dbFollowup: any): FollowUp {
  return {
    id: dbFollowup.id,
    caseId: dbFollowup.caseId,
    userId: dbFollowup.userId,
    userName: dbFollowup.userName,
    content: dbFollowup.content,
    type: dbFollowup.type,
    createdAt: dbFollowup.createdAt.toISOString(),
    files: [],
    location: dbFollowup.location,
    duration: dbFollowup.duration,
    nextFollowUpDate: dbFollowup.nextFollowUpDate
  };
}

// 转换类型跟进到数据库
function followupToDbFollowup(followup: FollowUp): any {
  return {
    id: followup.id,
    caseId: followup.caseId,
    userId: followup.userId,
    userName: followup.userName,
    content: followup.content,
    type: followup.type,
    createdAt: new Date(followup.createdAt),
    location: followup.location,
    duration: followup.duration,
    nextFollowUpDate: followup.nextFollowUpDate
  };
}

// 转换数据库文件到类型
function dbFileToFile(dbFile: any): CaseFile {
  return {
    id: dbFile.id,
    caseId: dbFile.caseId,
    followUpId: dbFile.followUpId,
    fileName: dbFile.fileName,
    fileType: dbFile.fileType,
    fileSize: dbFile.fileSize,
    url: dbFile.url,
    data: dbFile.data,
    uploadedAt: dbFile.uploadedAt.toISOString(),
    uploadedBy: dbFile.uploadedBy,
    uploadedByName: dbFile.uploadedByName
  };
}

// 转换类型文件到数据库
function fileToDbFile(file: CaseFile): any {
  return {
    id: file.id,
    caseId: file.caseId,
    followUpId: file.followUpId,
    fileName: file.fileName,
    fileType: file.fileType,
    fileSize: file.fileSize,
    url: file.url,
    data: file.data,
    uploadedAt: new Date(file.uploadedAt),
    uploadedBy: file.uploadedBy,
    uploadedByName: file.uploadedByName
  };
}

// 获取所有案件
export async function getAll(): Promise<Case[]> {
  try {
    const now = Date.now();
    
    // 如果缓存有效，直接返回缓存
    if (cachedCases && (now - lastFetchTime < CACHE_TTL)) {
      return cachedCases;
    }
    
    // 从数据库获取所有案件
    const dbCases = await db.select().from(cases).orderBy(desc(cases.createdAt));
    
    // 获取所有跟进记录
    const dbFollowups = await db.select().from(followups);
    
    // 获取所有文件
    const dbFiles = await db.select().from(caseFiles);
    
    // 构建案件对象
    const result: Case[] = dbCases.map(dbCase => {
      const caseItem = dbCaseToCase(dbCase);
      
      // 添加该案件的跟进记录
      caseItem.followups = dbFollowups
        .filter(f => f.caseId === caseItem.id)
        .map(dbFollowupToFollowup)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // 添加文件到跟进记录
      for (const followup of caseItem.followups) {
        followup.files = dbFiles
          .filter(f => f.followUpId === followup.id)
          .map(dbFileToFile);
      }
      
      // 添加案件级别的文件
      caseItem.files = dbFiles
        .filter(f => f.caseId === caseItem.id && !f.followUpId)
        .map(dbFileToFile);
      
      return caseItem;
    });
    
    // 更新缓存
    cachedCases = result;
    lastFetchTime = now;
    
    return result;
  } catch (error) {
    console.error('[caseStorage] 获取所有案件失败:', error);
    throw error;
  }
}

// 根据ID获取案件
export async function getById(id: string, includeFiles = true): Promise<Case | null> {
  try {
    // 从数据库获取案件
    const [dbCase] = await db.select().from(cases).where(eq(cases.id, id));
    
    if (!dbCase) {
      return null;
    }
    
    const result = dbCaseToCase(dbCase);
    
    // 获取跟进记录
    const dbFollowups = await db.select().from(followups).where(eq(followups.caseId, id)).orderBy(desc(followups.createdAt));
    result.followups = dbFollowups.map(dbFollowupToFollowup);
    
    // 获取文件
    if (includeFiles) {
      const dbFiles = await db.select().from(caseFiles).where(eq(caseFiles.caseId, id));
      
      // 添加文件到跟进记录
      for (const followup of result.followups) {
        followup.files = dbFiles
          .filter(f => f.followUpId === followup.id)
          .map(dbFileToFile);
      }
      
      // 添加案件级别的文件
      result.files = dbFiles
        .filter(f => !f.followUpId)
        .map(dbFileToFile);
    }
    
    return result;
  } catch (error) {
    console.error('[caseStorage] 获取案件失败:', error);
    throw error;
  }
}

// 创建案件
export async function create(caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt' | 'followups' | 'files'>): Promise<Case> {
  try {
    const newCase: Case = {
      ...caseData,
      id: generateId(),
      createdAt: getCurrentTime(),
      updatedAt: getCurrentTime(),
      followups: [],
      files: [],
    };
    
    // 插入数据库
    await db.insert(cases).values(caseToDbCase(newCase));
    
    // 清除缓存
    cachedCases = null;
    
    return newCase;
  } catch (error) {
    console.error('[caseStorage] 创建案件失败:', error);
    throw error;
  }
}

// 更新案件
export async function update(id: string, updates: Partial<Case>, userId?: string, userName?: string): Promise<Case | null> {
  try {
    // 获取原案件
    const oldCase = await getById(id, false);
    if (!oldCase) {
      return null;
    }
    
    const updatedCase: Case = {
      ...oldCase,
      ...updates,
      id: oldCase.id,
      createdAt: oldCase.createdAt,
      updatedAt: getCurrentTime(),
    };
    
    // 更新数据库
    await db.update(cases)
      .set({
        ...caseToDbCase(updatedCase),
        updatedAt: new Date(updatedCase.updatedAt)
      })
      .where(eq(cases.id, id));
    
    // 记录修改历史
    if (userId && userName) {
      for (const [key, value] of Object.entries(updates)) {
        if (key !== 'updatedAt' && key !== 'followups' && key !== 'files') {
          const oldValue = (oldCase as any)[key];
          if (oldValue !== value) {
            const history: CaseHistory = {
              id: generateId(),
              caseId: id,
              userId,
              userName,
              modifiedAt: getCurrentTime(),
              fieldName: key,
              oldValue,
              newValue: value,
            };
            
            await db.insert(caseHistory).values({
              id: history.id,
              caseId: history.caseId,
              userId: history.userId ?? null,
              userName: history.userName,
              modifiedAt: new Date(history.modifiedAt),
              fieldName: history.fieldName,
              fieldLabel: history.fieldLabel ?? null,
              oldValue: history.oldValue as any,
              newValue: history.newValue as any,
              createdAt: new Date(),
            });
          }
        }
      }
    }
    
    // 清除缓存
    cachedCases = null;
    
    return updatedCase;
  } catch (error) {
    console.error('[caseStorage] 更新案件失败:', error);
    throw error;
  }
}

// 删除案件
export async function remove(id: string): Promise<boolean> {
  try {
    // 删除相关的跟进记录
    await db.delete(followups).where(eq(followups.caseId, id));
    
    // 删除相关的文件
    await db.delete(caseFiles).where(eq(caseFiles.caseId, id));
    
    // 删除相关的历史记录
    await db.delete(caseHistory).where(eq(caseHistory.caseId, id));
    
    // 删除案件
    const result = await db.delete(cases).where(eq(cases.id, id));
    
    // 清除缓存
    cachedCases = null;
    
    return (result as any).rowCount > 0;
  } catch (error) {
    console.error('[caseStorage] 删除案件失败:', error);
    throw error;
  }
}

// 添加跟进记录
export async function addFollowup(caseId: string, followupData: Omit<FollowUp, 'id' | 'caseId' | 'createdAt' | 'files'>): Promise<FollowUp> {
  try {
    const newFollowup: FollowUp = {
      ...followupData,
      id: generateId(),
      caseId,
      createdAt: getCurrentTime(),
      files: [],
    };
    
    // 插入数据库
    await db.insert(followups).values(followupToDbFollowup(newFollowup));
    
    // 更新案件的updatedAt
    await db.update(cases)
      .set({ updatedAt: new Date() })
      .where(eq(cases.id, caseId));
    
    // 清除缓存
    cachedCases = null;
    
    return newFollowup;
  } catch (error) {
    console.error('[caseStorage] 添加跟进记录失败:', error);
    throw error;
  }
}

// 更新跟进记录
export async function updateFollowup(followupId: string, updates: Partial<FollowUp>): Promise<FollowUp | null> {
  try {
    // 获取原跟进记录
    const [dbFollowup] = await db.select().from(followups).where(eq(followups.id, followupId));
    if (!dbFollowup) {
      return null;
    }
    
    const oldFollowup = dbFollowupToFollowup(dbFollowup);
    
    const updatedFollowup: FollowUp = {
      ...oldFollowup,
      ...updates,
      id: oldFollowup.id,
      caseId: oldFollowup.caseId,
      createdAt: oldFollowup.createdAt,
    };
    
    // 更新数据库
    await db.update(followups)
      .set(followupToDbFollowup(updatedFollowup))
      .where(eq(followups.id, followupId));
    
    // 更新案件的updatedAt
    await db.update(cases)
      .set({ updatedAt: new Date() })
      .where(eq(cases.id, updatedFollowup.caseId));
    
    // 清除缓存
    cachedCases = null;
    
    return updatedFollowup;
  } catch (error) {
    console.error('[caseStorage] 更新跟进记录失败:', error);
    throw error;
  }
}

// 删除跟进记录
export async function removeFollowup(followupId: string): Promise<boolean> {
  try {
    // 获取跟进记录的案件ID
    const [dbFollowup] = await db.select().from(followups).where(eq(followups.id, followupId));
    if (!dbFollowup) {
      return false;
    }
    
    // 删除相关的文件
    await db.delete(caseFiles).where(eq(caseFiles.followUpId, followupId));
    
    // 删除跟进记录
    const result = await db.delete(followups).where(eq(followups.id, followupId));
    
    // 更新案件的updatedAt
    await db.update(cases)
      .set({ updatedAt: new Date() })
      .where(eq(cases.id, dbFollowup.caseId));
    
    // 清除缓存
    cachedCases = null;
    
    return (result as any).rowCount > 0;
  } catch (error) {
    console.error('[caseStorage] 删除跟进记录失败:', error);
    throw error;
  }
}

// 添加文件
export async function addFile(caseId: string, fileData: Omit<CaseFile, 'id' | 'caseId' | 'uploadedAt'>, followUpId?: string): Promise<CaseFile> {
  try {
    const newFile: CaseFile = {
      ...fileData,
      id: generateId(),
      caseId,
      followUpId: followUpId || null,
      uploadedAt: getCurrentTime(),
    };
    
    // 插入数据库
    await db.insert(caseFiles).values(fileToDbFile(newFile));
    
    // 更新案件的updatedAt
    await db.update(cases)
      .set({ updatedAt: new Date() })
      .where(eq(cases.id, caseId));
    
    // 清除缓存
    cachedCases = null;
    
    return newFile;
  } catch (error) {
    console.error('[caseStorage] 添加文件失败:', error);
    throw error;
  }
}

// 删除文件
export async function removeFile(fileId: string): Promise<boolean> {
  try {
    // 获取文件的案件ID
    const [dbFile] = await db.select().from(caseFiles).where(eq(caseFiles.id, fileId));
    if (!dbFile) {
      return false;
    }
    
    // 删除文件
    const result = await db.delete(caseFiles).where(eq(caseFiles.id, fileId));
    
    // 更新案件的updatedAt
    await db.update(cases)
      .set({ updatedAt: new Date() })
      .where(eq(cases.id, dbFile.caseId));
    
    // 清除缓存
    cachedCases = null;
    
    return (result as any).rowCount > 0;
  } catch (error) {
    console.error('[caseStorage] 删除文件失败:', error);
    throw error;
  }
}

// 获取修改历史
export async function getHistory(caseId: string): Promise<CaseHistory[]> {
  try {
    const dbHistories = await db.select()
      .from(caseHistory)
      .where(eq(caseHistory.caseId, caseId))
      .orderBy(desc(caseHistory.modifiedAt));
    
    return dbHistories.map(h => ({
      id: h.id,
      caseId: h.caseId,
      userId: h.userId ?? undefined,
      userName: h.userName,
      modifiedAt: h.modifiedAt.toISOString(),
      fieldName: h.fieldName,
      fieldLabel: h.fieldLabel ?? undefined,
      oldValue: h.oldValue,
      newValue: h.newValue
    }));
  } catch (error) {
    console.error('[caseStorage] 获取修改历史失败:', error);
    throw error;
  }
}

// 批量更新案件
export async function batchUpdate(ids: string[], updates: Partial<Case>, userId?: string, userName?: string): Promise<number> {
  try {
    if (ids.length === 0) {
      return 0;
    }
    
    let count = 0;
    
    for (const id of ids) {
      const result = await update(id, updates, userId, userName);
      if (result) {
        count++;
      }
    }
    
    return count;
  } catch (error) {
    console.error('[caseStorage] 批量更新案件失败:', error);
    throw error;
  }
}

// 批量删除案件
export async function batchDelete(ids: string[]): Promise<number> {
  try {
    if (ids.length === 0) {
      return 0;
    }
    
    let count = 0;
    
    for (const id of ids) {
      const result = await remove(id);
      if (result) {
        count++;
      }
    }
    
    return count;
  } catch (error) {
    console.error('[caseStorage] 批量删除案件失败:', error);
    throw error;
  }
}

// 清空缓存
export function clearCache(): void {
  cachedCases = null;
  lastFetchTime = 0;
}

// 剥离大字段（用于列表API，减少数据传输）
export function stripLargeFields(caseData: Case): Case {
  return {
    ...caseData,
    followups: caseData.followups.map(f => ({
      ...f,
      files: f.files.map(file => ({
        ...file,
        data: file.data && file.data.length > 100 ? '[stripped]' : file.data
      }))
    })),
    files: caseData.files.map(file => ({
      ...file,
      data: file.data && file.data.length > 100 ? '[stripped]' : file.data
    }))
  };
}
