
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('请设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 环境变量');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const BATCH_DATE = '2026-04-29';

async function fixBalances() {
  console.log('开始修复 balance 字段...');

  // 获取所有贷款
  const { data: loans, error } = await client
    .from('hsbc_loans')
    .select('id, loan_reference, loan_amount, total_repaid, balance, maturity_date, currency, status, overdue_days, pastdue_amount')
    .eq('batch_date', BATCH_DATE);

  if (error) {
    console.error('获取贷款数据失败:', error);
    return;
  }

  console.log(`共 ${loans.length} 条贷款记录`);

  let fixedCount = 0;
  let errors = 0;

  const batchDate = new Date(BATCH_DATE);

  for (const loan of loans) {
    // 计算正确的余额
    const correctBalance = Math.max(0, loan.loan_amount - loan.total_repaid);
    
    // 计算逾期天数
    let overdueDays = -1;
    let pastdueAmount = 0;
    let status = 'normal';

    if (loan.maturity_date) {
      const maturityDate = new Date(loan.maturity_date);
      const diffDays = Math.floor((batchDate - maturityDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0 && correctBalance > 0.9) {
        overdueDays = diffDays;
        pastdueAmount = correctBalance;
        status = 'overdue';
      }
    }

    // 检查是否需要更新
    if (Math.abs(loan.balance - correctBalance) > 0.01 || 
        loan.status !== status ||
        loan.overdue_days !== overdueDays ||
        Math.abs(loan.pastdue_amount - pastdueAmount) > 0.01) {
      
      const { error: updateError } = await client
        .from('hsbc_loans')
        .update({
          balance: correctBalance,
          status: status,
          overdue_days: overdueDays,
          pastdue_amount: pastdueAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', loan.id);

      if (updateError) {
        console.error(`更新贷款 ${loan.loan_reference} 失败:`, updateError);
        errors++;
      } else {
        fixedCount++;
        if (fixedCount % 100 === 0) {
          console.log(`已修复 ${fixedCount} 条...`);
        }
      }
    }
  }

  console.log('\n修复完成!');
  console.log(`- 修复记录数: ${fixedCount}`);
  console.log(`- 失败数: ${errors}`);

  // 验证一下修复结果
  const { data: verifyData, error: verifyError } = await client
    .from('hsbc_loans')
    .select('currency, balance, loan_amount, total_repaid')
    .eq('batch_date', BATCH_DATE);

  if (!verifyError) {
    let cnyBalance = 0;
    let usdBalance = 0;
    let cnyCalcBalance = 0;
    let usdCalcBalance = 0;

    for (const l of verifyData) {
      if (l.currency === 'CNY') {
        cnyBalance += l.balance;
        cnyCalcBalance += Math.max(0, l.loan_amount - l.total_repaid);
      } else {
        usdBalance += l.balance;
        usdCalcBalance += Math.max(0, l.loan_amount - l.total_repaid);
      }
    }

    console.log('\n验证结果:');
    console.log(`CNY - balance字段: ${(cnyBalance / 10000).toFixed(2)}万, 计算值: ${(cnyCalcBalance / 10000).toFixed(2)}万`);
    console.log(`USD - balance字段: ${(usdBalance / 10000).toFixed(2)}万, 计算值: ${(usdCalcBalance / 10000).toFixed(2)}万`);
    console.log(`折CNY总计 - balance字段: ${((cnyBalance + usdBalance * 7) / 10000).toFixed(2)}万, 计算值: ${((cnyCalcBalance + usdCalcBalance * 7) / 10000).toFixed(2)}万`);
  }
}

fixBalances().catch(console.error);

