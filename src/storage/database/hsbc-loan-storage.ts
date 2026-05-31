import { HSBCLoan, HSBCLoanFilter, HSBCLoanLog } from '@/lib/hsbc-loan';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db/client';
import { hsbcLoans, hsbcLoanBatches, merchantSalesMappings } from './shared/schema';
import { eq, and, desc, like, or, isNotNull, inArray } from 'drizzle-orm';

// ============================================================
// 数据转换函数
// ============================================================

function convertDbLoanToHsbcLoan(dbLoan: any): HSBCLoan {
  return {
    id: dbLoan.id,
    loanReference: dbLoan.loanReference,
    merchantId: dbLoan.merchantId,
    merchantName: dbLoan.merchantName || undefined,
    borrowerName: dbLoan.borrowerName,
    loanStartDate: dbLoan.loanStartDate || '',
    loanDate: dbLoan.loanDate || undefined,
    loanCurrency: (dbLoan.loanCurrency as 'CNY' | 'USD') || 'USD',
    loanAmount: Number(dbLoan.loanAmount) || 0,
    loanInterest: dbLoan.loanInterest || '',
    totalInterestRate: Number(dbLoan.totalInterestRate) || 0,
    loanTenor: dbLoan.loanTenor || '',
    maturityDate: dbLoan.maturityDate || '',
    repaymentSchedule: dbLoan.repaymentSchedule || [],
    balance: dbLoan.balance !== null ? Number(dbLoan.balance) : undefined,
    pastdueAmount: dbLoan.pastdueAmount !== null ? Number(dbLoan.pastdueAmount) : undefined,
    totalRepaid: dbLoan.totalRepaid !== null ? Number(dbLoan.totalRepaid) : undefined,
    freezeAccountRequested: dbLoan.freezeAccountRequested || undefined,
    forceDebitRequested: dbLoan.forceDebitRequested || undefined,
    approvalFromRM: dbLoan.approvalFromRM || undefined,
    confirmationFreezeAccount: dbLoan.confirmationFreezeAccount || undefined,
    confirmationForceDebit: dbLoan.confirmationForceDebit || undefined,
    remarks: dbLoan.remarks || undefined,
    batchDate: dbLoan.batchDate || undefined,
    status: (dbLoan.status as any) || undefined,
    overdueDays: dbLoan.overdueDays !== null ? Number(dbLoan.overdueDays) : undefined,
    assignedTo: dbLoan.assignedTo || undefined,
    followUpCount: dbLoan.followUpCount !== null ? Number(dbLoan.followUpCount) : undefined,
    lastFollowUpDate: dbLoan.lastFollowUpDate || undefined,
    createdAt: dbLoan.createdAt || undefined,
    updatedAt: dbLoan.updatedAt || undefined,
  };
}

function transformLoanForStorage(loan: HSBCLoan) {
  return {
    id: loan.id,
    loanReference: loan.loanReference,
    merchantId: loan.merchantId,
    merchantName: loan.merchantName || null,
    borrowerName: loan.borrowerName,
    loanStartDate: loan.loanStartDate || null,
    loanDate: loan.loanDate || null,
    loanCurrency: loan.loanCurrency,
    loanAmount: String(loan.loanAmount),
    loanInterest: loan.loanInterest || null,
    totalInterestRate: loan.totalInterestRate,
    loanTenor: loan.loanTenor || null,
    maturityDate: loan.maturityDate || null,
    repaymentSchedule: loan.repaymentSchedule || [],
    balance: loan.balance !== undefined ? String(loan.balance) : null,
    pastdueAmount: loan.pastdueAmount !== undefined ? String(loan.pastdueAmount) : null,
    totalRepaid: loan.totalRepaid !== undefined ? String(loan.totalRepaid) : null,
    freezeAccountRequested: loan.freezeAccountRequested || null,
    forceDebitRequested: loan.forceDebitRequested || null,
    approvalFromRM: loan.approvalFromRM || null,
    confirmationFreezeAccount: loan.confirmationFreezeAccount || null,
    confirmationForceDebit: loan.confirmationForceDebit || null,
    remarks: loan.remarks || null,
    batchDate: loan.batchDate || null,
    status: loan.status || null,
    overdueDays: loan.overdueDays !== undefined ? loan.overdueDays : null,
    assignedTo: loan.assignedTo || null,
    followUpCount: loan.followUpCount !== undefined ? loan.followUpCount : null,
    lastFollowUpDate: loan.lastFollowUpDate || null,
    createdAt: loan.createdAt || new Date().toISOString(),
    updatedAt: loan.updatedAt || new Date().toISOString(),
  };
}

// ============================================================
// 内存缓存机制
// ============================================================

let loansCache: HSBCLoan[] | null = null;
let lastFetchedTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

function clearCache(): void {
  loansCache = null;
  lastFetchedTime = 0;
}

// ============================================================
// 存储操作函数
// ============================================================

export async function getAllLoans(): Promise<HSBCLoan[]> {
  const now = Date.now();
  
  // 检查缓存是否有效
  if (loansCache && (now - lastFetchedTime) < CACHE_TTL) {
    return loansCache;
  }

  try {
    const results = await db.select().from(hsbcLoans).orderBy(desc(hsbcLoans.createdAt));
    loansCache = results.map(convertDbLoanToHsbcLoan);
    lastFetchedTime = now;
    return loansCache;
  } catch (error) {
    console.error('获取汇丰贷款列表失败:', error);
    return [];
  }
}

export async function getLoanById(id: string): Promise<HSBCLoan | null> {
  try {
    const results = await db.select().from(hsbcLoans).where(eq(hsbcLoans.id, id));
    if (results.length === 0) return null;
    return convertDbLoanToHsbcLoan(results[0]);
  } catch (error) {
    console.error('获取汇丰贷款详情失败:', error);
    return null;
  }
}

export async function getLoanByReference(loanReference: string): Promise<HSBCLoan | null> {
  try {
    const results = await db.select().from(hsbcLoans).where(eq(hsbcLoans.loanReference, loanReference));
    if (results.length === 0) return null;
    return convertDbLoanToHsbcLoan(results[0]);
  } catch (error) {
    console.error('通过参考号获取汇丰贷款失败:', error);
    return null;
  }
}

export async function saveLoan(loan: HSBCLoan): Promise<HSBCLoan> {
  const now = new Date().toISOString();
  const loanToSave = {
    ...loan,
    updatedAt: now,
  };

  try {
    if (loan.id && await getLoanById(loan.id)) {
      // 更新现有记录
      await db.update(hsbcLoans).set({
        loanReference: loanToSave.loanReference,
        merchantId: loanToSave.merchantId,
        merchantName: loanToSave.merchantName || null,
        borrowerName: loanToSave.borrowerName,
        loanStartDate: loanToSave.loanStartDate || null,
        loanDate: loanToSave.loanDate || null,
        loanCurrency: loanToSave.loanCurrency || null,
        loanAmount: loanToSave.loanAmount.toString(),
        loanInterest: loanToSave.loanInterest || null,
        totalInterestRate: loanToSave.totalInterestRate,
        loanTenor: loanToSave.loanTenor || null,
        maturityDate: loanToSave.maturityDate || null,
        repaymentSchedule: loanToSave.repaymentSchedule,
        balance: loanToSave.balance !== undefined ? loanToSave.balance.toString() : null,
        pastdueAmount: loanToSave.pastdueAmount !== undefined ? loanToSave.pastdueAmount.toString() : null,
        totalRepaid: loanToSave.totalRepaid !== undefined ? loanToSave.totalRepaid.toString() : null,
        freezeAccountRequested: loanToSave.freezeAccountRequested || null,
        forceDebitRequested: loanToSave.forceDebitRequested || null,
        approvalFromRM: loanToSave.approvalFromRM || null,
        confirmationFreezeAccount: loanToSave.confirmationFreezeAccount || null,
        confirmationForceDebit: loanToSave.confirmationForceDebit || null,
        remarks: loanToSave.remarks || null,
        batchDate: loanToSave.batchDate || null,
        status: loanToSave.status || null,
        overdueDays: loanToSave.overdueDays !== undefined ? loanToSave.overdueDays : null,
        assignedTo: loanToSave.assignedTo || null,
        followUpCount: loanToSave.followUpCount !== undefined ? loanToSave.followUpCount : null,
        lastFollowUpDate: loanToSave.lastFollowUpDate || null,
        updatedAt: loanToSave.updatedAt,
      }).where(eq(hsbcLoans.id, loan.id));
      
      clearCache();
      return loanToSave;
    } else {
      // 创建新记录
      const newId = uuidv4();
      const newLoan = {
        ...loanToSave,
        id: newId,
        createdAt: now,
      };
      
      await db.insert(hsbcLoans).values({
        id: newLoan.id,
        loanReference: newLoan.loanReference,
        merchantId: newLoan.merchantId,
        merchantName: newLoan.merchantName || null,
        borrowerName: newLoan.borrowerName,
        loanStartDate: newLoan.loanStartDate || null,
        loanDate: newLoan.loanDate || null,
        loanCurrency: newLoan.loanCurrency || null,
        loanAmount: newLoan.loanAmount.toString(),
        loanInterest: newLoan.loanInterest || null,
        totalInterestRate: newLoan.totalInterestRate,
        loanTenor: newLoan.loanTenor || null,
        maturityDate: newLoan.maturityDate || null,
        repaymentSchedule: newLoan.repaymentSchedule,
        balance: newLoan.balance !== undefined ? newLoan.balance.toString() : null,
        pastdueAmount: newLoan.pastdueAmount !== undefined ? newLoan.pastdueAmount.toString() : null,
        totalRepaid: newLoan.totalRepaid !== undefined ? newLoan.totalRepaid.toString() : null,
        freezeAccountRequested: newLoan.freezeAccountRequested || null,
        forceDebitRequested: newLoan.forceDebitRequested || null,
        approvalFromRM: newLoan.approvalFromRM || null,
        confirmationFreezeAccount: newLoan.confirmationFreezeAccount || null,
        confirmationForceDebit: newLoan.confirmationForceDebit || null,
        remarks: newLoan.remarks || null,
        batchDate: newLoan.batchDate || null,
        status: newLoan.status || null,
        overdueDays: newLoan.overdueDays !== undefined ? newLoan.overdueDays : null,
        assignedTo: newLoan.assignedTo || null,
        followUpCount: newLoan.followUpCount !== undefined ? newLoan.followUpCount : null,
        lastFollowUpDate: newLoan.lastFollowUpDate || null,
        createdAt: newLoan.createdAt,
        updatedAt: newLoan.updatedAt,
      });
      
      clearCache();
      return newLoan;
    }
  } catch (error) {
    console.error('保存汇丰贷款失败:', error);
    throw error;
  }
}

export async function saveLoans(loans: HSBCLoan[]): Promise<void> {
  if (loans.length === 0) {
    return;
  }
  
  const now = new Date().toISOString();
  
  // 批量插入：先删除现有记录，再一次性插入所有新记录
  const valuesToInsert = loans.map((loan, index) => {
    const loanToSave = transformLoanForStorage(loan);
    return {
      id: loanToSave.id || uuidv4(),
      loanReference: loanToSave.loanReference,
      merchantId: loanToSave.merchantId,
      merchantName: loanToSave.merchantName || null,
      borrowerName: loanToSave.borrowerName,
      loanStartDate: loanToSave.loanStartDate || null,
      loanDate: loanToSave.loanDate || null,
      loanCurrency: loanToSave.loanCurrency || null,
      loanAmount: loanToSave.loanAmount,
      loanInterest: loanToSave.loanInterest || null,
      totalInterestRate: loanToSave.totalInterestRate,
      loanTenor: loanToSave.loanTenor || null,
      maturityDate: loanToSave.maturityDate || null,
      repaymentSchedule: loanToSave.repaymentSchedule,
      balance: loanToSave.balance !== undefined ? loanToSave.balance : null,
      pastdueAmount: loanToSave.pastdueAmount !== undefined ? loanToSave.pastdueAmount : null,
      totalRepaid: loanToSave.totalRepaid !== undefined ? loanToSave.totalRepaid : null,
      freezeAccountRequested: loanToSave.freezeAccountRequested || null,
      forceDebitRequested: loanToSave.forceDebitRequested || null,
      approvalFromRM: loanToSave.approvalFromRM || null,
      confirmationFreezeAccount: loanToSave.confirmationFreezeAccount || null,
      confirmationForceDebit: loanToSave.confirmationForceDebit || null,
      remarks: loanToSave.remarks || null,
      batchDate: loanToSave.batchDate || null,
      status: loanToSave.status || null,
      overdueDays: loanToSave.overdueDays !== undefined ? loanToSave.overdueDays : null,
      assignedTo: loanToSave.assignedTo || null,
      followUpCount: loanToSave.followUpCount !== undefined ? loanToSave.followUpCount : null,
      lastFollowUpDate: loanToSave.lastFollowUpDate || null,
      createdAt: loanToSave.createdAt || now,
      updatedAt: now,
    };
  });
  
  try {
    // 批量删除现有记录
    const idsToDelete = loans.map(loan => loan.id).filter(id => id !== undefined) as string[];
    if (idsToDelete.length > 0) {
      await db.delete(hsbcLoans).where(inArray(hsbcLoans.id, idsToDelete));
    }
    
    // 批量插入所有新记录
    await db.insert(hsbcLoans).values(valuesToInsert);
    
    clearCache();
  } catch (error) {
    console.error('批量保存汇丰贷款失败:', error);
    throw error;
  }
}

export async function filterLoans(filter: HSBCLoanFilter): Promise<{ data: HSBCLoan[], total: number, totalPages: number }> {
  const allLoans = await getAllLoans();
  let filtered = [...allLoans];

  if (filter.search) {
    const searchLower = filter.search.toLowerCase();
    filtered = filtered.filter(loan =>
      loan.loanReference.toLowerCase().includes(searchLower) ||
      loan.borrowerName.toLowerCase().includes(searchLower) ||
      (loan.merchantName && loan.merchantName.toLowerCase().includes(searchLower))
    );
  }

  if (filter.currency) {
    filtered = filtered.filter(loan => loan.loanCurrency === filter.currency);
  }

  if (filter.status) {
    filtered = filtered.filter(loan => loan.status === filter.status);
  }

  if (filter.hasOverdue !== undefined) {
    filtered = filtered.filter(loan => {
      const isOverdue = (loan.status === 'overdue') || 
        (loan.pastdueAmount !== undefined && loan.pastdueAmount > 0.9);
      return filter.hasOverdue ? isOverdue : !isOverdue;
    });
  }

  if (filter.batchDate) {
    filtered = filtered.filter(loan => loan.batchDate === filter.batchDate);
  }

  // 排序
  if (filter.sortBy) {
    filtered.sort((a, b) => {
      let aVal: any = (a as any)[filter.sortBy!];
      let bVal: any = (b as any)[filter.sortBy!];
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return filter.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return filter.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  } else {
    // 默认按创建时间倒序
    filtered.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  const total = filtered.length;
  const page = filter.page || 1;
  const pageSize = filter.pageSize || 50;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  return { data, total, totalPages };
}

export async function getBatchDates(): Promise<string[]> {
  try {
    const results = await db
      .selectDistinct({ batchDate: hsbcLoans.batchDate })
      .from(hsbcLoans)
      .where(isNotNull(hsbcLoans.batchDate))
      .orderBy(desc(hsbcLoans.batchDate));
    
    return results.map((r: any) => r.batchDate).filter((d: any): d is string => d !== null);
  } catch (error) {
    console.error('获取批次日期失败:', error);
    return [];
  }
}

export async function deleteLoan(id: string): Promise<void> {
  try {
    await db.delete(hsbcLoans).where(eq(hsbcLoans.id, id));
    clearCache();
  } catch (error) {
    console.error('删除汇丰贷款失败:', error);
    throw error;
  }
}

export async function deleteLoansByBatchDate(batchDate: string): Promise<void> {
  try {
    await db.delete(hsbcLoans).where(eq(hsbcLoans.batchDate, batchDate));
    clearCache();
  } catch (error) {
    console.error('按批次删除汇丰贷款失败:', error);
    throw error;
  }
}

// ============================================================
// 商户销售映射
// ============================================================

export async function getMerchantSalesMappings(): Promise<{ merchantName: string; salesName: string }[]> {
  try {
    const results = await db.select().from(merchantSalesMappings);
    return results.map((r: any) => ({ merchantName: r.merchantName, salesName: r.salesName }));
  } catch (error) {
    console.error('获取商户销售映射失败:', error);
    return [];
  }
}

export async function saveMerchantSalesMapping(merchantName: string, salesName: string): Promise<void> {
  try {
    // 先检查是否已存在
    const existing = await db.select().from(merchantSalesMappings).where(eq(merchantSalesMappings.merchantName, merchantName));
    
    if (existing.length > 0) {
      await db.update(merchantSalesMappings).set({ salesName }).where(eq(merchantSalesMappings.merchantName, merchantName));
    } else {
      await db.insert(merchantSalesMappings).values({ merchantName, salesName });
    }
  } catch (error) {
    console.error('保存商户销售映射失败:', error);
    throw error;
  }
}

export async function deleteMerchantSalesMapping(merchantName: string): Promise<void> {
  try {
    await db.delete(merchantSalesMappings).where(eq(merchantSalesMappings.merchantName, merchantName));
  } catch (error) {
    console.error('删除商户销售映射失败:', error);
    throw error;
  }
}

export async function getExtensionMerchants(): Promise<string[]> {
  try {
    // 从贷款数据中提取所有商户名称
    const results = await db.selectDistinct({ merchantName: hsbcLoans.merchantName })
      .from(hsbcLoans)
      .where(isNotNull(hsbcLoans.merchantName));
    
    return results.map((r: any) => r.merchantName).filter((m: any): m is string => m !== null);
  } catch (error) {
    console.error('获取展期商户列表失败:', error);
    return [];
  }
}

// ============================================================
// 贷款批次
// ============================================================

export async function createLoanBatch(batchDate: string, recordCount: number, totalAmount?: number): Promise<number> {
  try {
    const [result] = await db.insert(hsbcLoanBatches).values({
      batchDate,
      recordCount,
      totalAmount: totalAmount !== undefined ? totalAmount.toString() : null,
    }).returning({ id: hsbcLoanBatches.id });
    
    return result.id;
  } catch (error) {
    console.error('创建贷款批次失败:', error);
    throw error;
  }
}

// ============================================================
// 兼容性导出函数
// ============================================================

export async function getAllHSBCLoans(): Promise<HSBCLoan[]> {
  return getAllLoans();
}

export async function getAllBatchDates(): Promise<string[]> {
  return getBatchDates();
}

export async function getHSBCLoansByBatchDate(batchDate: string): Promise<HSBCLoan[]> {
  const allLoans = await getAllLoans();
  return allLoans.filter(loan => loan.batchDate === batchDate);
}

export async function saveHSBCLoans(loans: HSBCLoan[]): Promise<void> {
  return saveLoans(loans);
}

export async function getHSBCLoanByReference(loanReference: string): Promise<HSBCLoan | null> {
  return getLoanByReference(loanReference);
}

export async function deleteHSBCBatch(batchDate: string): Promise<{ deletedCount: number }> {
  const loansToDelete = await getHSBCLoansByBatchDate(batchDate);
  await deleteLoansByBatchDate(batchDate);
  return { deletedCount: loansToDelete.length };
}

// ============================================================
// 导出对象
// ============================================================

export const hsbcLoanStorage = {
  getAllLoans,
  getLoanById,
  getLoanByReference,
  saveLoan,
  saveLoans,
  filterLoans,
  getBatchDates,
  deleteLoan,
  deleteLoansByBatchDate,
  getMerchantSalesMappings,
  saveMerchantSalesMapping,
  deleteMerchantSalesMapping,
  getExtensionMerchants,
  createLoanBatch,
  clearCache,
  // 兼容性导出
  getAllHSBCLoans,
  getAllBatchDates,
  getHSBCLoansByBatchDate,
  saveHSBCLoans,
  getHSBCLoanByReference,
  deleteHSBCBatch,
};
