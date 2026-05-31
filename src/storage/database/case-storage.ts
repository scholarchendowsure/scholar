import { db } from '@/lib/db/client';
import { cases, followups, caseFiles, caseHistory } from './shared/schema';
import { eq, and, like, or, desc, isNull, isNotNull, count, sql } from 'drizzle-orm';
import type { Case as DBCase, FollowUp as DBFollowUp, CaseFile as DBCaseFile, CaseHistory as DBCaseHistory } from './shared/schema';
import type { Case, FollowUp, CaseFile, CaseHistory } from '@/types/case';
import { v4 as uuidv4 } from 'uuid';

// 缓存
let cachedCases: Case[] | null = null;
let lastModifiedTime: number = 0;
const CACHE_TTL = 5000; // 5秒缓存

// ============= 类型转换函数 =============

function convertDBCaseToCase(dbCase: DBCase, dbFollowUps?: DBFollowUp[], dbFiles?: DBCaseFile[], dbHistory?: DBCaseHistory[]): Case {
  return {
    id: dbCase.id,
    batchNo: dbCase.batchNo ?? undefined,
    loanNo: dbCase.loanNo ?? undefined,
    userId: dbCase.userId ?? undefined,
    borrowerName: dbCase.borrowerName ?? undefined,
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
    totalOutstandingBalance: Number(dbCase.totalOutstandingBalance),
    totalRepaidAmount: dbCase.totalRepaidAmount ? Number(dbCase.totalRepaidAmount) : undefined,
    outstandingBalance: dbCase.outstandingBalance ? Number(dbCase.outstandingBalance) : undefined,
    overdueAmount: Number(dbCase.overdueAmount),
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
    overdueDays: dbCase.overdueDays ?? undefined,
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
    createdAt: dbCase.createdAt,
    updatedAt: dbCase.updatedAt,
    followups: dbFollowUps ? dbFollowUps.map(convertDBFollowUpToFollowUp) : undefined,
    files: dbFiles ? dbFiles.map(convertDBCaseFileToCaseFile) : undefined
  };
}

function convertDBFollowUpToFollowUp(dbFollowUp: DBFollowUp): FollowUp {
  return {
    id: dbFollowUp.id,
    follower: dbFollowUp.follower,
    followTime: dbFollowUp.followTime,
    followType: dbFollowUp.followType as 'online' | 'offline',
    contact: dbFollowUp.contact as 'legal_representative' | 'actual_controller',
    followResult: dbFollowUp.followResult as 'normal_repayment' | 'warning_rise' | 'overdue_promise',
    followRecord: dbFollowUp.followRecord,
    fileInfo: dbFollowUp.fileInfo as (string | CaseFile)[] | undefined,
    createdAt: dbFollowUp.createdAt,
    createdBy: dbFollowUp.createdBy
  };
}

function convertDBCaseFileToCaseFile(dbFile: DBCaseFile): CaseFile {
  return {
    id: dbFile.id,
    name: dbFile.name,
    type: dbFile.type as 'image' | 'document' | 'other',
    url: dbFile.url ?? undefined,
    data: dbFile.data ?? undefined,
    uploadTime: dbFile.uploadTime,
    uploadBy: dbFile.uploadBy ?? undefined
  };
}

function convertDBCaseHistoryToCaseHistory(dbHistory: DBCaseHistory): CaseHistory {
  return {
    id: dbHistory.id,
    caseId: dbHistory.caseId,
    userId: dbHistory.userId ?? undefined,
    userName: dbHistory.userName,
    modifiedAt: dbHistory.modifiedAt,
    fieldName: dbHistory.fieldName,
    fieldLabel: dbHistory.fieldLabel ?? undefined,
    oldValue: dbHistory.oldValue,
    newValue: dbHistory.newValue
  };
}

// ============= 基础查询函数 =============

export async function getAll(): Promise<Case[]> {
  const dbCases = await db.select().from(cases).orderBy(desc(cases.updatedAt));
  
  // 获取所有关联数据
  const caseIds = dbCases.map(c => c.id);
  const [dbFollowUps, dbFiles] = await Promise.all([
    db.select().from(followups).where(sql`${followups.caseId} in ${caseIds}`),
    db.select().from(caseFiles).where(sql`${caseFiles.caseId} in ${caseIds}`)
  ]);

  // 组织关联数据
  const followUpsByCaseId = new Map<string, DBFollowUp[]>();
  const filesByCaseId = new Map<string, DBCaseFile[]>();

  for (const fu of dbFollowUps) {
    if (!followUpsByCaseId.has(fu.caseId)) followUpsByCaseId.set(fu.caseId, []);
    followUpsByCaseId.get(fu.caseId)!.push(fu);
  }

  for (const f of dbFiles) {
    if (!filesByCaseId.has(f.caseId)) filesByCaseId.set(f.caseId, []);
    filesByCaseId.get(f.caseId)!.push(f);
  }

  return dbCases.map(dbCase => convertDBCaseToCase(
    dbCase,
    followUpsByCaseId.get(dbCase.id),
    filesByCaseId.get(dbCase.id)
  ));
}

export async function getAllLight(): Promise<Case[]> {
  const dbCases = await db.select().from(cases).orderBy(desc(cases.updatedAt));
  return dbCases.map(dbCase => convertDBCaseToCase(dbCase));
}

export async function getById(id: string): Promise<Case | null> {
  const [dbCase] = await db.select().from(cases).where(eq(cases.id, id));
  if (!dbCase) return null;

  const [dbFollowUps, dbFiles, dbHistory] = await Promise.all([
    db.select().from(followups).where(eq(followups.caseId, id)).orderBy(desc(followups.followTime)),
    db.select().from(caseFiles).where(eq(caseFiles.caseId, id)).orderBy(desc(caseFiles.uploadTime)),
    db.select().from(caseHistory).where(eq(caseHistory.caseId, id)).orderBy(desc(caseHistory.modifiedAt))
  ]);

  return convertDBCaseToCase(dbCase, dbFollowUps, dbFiles);
}

export async function get(id: string): Promise<Case | null> {
  return getById(id);
}

export async function getByUserId(userId: string): Promise<Case[]> {
  const dbCases = await db.select().from(cases).where(eq(cases.userId, userId)).orderBy(desc(cases.updatedAt));
  return dbCases.map(dbCase => convertDBCaseToCase(dbCase));
}

export async function getByLoanNo(loanNo: string): Promise<Case | null> {
  const [dbCase] = await db.select().from(cases).where(eq(cases.loanNo, loanNo));
  if (!dbCase) return null;
  return convertDBCaseToCase(dbCase);
}

// ============= 基础修改函数 =============

export async function create(caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt' | 'followups' | 'files' | 'history'>): Promise<Case> {
  const now = new Date().toISOString();
  const id = uuidv4();

  const [newCase] = await db.insert(cases).values({
    id,
    ...caseData as any,
    createdAt: now,
    updatedAt: now
  }).returning();

  return convertDBCaseToCase(newCase);
}

export async function update(id: string, updates: Partial<Omit<Case, 'id' | 'createdAt' | 'followups' | 'files' | 'history'>>, options?: { userId?: string; userName?: string; skipHistory?: boolean }): Promise<Case> {
  const now = new Date().toISOString();
  
  // 先获取当前案件
  const currentCase = await getById(id);
  if (!currentCase) throw new Error(`案件不存在: ${id}`);

  // 更新案件
  const [updatedCase] = await db.update(cases)
    .set({ ...updates as any, updatedAt: now })
    .where(eq(cases.id, id))
    .returning();

  // 记录历史
  if (!options?.skipHistory) {
    for (const [key, value] of Object.entries(updates)) {
      const oldValue = (currentCase as any)[key];
      if (oldValue !== value) {
        await db.insert(caseHistory).values({
          id: uuidv4(),
          caseId: id,
          userId: options?.userId,
          userName: options?.userName || 'System',
          modifiedAt: now,
          fieldName: key,
          fieldLabel: key,
          oldValue: oldValue,
          newValue: value
        });
      }
    }
  }

  return convertDBCaseToCase(updatedCase);
}

export async function softDelete(id: string, options?: { userId?: string; userName?: string }): Promise<Case> {
  return update(id, { status: 'deleted' }, options);
}

// ============= 跟进记录函数 =============

export async function addFollowUp(caseId: string, followUpData: Omit<FollowUp, 'id' | 'createdAt'>): Promise<Case> {
  const now = new Date().toISOString();
  const followUpId = uuidv4();

  await db.insert(followups).values({
    id: followUpId,
    caseId,
    ...followUpData,
    createdAt: now
  });

  // 更新案件的更新时间
  await db.update(cases).set({ updatedAt: now }).where(eq(cases.id, caseId));

  const updatedCase = await getById(caseId);
  if (!updatedCase) throw new Error(`案件不存在: ${caseId}`);
  return updatedCase;
}

// ============= 文件函数 =============

export async function addFile(caseId: string, fileData: Omit<CaseFile, 'id'>): Promise<Case> {
  const fileId = uuidv4();

  await db.insert(caseFiles).values({
    id: fileId,
    caseId,
    ...fileData
  });

  // 更新案件的更新时间
  const now = new Date().toISOString();
  await db.update(cases).set({ updatedAt: now }).where(eq(cases.id, caseId));

  const updatedCase = await getById(caseId);
  if (!updatedCase) throw new Error(`案件不存在: ${caseId}`);
  return updatedCase;
}

// ============= 历史记录函数 =============

export async function getHistory(caseId: string): Promise<CaseHistory[]> {
  const dbHistory = await db.select().from(caseHistory)
    .where(eq(caseHistory.caseId, caseId))
    .orderBy(desc(caseHistory.modifiedAt));
  return dbHistory.map(convertDBCaseHistoryToCaseHistory);
}

export async function addHistory(record: Omit<CaseHistory, 'id'>): Promise<CaseHistory> {
  const id = uuidv4();
  const [newRecord] = await db.insert(caseHistory).values({ id, ...record }).returning();
  return convertDBCaseHistoryToCaseHistory(newRecord);
}

// ============= 缓存函数 =============

export function clearCache(): void {
  cachedCases = null;
  lastModifiedTime = 0;
}

// ============= 导出对象（保持兼容） =============

export const caseStorage = {
  getAll,
  getAllLight,
  getById,
  get,
  getByUserId,
  getByLoanNo,
  create,
  update,
  softDelete,
  delete: softDelete,
  addFollowUp,
  addFile,
  getHistory,
  addHistory,
  clearCache,
  query,
  getRecycleBin,
  restore,
  permanentDelete
};

export default caseStorage;

// ============= 兼容函数（保持向后兼容） =============

export function stripLargeFields(caseList: Case[]): Case[] {
  return caseList.map(c => ({
    ...c,
    files: undefined,
    followups: undefined,
    history: undefined
  }));
}

export function stripLargeFieldsFromPartial(caseData: Partial<Case>): Partial<Case> {
  const { files, followups, ...rest } = caseData;
  return rest;
}

export function getCaseHistory(caseId: string): CaseHistory[] {
  console.warn('getCaseHistory is deprecated, use getHistory instead');
  return [];
}

export async function query(): Promise<Case[]> {
  return getAll();
}

export async function getRecycleBin(): Promise<Case[]> {
  const dbCases = await db.select().from(cases).where(eq(cases.status, 'deleted'));
  return dbCases.map(dbCase => convertDBCaseToCase(dbCase));
}

export async function restore(id: string): Promise<Case> {
  return update(id, { status: 'pending_assign' });
}

export async function permanentDelete(id: string): Promise<void> {
  await db.delete(caseHistory).where(eq(caseHistory.caseId, id));
  await db.delete(caseFiles).where(eq(caseFiles.caseId, id));
  await db.delete(followups).where(eq(followups.caseId, id));
  await db.delete(cases).where(eq(cases.id, id));
}
