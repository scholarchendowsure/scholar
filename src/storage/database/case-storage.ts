import { Case, FollowUp, CaseFile, CaseHistory } from '@/types/case';
import { db } from '@/lib/db/client';
import { cases, followups, caseFiles, caseHistory } from './shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// 内存缓存
let cachedCases: Case[] | null = null;
let lastModifiedTime: number = 0;

// 生成唯一ID
function generateId(): string {
  return uuidv4();
}

// 获取当前时间字符串
function getCurrentTime(): string {
  return new Date().toISOString();
}

// 从数据库读取所有案件
async function readFromDatabase(): Promise<Case[]> {
  const dbCases = await db.select().from(cases).orderBy(desc(cases.createdAt));
  
  const result: Case[] = [];
  
  for (const dbCase of dbCases) {
    // 获取跟进记录
    const dbFollowups = await db.select().from(followups).where(eq(followups.caseId, dbCase.id)).orderBy(desc(followups.followTime));
    
    // 获取案件文件
    const dbCaseFiles = await db.select().from(caseFiles).where(eq(caseFiles.caseId, dbCase.id)).orderBy(desc(caseFiles.createdAt));
    
    // 转换为Case类型
    const caseData: Case = {
      id: dbCase.id,
      batchNo: dbCase.batchNo,
      loanNo: dbCase.loanNo,
      userId: dbCase.userId,
      borrowerName: dbCase.borrowerName,
      productName: dbCase.productName ?? undefined,
      platform: dbCase.platform ?? undefined,
      paymentCompany: dbCase.paymentCompany ?? undefined,
      funder: dbCase.funder ?? undefined,
      fundCategory: dbCase.fundCategory ?? undefined,
      category: dbCase.category ?? undefined,
      overdueStage: dbCase.overdueStage ?? undefined,
      status: dbCase.status,
      loanStatus: dbCase.loanStatus ?? undefined,
      isLocked: dbCase.isLocked ?? undefined,
      fiveLevelClassification: dbCase.fiveLevelClassification ?? undefined,
      riskLevel: dbCase.riskLevel ?? undefined,
      isExtended: dbCase.isExtended ?? undefined,
      currency: dbCase.currency ?? undefined,
      loanAmount: dbCase.loanAmount ? Number(dbCase.loanAmount) : undefined,
      totalLoanAmount: dbCase.totalLoanAmount ? Number(dbCase.totalLoanAmount) : undefined,
      totalOutstandingBalance: dbCase.totalOutstandingBalance ? Number(dbCase.totalOutstandingBalance) : 0,
      totalRepaidAmount: dbCase.totalRepaidAmount ? Number(dbCase.totalRepaidAmount) : undefined,
      outstandingBalance: dbCase.outstandingBalance ? Number(dbCase.outstandingBalance) : undefined,
      overdueAmount: dbCase.overdueAmount ? Number(dbCase.overdueAmount) : 0,
      overduePrincipal: dbCase.overduePrincipal ? Number(dbCase.overduePrincipal) : undefined,
      overdueInterest: dbCase.overdueInterest ? Number(dbCase.overdueInterest) : undefined,
      repaidAmount: dbCase.repaidAmount ? Number(dbCase.repaidAmount) : undefined,
      repaidPrincipal: dbCase.repaidPrincipal ? Number(dbCase.repaidPrincipal) : undefined,
      repaidInterest: dbCase.repaidInterest ? Number(dbCase.repaidInterest) : undefined,
      compensationAmount: dbCase.compensationAmount ? Number(dbCase.compensationAmount) : undefined,
      loanTerm: dbCase.loanTerm ?? undefined,
      loanTermUnit: dbCase.loanTermUnit ?? undefined,
      loanDate: dbCase.loanDate ?? undefined,
      dueDate: dbCase.dueDate ?? undefined,
      overdueDays: dbCase.overdueDays ?? 0,
      overdueStartTime: dbCase.overdueStartTime ?? undefined,
      firstOverdueTime: dbCase.firstOverdueTime ?? undefined,
      compensationDate: dbCase.compensationDate ?? undefined,
      companyName: dbCase.companyName ?? undefined,
      companyAddress: dbCase.companyAddress ?? undefined,
      homeAddress: dbCase.homeAddress ?? undefined,
      householdAddress: dbCase.householdAddress ?? undefined,
      borrowerPhone: dbCase.borrowerPhone ?? undefined,
      registeredPhone: dbCase.registeredPhone ?? undefined,
      contactInfo: dbCase.contactInfo ?? undefined,
      assignedSales: dbCase.assignedSales ?? undefined,
      assignedRiskControl: dbCase.assignedRiskControl ?? undefined,
      assignedPostLoan: dbCase.assignedPostLoan ?? undefined,
      assigneeName: dbCase.assigneeName ?? undefined,
      createdAt: dbCase.createdAt.toISOString(),
      updatedAt: dbCase.updatedAt.toISOString(),
      followups: dbFollowups.map(fu => ({
        id: fu.id,
        follower: fu.follower,
        followTime: fu.followTime,
        followType: fu.followType as 'online' | 'offline' | 'other',
        contact: fu.contact as 'legal_representative' | 'actual_controller' | 'other',
        followResult: fu.followResult as 'normal_repayment' | 'warning_rise' | 'overdue_promise' | 'other',
        followRecord: fu.followRecord,
        fileInfo: fu.fileInfo as (string | CaseFile)[],
        createdAt: fu.createdAt.toISOString(),
        createdBy: fu.createdBy,
      })),
      files: dbCaseFiles.map(cf => ({
        id: cf.id,
        name: cf.name,
        type: cf.type as 'image' | 'document' | 'other',
        url: cf.url ?? undefined,
        data: cf.data ?? undefined,
        uploadTime: cf.uploadTime,
        uploadBy: cf.uploadBy,
      })),
    };
    
    result.push(caseData);
  }
  
  return result;
}

// 写入数据库
async function writeToDatabase(caseData: Case[]): Promise<void> {
  // 删除所有旧数据
  await db.delete(caseHistory);
  await db.delete(caseFiles);
  await db.delete(followups);
  await db.delete(cases);
  
  // 插入新数据
  for (const c of caseData) {
    // 插入案件
    await db.insert(cases).values({
      id: c.id,
      batchNo: c.batchNo,
      loanNo: c.loanNo,
      userId: c.userId,
      borrowerName: c.borrowerName,
      productName: c.productName ?? null,
      platform: c.platform ?? null,
      paymentCompany: c.paymentCompany ?? null,
      funder: c.funder ?? null,
      fundCategory: c.fundCategory ?? null,
      category: c.category ?? null,
      overdueStage: c.overdueStage ?? null,
      status: c.status,
      loanStatus: c.loanStatus ?? null,
      isLocked: c.isLocked ?? null,
      fiveLevelClassification: c.fiveLevelClassification ?? null,
      riskLevel: c.riskLevel ?? null,
      isExtended: c.isExtended ?? null,
      currency: c.currency ?? null,
      loanAmount: c.loanAmount ? String(c.loanAmount) : null,
      totalLoanAmount: c.totalLoanAmount ? String(c.totalLoanAmount) : null,
      totalOutstandingBalance: String(c.totalOutstandingBalance),
      totalRepaidAmount: c.totalRepaidAmount ? String(c.totalRepaidAmount) : null,
      outstandingBalance: c.outstandingBalance ? String(c.outstandingBalance) : null,
      overdueAmount: String(c.overdueAmount),
      overduePrincipal: c.overduePrincipal ? String(c.overduePrincipal) : null,
      overdueInterest: c.overdueInterest ? String(c.overdueInterest) : null,
      repaidAmount: c.repaidAmount ? String(c.repaidAmount) : null,
      repaidPrincipal: c.repaidPrincipal ? String(c.repaidPrincipal) : null,
      repaidInterest: c.repaidInterest ? String(c.repaidInterest) : null,
      compensationAmount: c.compensationAmount ? String(c.compensationAmount) : null,
      loanTerm: c.loanTerm ?? null,
      loanTermUnit: c.loanTermUnit ?? null,
      loanDate: c.loanDate ?? null,
      dueDate: c.dueDate ?? null,
      overdueDays: c.overdueDays,
      overdueStartTime: c.overdueStartTime ?? null,
      firstOverdueTime: c.firstOverdueTime ?? null,
      compensationDate: c.compensationDate ?? null,
      companyName: c.companyName ?? null,
      companyAddress: c.companyAddress ?? null,
      homeAddress: c.homeAddress ?? null,
      householdAddress: c.householdAddress ?? null,
      borrowerPhone: c.borrowerPhone ?? null,
      registeredPhone: c.registeredPhone ?? null,
      contactInfo: c.contactInfo ?? null,
      assignedSales: c.assignedSales ?? null,
      assignedRiskControl: c.assignedRiskControl ?? null,
      assignedPostLoan: c.assignedPostLoan ?? null,
      assigneeName: c.assigneeName ?? null,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    });
    
    // 插入跟进记录
    if (c.followups) {
      for (const fu of c.followups) {
        await db.insert(followups).values({
          id: fu.id,
          caseId: c.id,
          follower: fu.follower,
          followTime: fu.followTime,
          followType: fu.followType,
          contact: fu.contact,
          followResult: fu.followResult,
          followRecord: fu.followRecord,
          fileInfo: fu.fileInfo as any,
          createdAt: new Date(fu.createdAt),
          createdBy: fu.createdBy,
        });
      }
    }
    
    // 插入文件
    if (c.files) {
      for (const cf of c.files) {
        await db.insert(caseFiles).values({
          id: cf.id,
          caseId: c.id,
          followupId: null,
          name: cf.name,
          type: cf.type,
          url: cf.url ?? null,
          data: cf.data ?? null,
          uploadTime: cf.uploadTime,
          uploadBy: cf.uploadBy,
          createdAt: new Date(),
        });
      }
    }
  }
}

// 获取所有案件
export async function getAll(): Promise<Case[]> {
  try {
    if (cachedCases) {
      return cachedCases;
    }
    
    const cases = await readFromDatabase();
    cachedCases = cases;
    lastModifiedTime = Date.now();
    return cases;
  } catch (error) {
    console.error('[caseStorage] 获取所有案件失败:', error);
    return [];
  }
}

// 根据ID获取案件
export async function getById(id: string): Promise<Case | null> {
  try {
    const allCases = await getAll();
    return allCases.find(c => c.id === id) || null;
  } catch (error) {
    console.error('[caseStorage] 获取案件失败:', error);
    return null;
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
    
    const allCases = await getAll();
    allCases.unshift(newCase);
    await writeToDatabase(allCases);
    cachedCases = allCases;
    lastModifiedTime = Date.now();
    
    return newCase;
  } catch (error) {
    console.error('[caseStorage] 创建案件失败:', error);
    throw error;
  }
}

// 更新案件
export async function update(id: string, updates: Partial<Case>, userId?: string, userName?: string): Promise<Case | null> {
  try {
    const allCases = await getAll();
    const index = allCases.findIndex(c => c.id === id);
    
    if (index === -1) {
      return null;
    }
    
    const oldCase = { ...allCases[index] };
    const updatedCase: Case = {
      ...oldCase,
      ...updates,
      id: oldCase.id,
      createdAt: oldCase.createdAt,
      updatedAt: getCurrentTime(),
    };
    
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
              modifiedAt: history.modifiedAt,
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
    
    allCases[index] = updatedCase;
    await writeToDatabase(allCases);
    cachedCases = allCases;
    lastModifiedTime = Date.now();
    
    return updatedCase;
  } catch (error) {
    console.error('[caseStorage] 更新案件失败:', error);
    throw error;
  }
}

// 删除案件
export async function remove(id: string): Promise<boolean> {
  try {
    const allCases = await getAll();
    const index = allCases.findIndex(c => c.id === id);
    
    if (index === -1) {
      return false;
    }
    
    allCases.splice(index, 1);
    await writeToDatabase(allCases);
    cachedCases = allCases;
    lastModifiedTime = Date.now();
    
    return true;
  } catch (error) {
    console.error('[caseStorage] 删除案件失败:', error);
    return false;
  }
}

// 添加跟进记录
export async function addFollowup(caseId: string, followup: Omit<FollowUp, 'id' | 'createdAt'>): Promise<FollowUp> {
  try {
    const allCases = await getAll();
    const caseIndex = allCases.findIndex(c => c.id === caseId);
    
    if (caseIndex === -1) {
      throw new Error('案件不存在');
    }
    
    const newFollowup: FollowUp = {
      ...followup,
      id: generateId(),
      createdAt: getCurrentTime(),
    };
    
    if (!allCases[caseIndex].followups) {
      allCases[caseIndex].followups = [];
    }
    
    allCases[caseIndex].followups!.unshift(newFollowup);
    allCases[caseIndex].updatedAt = getCurrentTime();
    
    await writeToDatabase(allCases);
    cachedCases = allCases;
    lastModifiedTime = Date.now();
    
    return newFollowup;
  } catch (error) {
    console.error('[caseStorage] 添加跟进记录失败:', error);
    throw error;
  }
}

// 添加文件
export async function addFile(caseId: string, file: Omit<CaseFile, 'id'>): Promise<CaseFile> {
  try {
    const allCases = await getAll();
    const caseIndex = allCases.findIndex(c => c.id === caseId);
    
    if (caseIndex === -1) {
      throw new Error('案件不存在');
    }
    
    const newFile: CaseFile = {
      ...file,
      id: generateId(),
    };
    
    if (!allCases[caseIndex].files) {
      allCases[caseIndex].files = [];
    }
    
    allCases[caseIndex].files!.unshift(newFile);
    allCases[caseIndex].updatedAt = getCurrentTime();
    
    await writeToDatabase(allCases);
    cachedCases = allCases;
    lastModifiedTime = Date.now();
    
    return newFile;
  } catch (error) {
    console.error('[caseStorage] 添加文件失败:', error);
    throw error;
  }
}

// 批量创建案件
export async function batchCreate(casesData: Array<Omit<Case, 'id' | 'createdAt' | 'updatedAt' | 'followups' | 'files'>>): Promise<Case[]> {
  try {
    const allCases = await getAll();
    const newCases: Case[] = [];
    
    for (const caseData of casesData) {
      const newCase: Case = {
        ...caseData,
        id: generateId(),
        createdAt: getCurrentTime(),
        updatedAt: getCurrentTime(),
        followups: [],
        files: [],
      };
      newCases.push(newCase);
      allCases.unshift(newCase);
    }
    
    await writeToDatabase(allCases);
    cachedCases = allCases;
    lastModifiedTime = Date.now();
    
    return newCases;
  } catch (error) {
    console.error('[caseStorage] 批量创建案件失败:', error);
    throw error;
  }
}

// 获取案件历史记录
export async function getHistory(caseId: string): Promise<CaseHistory[]> {
  try {
    const historyRecords = await db.select().from(caseHistory).where(eq(caseHistory.caseId, caseId)).orderBy(desc(caseHistory.modifiedAt));
    
    return historyRecords.map(h => ({
      id: h.id,
      caseId: h.caseId,
      userId: h.userId ?? undefined,
      userName: h.userName,
      modifiedAt: h.modifiedAt,
      fieldName: h.fieldName,
      fieldLabel: h.fieldLabel ?? undefined,
      oldValue: h.oldValue,
      newValue: h.newValue,
    }));
  } catch (error) {
    console.error('[caseStorage] 获取案件历史失败:', error);
    return [];
  }
}

// 清空缓存
export function clearCache(): void {
  cachedCases = null;
  lastModifiedTime = 0;
}

// 导出函数
export default {
  getAll,
  getById,
  create,
  update,
  delete: remove,
  addFollowup,
  addFile,
  batchCreate,
  getHistory,
  clearCache,
};

// 剥离大字段（base64文件数据），用于API返回时减小数据量
export function stripLargeFields(caseData: Case): Case {
  const result: Case = { ...caseData };
  
  // 剥离files中的data字段（base64文件数据）
  if (result.files && result.files.length > 0) {
    result.files = result.files.map(file => {
      const { data, ...rest } = file;
      return rest;
    });
  }
  
  // 剥离followups中的fileInfo大字段
  if (result.followups && result.followups.length > 0) {
    result.followups = result.followups.map(fu => {
      if (fu.fileInfo && Array.isArray(fu.fileInfo)) {
        // 对fileInfo中的每个元素，如果是对象且有data字段，剥离data
        return {
          ...fu,
          fileInfo: fu.fileInfo.map(item => {
            if (typeof item === 'object' && item !== null && 'data' in item) {
              const { data, ...rest } = item as any;
              return rest;
            }
            return item;
          })
        };
      }
      return fu;
    });
  }
  
  return result;
}
