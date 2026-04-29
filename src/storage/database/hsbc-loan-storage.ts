import { createClient } from '@supabase/supabase-js';
import type { HSBCLoan } from '@/lib/hsbc-loan';
import { getSupabaseClient } from './supabase-client';

// 初始化 Supabase 客户端
function getClient() {
  return getSupabaseClient();
}

// 将数据库行转换为 HSBCLoan 类型
function transformRow(row: Record<string, unknown>): HSBCLoan {
  return {
    id: String(row.id || ''),
    loanReference: String(row.loan_reference || ''),
    merchantId: String(row.merchant_id || ''),
    merchantName: String(row.merchant_name || ''),
    borrowerName: String(row.borrower_name || ''),
    loanCurrency: String(row.currency || 'CNY') === 'USD' ? 'USD' : 'CNY',
    loanStartDate: String(row.loan_date || ''),
    maturityDate: String(row.maturity_date || ''),
    loanAmount: Number(row.loan_amount) || 0,
    loanInterest: '',
    totalInterestRate: 0,
    loanTenor: '',
    balance: Number(row.balance) || 0,
    pastdueAmount: Number(row.pastdue_amount) || 0,
    overdueDays: Number(row.overdue_days) || 0,
    status: (row.status as HSBCLoan['status']) || 'active',
    repaymentSchedule: (row.repayment_schedule as HSBCLoan['repaymentSchedule']) || [],
    remarks: String(row.remarks || ''),
  };
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

// 按批次日期获取汇丰贷款
export async function getHSBCLoansByBatchDate(batchDate: string): Promise<HSBCLoan[]> {
  const client = getClient();
  
  // 首先获取批次ID
  const { data: batchData, error: batchError } = await client
    .from('hsbc_loan_batches')
    .select('id')
    .eq('batch_date', batchDate)
    .single();
  
  if (batchError || !batchData) {
    console.warn('未找到批次:', batchDate);
    return [];
  }
  
  const batchId = batchData.id;
  const allLoans: HSBCLoan[] = [];
  const BATCH_SIZE = 1000;
  
  // 分批获取数据，Supabase 默认限制 1000 行/页
  while (true) {
    const { data, error } = await client
      .from('hsbc_loans')
      .select('*')
      .eq('batch_id', batchId)
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
  
  console.log(`[DEBUG] getHSBCLoansByBatchDate(${batchDate}): batch_id=${batchId}, returned ${allLoans.length} rows`);
  
  return allLoans;
}

// 获取所有批次日期
export async function getAllBatchDates(): Promise<string[]> {
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
    
    return {
      batch_id: batchId,
      loan_reference: String(loan.loanReference || ''),
      merchant_id: String(loan.merchantId || ''),
      merchant_name: String(loan.merchantName || ''),
      borrower_name: String(loan.borrowerName || ''),
      currency: loan.loanCurrency === 'USD' ? 'USD' : 'CNY',
      loan_date: String(loan.loanDate || ''),
      maturity_date: String(loan.maturityDate || ''),
      loan_amount: toNumericString(loanAmount),
      balance: toNumericString(balance > 0 ? balance : loanAmount),
      pastdue_amount: toNumericString(pastdueAmount),
      overdue_days: Math.floor(safeToNumber(loan.overdueDays)),
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
