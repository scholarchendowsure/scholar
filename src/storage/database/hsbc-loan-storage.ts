import { createClient } from '@supabase/supabase-js';
import type { HSBCLoan } from '@/lib/hsbc-loan';
import type { HSBCBatchDate } from '@/lib/hsbc-loan';

// 初始化 Supabase 客户端
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.COZE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.COZE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not set');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// 将数据库行转换为 HSBCLoan 类型
function transformRow(row: Record<string, unknown>): HSBCLoan {
  return {
    loanReference: row.loan_reference as string,
    merchantId: row.merchant_id as string,
    merchantName: row.merchant_name as string,
    borrowerName: row.borrower_name as string,
    loanCurrency: row.currency as 'CNY' | 'USD',
    loanDate: row.loan_date as string,
    maturityDate: row.maturity_date as string,
    loanAmount: Number(row.loan_amount) || 0,
    balance: Number(row.balance) || 0,
    pastdueAmount: Number(row.pastdue_amount) || 0,
    overdueDays: Number(row.overdue_days) || 0,
    status: row.status as HSBCLoan['status'],
    repaymentSchedule: (row.repayment_schedule as HSBCLoan['repaymentSchedule']) || [],
    remarks: row.remarks as string || '',
  };
}

// 获取所有汇丰贷款
export async function getAllHSBCLoans(): Promise<HSBCLoan[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('hsbc_loans')
    .select('*')
    .order('loan_reference');
  
  if (error) {
    console.error('获取汇丰贷款失败:', error);
    throw new Error(`获取汇丰贷款失败: ${error.message}`);
  }
  
  return (data || []).map(transformRow);
}

// 按批次日期获取汇丰贷款 - 使用JOIN查询
export async function getHSBCLoansByBatchDate(batchDate: string): Promise<HSBCLoan[]> {
  const client = getSupabaseClient();
  
  // 首先获取批次ID
  const { data: batchData, error: batchError } = await client
    .from('hsbc_loan_batches')
    .select('id')
    .eq('batch_date', batchDate)
    .single();
  
  if (batchError || !batchData) {
    // 如果没有找到批次，返回空数组
    console.warn('未找到批次:', batchDate);
    return [];
  }
  
  // 使用批次ID获取贷款
  const { data, error } = await client
    .from('hsbc_loans')
    .select('*')
    .eq('batch_id', batchData.id)
    .order('loan_reference');
  
  if (error) {
    console.error('获取汇丰贷款失败:', error);
    throw new Error(`获取汇丰贷款失败: ${error.message}`);
  }
  
  return (data || []).map(transformRow);
}

// 获取所有批次日期
export async function getAllBatchDates(): Promise<HSBCBatchDate[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('hsbc_loan_batches')
    .select('batch_date')
    .order('batch_date', { ascending: false });
  
  if (error) {
    console.error('获取批次日期失败:', error);
    throw new Error(`获取批次日期失败: ${error.message}`);
  }
  
  return (data || []).map(row => row.batch_date as HSBCBatchDate);
}

// 保存汇丰贷款数据
export async function saveHSBCLoans(loans: HSBCLoan[]): Promise<void> {
  const client = getSupabaseClient();
  
  // 获取或创建批次
  const batchDate = loans[0]?.batchDate || new Date().toISOString().split('T')[0];
  
  // 查找或创建批次记录
  let { data: existingBatch } = await client
    .from('hsbc_loan_batches')
    .select('id')
    .eq('batch_date', batchDate)
    .single();
  
  let batchId: number;
  
  if (existingBatch) {
    batchId = existingBatch.id;
    // 删除旧数据
    await client
      .from('hsbc_loans')
      .delete()
      .eq('batch_id', batchId);
  } else {
    // 创建新批次
    const { data: newBatch, error } = await client
      .from('hsbc_loan_batches')
      .insert({ batch_date: batchDate })
      .select('id')
      .single();
    
    if (error || !newBatch) {
      console.error('创建批次失败:', error);
      throw new Error('创建批次失败');
    }
    batchId = newBatch.id;
  }
  
  // 转换数据格式
  const dbLoans = loans.map(loan => ({
    batch_id: batchId,
    loan_reference: loan.loanReference,
    merchant_id: loan.merchantId || '',
    merchant_name: loan.merchantName || '',
    borrower_name: loan.borrowerName || '',
    currency: loan.loanCurrency || 'CNY',
    loan_date: loan.loanDate || '',
    maturity_date: loan.maturityDate || '',
    loan_amount: Number(loan.loanAmount) || 0,
    balance: Number(loan.balance || (Number(loan.loanAmount) || 0)),
    pastdue_amount: Number(loan.pastdueAmount || 0),
    overdue_days: Number(loan.overdueDays || 0),
    status: loan.status || 'normal',
    repayment_schedule: loan.repaymentSchedule || [],
    remarks: loan.remarks || '',
  }));
  
  // 批量插入数据
  const { error } = await client
    .from('hsbc_loans')
    .insert(dbLoans);
  
  if (error) {
    console.error('保存汇丰贷款失败:', error);
    throw new Error(`保存汇丰贷款失败: ${error.message}`);
  }
}
