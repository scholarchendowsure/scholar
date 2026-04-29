import { createClient } from '@supabase/supabase-js';
import type { HSBCLoan } from '@/lib/hsbc-loan';
import { getSupabaseClient } from './supabase-client';

// Re-export HSBCLoan type
export type { HSBCLoan } from '@/lib/hsbc-loan';

// 初始化 Supabase 客户端
function getClient() {
  return getSupabaseClient();
}

// 将数据库行转换为 HSBCLoan 类型
function transformRow(row: Record<string, unknown>): HSBCLoan {
  const repaymentSchedule = (row.repayment_schedule as HSBCLoan['repaymentSchedule']) || [];
  const loanAmount = Number(row.loan_amount) || 0;
  const balance = Number(row.balance) || 0;
  
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
    totalRepaid: Math.max(0, loanAmount - balance),
  };
  
  return baseLoan;
}

// 获取所有汇丰贷款
export async function getAllHSBCLoans(): Promise<HSBCLoan[]> {
  const client = getClient();
  const allLoans: HSBCLoan[] = [];
  const BATCH_SIZE = 1000;
  
  // 分批获取数据，Supabase 默认限制 1000 行/页
  while (true) {
    const { data, error } = await client
      .from('hsbc_loans')
      .select('*')
      .order('loan_reference')
      .range(allLoans.length, allLoans.length + BATCH_SIZE - 1);
    
    if (error) {
      console.error('获取汇丰贷款失败:', error);
      throw new Error(`获取汇丰贷款失败: ${error.message}`);
    }
    
    if (!data || data.length === 0) break;
    allLoans.push(...data.map(transformRow));
    
    if (data.length < BATCH_SIZE) break;
  }
  
  return allLoans;
}

// 按批次日期获取汇丰贷款（从 JSON 缓存文件获取，包含完整的还款计划数据）
export async function getHSBCLoansByBatchDate(batchDate: string): Promise<HSBCLoan[]> {
  try {
    // 动态导入 hsbc-data 模块
    const hsbcData = await import('@/lib/hsbc-data');
    return hsbcData.getLoansByBatchDate(batchDate);
  } catch (err) {
    console.error('从 JSON 获取贷款失败:', err);
    return [];
  }
}

// 获取所有批次日期
export async function getAllBatchDates(): Promise<string[]> {
  try {
    // 从 JSON 缓存获取批次日期
    const hsbcData = await import('@/lib/hsbc-data');
    const dates = hsbcData.getBatchDates();
    if (dates && dates.length > 0) {
      return dates;
    }
  } catch (err) {
    console.error('从 JSON 获取批次日期失败:', err);
  }
  
  // 备用：从数据库获取
  const client = getClient();
  const { data, error } = await client
    .from('hsbc_loan_batches')
    .select('batch_date')
    .order('batch_date', { ascending: false });
  
  if (error) {
    console.error('获取批次日期失败:', error);
    throw new Error(`获取批次日期失败: ${error.message}`);
  }
  
  return (data || []).map((row: Record<string, unknown>) => row.batch_date as string);
}

// 获取所有汇丰贷款（从 JSON 缓存文件）
function getAllLoans(): HSBCLoan[] {
  try {
    // 动态导入 hsbc-data 模块
    const { getAllLoans: getLoansFromJson } = require('@/lib/hsbc-data');
    return getLoansFromJson();
  } catch (err) {
    console.error('加载汇丰数据失败:', err);
    return [];
  }
}

// 根据贷款编号获取单条贷款
export async function getHSBCLoanByReference(loanReference: string): Promise<HSBCLoan | null> {
  // 优先从缓存文件读取
  const allLoans = getAllLoans();
  const loan = allLoans.find(l => l.loanReference === loanReference);
  if (loan) {
    return loan;
  }
  
  // 回退到数据库
  const client = getClient();
  const { data, error } = await client
    .from('hsbc_loans')
    .select('*')
    .eq('loan_reference', loanReference)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('获取贷款详情失败:', error);
    throw new Error(`获取贷款详情失败: ${error.message}`);
  }
  
  return transformRow(data);
}

// 保存汇丰贷款数据
export async function saveHSBCLoans(loans: HSBCLoan[]): Promise<void> {
  const client = getClient();
  
  // 获取或创建批次
  const batchDate = loans[0]?.batchDate || new Date().toISOString().split('T')[0];
  
  // 查找或创建批次记录
  let batchId: number | null = null;
  
  const { data: existingBatch } = await client
    .from('hsbc_loan_batches')
    .select('id')
    .eq('batch_date', batchDate)
    .single();
  
  if (existingBatch) {
    batchId = existingBatch.id as number;
    // 删除旧数据
    await client
      .from('hsbc_loans')
      .delete()
      .eq('batch_id', batchId);
  } else {
    // 创建新批次
    const { data: newBatch, error: insertError } = await client
      .from('hsbc_loan_batches')
      .insert({ batch_date: batchDate })
      .select('id')
      .single();
    
    if (insertError || !newBatch) {
      console.error('创建批次失败:', insertError);
      throw new Error(`创建批次失败: ${insertError?.message || '未知错误'}`);
    }
    batchId = newBatch.id as number;
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
  
  // 辅助函数：将数字转换为 PostgreSQL numeric 格式字符串
  const toNumericString = (val: number): string => {
    if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) return '0';
    return val.toString();
  };
  
  // 转换数据格式 - 只插入数据库表中存在的列
  const dbLoans = loans.map(loan => {
    const loanAmount = safeToNumber(loan.loanAmount);
    const balance = safeToNumber(loan.balance);
    const pastdueAmount = safeToNumber(loan.pastdueAmount);
    const overdueDays = Math.floor(safeToNumber(loan.overdueDays));
    
    return {
      batch_id: batchId,
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
      // numeric 类型列直接传数字
      loan_amount: loanAmount,
      balance: balance > 0 ? balance : loanAmount,
      pastdue_amount: pastdueAmount,
      overdue_days: overdueDays,
      status: loan.status || 'normal',
      repayment_schedule: loan.repaymentSchedule || [],
    };
  });
  
  // 批量插入数据
  console.log('准备插入的数据示例:', JSON.stringify(dbLoans.slice(0, 2), null, 2));
  const { error } = await client
    .from('hsbc_loans')
    .insert(dbLoans);
  
  if (error) {
    console.error('保存汇丰贷款失败:', error);
    throw new Error(`保存汇丰贷款失败: ${error.message}`);
  }
}
