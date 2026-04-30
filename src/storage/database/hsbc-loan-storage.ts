import { createClient } from '@supabase/supabase-js';
import type { HSBCLoan } from '@/lib/hsbc-loan';
import { getSupabaseClient } from './supabase-client';
import * as fs from 'fs';
import * as path from 'path';

// Re-export HSBCLoan type
export type { HSBCLoan } from '@/lib/hsbc-loan';

// 本地存储文件路径
const STORAGE_FILE = process.env.NODE_ENV === 'production' 
  ? '/tmp/hsbc-loans.json'
  : path.join(process.cwd(), 'hsbc-loans.json');

// 批次日期存储文件
const BATCH_DATES_FILE = process.env.NODE_ENV === 'production'
  ? '/tmp/hsbc-batch-dates.json'
  : path.join(process.cwd(), 'hsbc-batch-dates.json');

// 内存缓存
let loansCache: HSBCLoan[] | null = null;
let batchDatesCache: string[] | null = null;

// 检查 Supabase 是否可用
async function isSupabaseAvailable(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('hsbc_loans').select('id').limit(1);
    if (error) {
      console.log('⚠️ Supabase 表不存在或连接失败，使用本地存储');
      return false;
    }
    console.log('✅ Supabase 可用，使用 Supabase 存储');
    return true;
  } catch (err) {
    console.log('⚠️ Supabase 连接失败，使用本地存储:', err);
    return false;
  }
}

// 从本地文件加载数据
function loadFromLocalStorage(): HSBCLoan[] {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const data = JSON.parse(content);
      console.log(`✅ 从本地文件加载了 ${data.length} 条汇丰贷款数据`);
      return data;
    }
  } catch (err) {
    console.error('从本地文件加载数据失败:', err);
  }
  return [];
}

// 保存到本地文件
function saveToLocalStorage(loans: HSBCLoan[]) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(loans, null, 2));
    console.log(`✅ 保存了 ${loans.length} 条汇丰贷款数据到本地文件`);
  } catch (err) {
    console.error('保存到本地文件失败:', err);
  }
}

// 从本地文件加载批次日期
function loadBatchDatesFromLocalStorage(): string[] {
  try {
    if (fs.existsSync(BATCH_DATES_FILE)) {
      const content = fs.readFileSync(BATCH_DATES_FILE, 'utf-8');
      const data = JSON.parse(content);
      console.log(`✅ 从本地文件加载了 ${data.length} 个批次日期`);
      return data;
    }
  } catch (err) {
    console.error('从本地文件加载批次日期失败:', err);
  }
  return [];
}

// 保存批次日期到本地文件
function saveBatchDatesToLocalStorage(dates: string[]) {
  try {
    fs.writeFileSync(BATCH_DATES_FILE, JSON.stringify(dates, null, 2));
    console.log(`✅ 保存了 ${dates.length} 个批次日期到本地文件`);
  } catch (err) {
    console.error('保存批次日期到本地文件失败:', err);
  }
}

// 初始化内存缓存
function initCache(forceReload = false) {
  if (loansCache === null || forceReload) {
    loansCache = loadFromLocalStorage();
  }
  if (batchDatesCache === null || forceReload) {
    batchDatesCache = loadBatchDatesFromLocalStorage();
  }
}

// 将数据库行转换为 HSBCLoan 类型
function transformRow(row: Record<string, unknown>): HSBCLoan {
  const repaymentSchedule = (row.repayment_schedule as HSBCLoan['repaymentSchedule']) || [];
  const loanAmount = Number(row.loan_amount) || 0;
  const balance = Number(row.balance) || 0;
  const totalRepaid = Number(row.total_repaid) || 0;
  
  const baseLoan: HSBCLoan = {
    id: String(row.id || ''),
    loanReference: String(row.loan_reference || ''),
    merchantId: String(row.merchant_id || ''),
    merchantName: String(row.merchant_name || ''),
    borrowerName: String(row.borrower_name || ''),
    loanCurrency: String(row.currency || 'CNY') === 'USD' ? 'USD' : 'CNY',
    loanStartDate: String(row.loan_date || ''),
    maturityDate: String(row.maturity_date || ''),
    loanAmount,
    loanInterest: String(row.loan_interest || ''),
    totalInterestRate: Number(row.interest_rate) || 0,
    loanTenor: String(row.loan_tenor || ''),
    balance,
    pastdueAmount: Number(row.pastdue_amount) || 0,
    overdueDays: Number(row.overdue_days) || 0,
    status: (row.status as HSBCLoan['status']) || 'active',
    repaymentSchedule,
    remarks: String(row.remarks || ''),
    totalRepaid,
    batchDate: String(row.batch_date || ''),
  };
  
  return baseLoan;
}

// 获取所有汇丰贷款
export async function getAllHSBCLoans(batchDate?: string): Promise<HSBCLoan[]> {
  initCache(true);
  
  const supabaseAvailable = await isSupabaseAvailable();
  
  if (supabaseAvailable) {
    try {
      const client = getSupabaseClient();
      const allLoans: HSBCLoan[] = [];
      const BATCH_SIZE = 1000;
      
      // 分批获取数据，Supabase 默认限制 1000 行/页
      while (true) {
        let query = client
          .from('hsbc_loans')
          .select('*')
          .order('loan_reference')
          .range(allLoans.length, allLoans.length + BATCH_SIZE - 1);
        
        if (batchDate) {
          query = query.eq('batch_date', batchDate);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('获取汇丰贷款失败:', error);
          throw new Error(`获取汇丰贷款失败: ${error.message}`);
        }
        
        if (!data || data.length === 0) break;
        allLoans.push(...data.map(transformRow));
        
        if (data.length < BATCH_SIZE) break;
      }
      
      return allLoans;
    } catch (error) {
      console.log('Supabase 获取失败，使用本地存储');
    }
  }
  
  // Fallback 到本地存储
  let loans = loansCache || [];
  if (batchDate) {
    loans = loans.filter(loan => loan.batchDate === batchDate);
  }
  return loans;
}

// 按批次日期获取汇丰贷款
export async function getHSBCLoansByBatchDate(batchDate: string): Promise<HSBCLoan[]> {
  initCache(true);
  
  const supabaseAvailable = await isSupabaseAvailable();
  
  if (supabaseAvailable) {
    try {
      const client = getSupabaseClient();
      
      // 直接使用 batch_date 字段查询
      const allLoans: HSBCLoan[] = [];
      const BATCH_SIZE = 1000;
      
      while (true) {
        const { data, error } = await client
          .from('hsbc_loans')
          .select('*')
          .eq('batch_date', batchDate)
          .order('loan_reference')
          .range(allLoans.length, allLoans.length + BATCH_SIZE - 1);
        
        if (error) {
          console.error('获取汇丰贷款失败:', error);
          return [];
        }
        
        if (!data || data.length === 0) break;
        allLoans.push(...data.map(transformRow));
        
        if (data.length < BATCH_SIZE) break;
      }
      
      return allLoans;
    } catch (error) {
      console.log('Supabase 获取失败，使用本地存储');
    }
  }
  
  // Fallback 到本地存储
  const loans = loansCache || [];
  return loans.filter(loan => loan.batchDate === batchDate);
}

// 获取所有批次日期
export async function getAllBatchDates(): Promise<string[]> {
  initCache(true);
  
  const supabaseAvailable = await isSupabaseAvailable();
  
  if (supabaseAvailable) {
    try {
      const client = getSupabaseClient();
      // 直接从贷款数据表中获取所有不重复的批次日期
      const { data, error } = await client
        .from('hsbc_loans')
        .select('batch_date')
        .order('batch_date', { ascending: false });
      
      if (!error) {
        const dates = [...new Set((data || []).map((row: Record<string, unknown>) => row.batch_date as string).filter((date): date is string => date !== undefined))];
        if (dates.length > 0) {
          return dates.sort((a, b) => (b || '').localeCompare(a || ''));
        }
      }
    } catch (error) {
      console.log('Supabase 获取失败，使用本地存储');
    }
  }
  
  // Fallback 到本地存储
  // 首先尝试从批次日期文件读取
  if (batchDatesCache && batchDatesCache.length > 0) {
    return batchDatesCache.sort((a, b) => (b || '').localeCompare(a || ''));
  }
  
  // 如果批次日期文件为空，则从贷款数据中提取
  const loans = loansCache || [];
  const dates = [...new Set(loans.map(loan => loan.batchDate).filter((date): date is string => date !== undefined))];
  return dates.sort((a, b) => (b || '').localeCompare(a || ''));
}

// 获取所有汇丰贷款
export async function getAllLoans(): Promise<HSBCLoan[]> {
  return getAllHSBCLoans();
}

// 根据贷款编号获取单条贷款
export async function getHSBCLoanByReference(loanReference: string): Promise<HSBCLoan | null> {
  initCache();
  
  const supabaseAvailable = await isSupabaseAvailable();
  
  if (supabaseAvailable) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('hsbc_loans')
        .select('*')
        .eq('loan_reference', loanReference)
        .single();
      
      if (!error && data) {
        return transformRow(data);
      }
    } catch (error) {
      console.log('Supabase 获取失败，使用本地存储');
    }
  }
  
  // Fallback 到本地存储
  const loans = loansCache || [];
  return loans.find(loan => loan.loanReference === loanReference) || null;
}

// 删除指定批次的所有贷款数据
export async function deleteHSBCBatch(batchDate: string): Promise<{ deletedCount: number }> {
  initCache();
  
  const supabaseAvailable = await isSupabaseAvailable();
  
  let deletedCount = 0;
  
  if (supabaseAvailable) {
    try {
      const client = getSupabaseClient();
      
      // 先查询一下该批次有多少条记录
      const { count } = await client
        .from('hsbc_loans')
        .select('*', { count: 'exact', head: true })
        .eq('batch_date', batchDate);
      
      // 删除该批次的所有数据
      const { error } = await client
        .from('hsbc_loans')
        .delete()
        .eq('batch_date', batchDate);
      
      if (!error) {
        deletedCount = count || 0;
      }
    } catch (error) {
      console.log('Supabase 删除失败，使用本地存储');
    }
  }
  
  // Fallback 到本地存储
  const originalLength = loansCache?.length || 0;
  loansCache = (loansCache || []).filter(loan => loan.batchDate !== batchDate);
  deletedCount = originalLength - (loansCache?.length || 0);
  saveToLocalStorage(loansCache || []);
  
  // 更新批次日期文件
  const allDates = [...new Set(loansCache.map(loan => loan.batchDate).filter((date): date is string => date !== undefined))];
  batchDatesCache = allDates.sort((a, b) => (b || '').localeCompare(a || ''));
  saveBatchDatesToLocalStorage(batchDatesCache);
  
  // 删除后强制刷新缓存
  initCache(true);
  
  return { deletedCount };
}

// 保存汇丰贷款数据
export async function saveHSBCLoans(loans: HSBCLoan[], mode: 'replace' | 'merge' = 'replace'): Promise<void> {
  // 强制刷新缓存，确保拿到最新数据
  initCache(true);
  
  // 获取批次日期
  const batchDate = loans[0]?.batchDate || new Date().toISOString().split('T')[0];
  
  const supabaseAvailable = await isSupabaseAvailable();
  
  if (supabaseAvailable) {
    try {
      const client = getSupabaseClient();
      
      if (mode === 'replace') {
        // 覆盖模式：删除该批次的所有旧数据
        const { error: deleteError } = await client
          .from('hsbc_loans')
          .delete()
          .eq('batch_date', batchDate);
        
        if (deleteError) {
          console.error('删除旧数据失败:', deleteError);
        }
      }
      
      // 辅助函数：安全转换为数字
      const safeToNumber = (val: unknown): number => {
        if (typeof val === 'number' && !isNaN(val) && isFinite(val)) return val;
        if (typeof val === 'string') {
          const cleaned = val.replace(/[,，\s{}()\[\]]/g, '').trim();
          const num = parseFloat(cleaned);
          if (!isNaN(num) && isFinite(num)) return num;
        }
        return 0;
      };
      
      // 转换数据格式
      const dbLoans = loans.map(loan => {
        const loanAmount = safeToNumber(loan.loanAmount);
        const balance = safeToNumber(loan.balance);
        const pastdueAmount = safeToNumber(loan.pastdueAmount);
        const overdueDays = Math.floor(safeToNumber(loan.overdueDays));
        
        return {
          batch_date: batchDate,
          loan_reference: String(loan.loanReference || ''),
          merchant_id: String(loan.merchantId || ''),
          merchant_name: String(loan.merchantName || ''),
          borrower_name: String(loan.borrowerName || ''),
          currency: loan.loanCurrency === 'USD' ? 'USD' : 'CNY',
          loan_date: String(loan.loanStartDate || loan.loanDate || ''),
          maturity_date: String(loan.maturityDate || ''),
          loan_interest: String(loan.loanInterest || ''),
          interest_rate: safeToNumber(loan.totalInterestRate),
          loan_tenor: String(loan.loanTenor || ''),
          loan_amount: loanAmount,
          balance: balance > 0 ? balance : loanAmount,
          pastdue_amount: pastdueAmount,
          overdue_days: overdueDays,
          status: loan.status || 'normal',
          repayment_schedule: loan.repaymentSchedule || [],
          total_repaid: safeToNumber(loan.totalRepaid),
          remarks: String(loan.remarks || ''),
        };
      });
      
      // 分批插入数据
      const BATCH_SIZE = 500;
      for (let i = 0; i < dbLoans.length; i += BATCH_SIZE) {
        const batch = dbLoans.slice(i, i + BATCH_SIZE);
        console.log(`插入第 ${Math.floor(i / BATCH_SIZE) + 1} 批数据，共 ${batch.length} 条`);
        const { error } = await client
          .from('hsbc_loans')
          .upsert(batch, { onConflict: 'loan_reference' });
        
        if (error) {
          throw error;
        }
      }
      
      // 同时更新 hsbc_loan_batches 表
      const { error: batchError } = await client
        .from('hsbc_loan_batches')
        .upsert({ batch_date: batchDate }, { onConflict: 'batch_date' });
      
      if (!batchError) {
        console.log(`成功更新批次日期表: ${batchDate}`);
      }
      
      return;
    } catch (error) {
      console.log('Supabase 保存失败，使用本地存储');
    }
  }
  
  // Fallback 到本地存储
  if (mode === 'replace') {
    // 覆盖模式：删除该批次的所有旧数据
    loansCache = (loansCache || []).filter(loan => loan.batchDate !== batchDate);
  }
  
  // 添加新数据
  loansCache = [...(loansCache || []), ...loans];
  
  // 去重（基于 loanReference + batchDate 组合）
  const seen = new Set<string>();
  loansCache = loansCache.filter(loan => {
    const key = `${loan.loanReference}-${loan.batchDate}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  
  saveToLocalStorage(loansCache);
  
  // 更新批次日期文件 - 确保新上传的批次日期被添加
  const existingDates = batchDatesCache || loadBatchDatesFromLocalStorage();
  const loanDates = [...new Set(loansCache.map(loan => loan.batchDate).filter((date): date is string => date !== undefined))];
  
  // 合并现有的批次日期和贷款数据中的批次日期，去重
  const allDatesSet = new Set([...existingDates, ...loanDates]);
  const allDates = Array.from(allDatesSet).sort((a, b) => (b || '').localeCompare(a || ''));
  
  batchDatesCache = allDates;
  saveBatchDatesToLocalStorage(batchDatesCache);
  
  console.log(`✅ 更新批次日期文件，共 ${allDates.length} 个批次:`, allDates);
  
  // 保存后强制刷新缓存，确保下次读取时是最新数据
  initCache(true);
}
