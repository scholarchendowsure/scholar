#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// 读取贷款数据
const loansPath = path.join(process.cwd(), 'public/data/hsbc-loans.json');
const loansData = JSON.parse(fs.readFileSync(loansPath, 'utf-8'));

console.log('========== 商户ID 74283 相关贷款分析 ==========\n');

const targetMerchantId = '74283';
const targetBatchDate = '2026-05-07';

console.log(`选定批次日期: ${targetBatchDate}`);
console.log(`目标商户ID: ${targetMerchantId}\n`);

// 筛选条件
const targetLoans = loansData.filter((loan: any) => 
  loan.merchantId === targetMerchantId && 
  loan.batchDate === targetBatchDate
);

console.log(`找到 ${targetLoans.length} 笔贷款：\n`);

let totalPastdueAmount = 0;
const loanRefs = new Set<string>();

targetLoans.forEach((loan: any, index: number) => {
  const isDuplicate = loanRefs.has(loan.loanReference);
  if (isDuplicate) {
    console.log(`⚠️  第${index+1}笔: 重复的贷款编号！`);
  } else {
    loanRefs.add(loan.loanReference);
    totalPastdueAmount += loan.pastdueAmount || 0;
  }
  
  console.log(`  第${index+1}笔:`);
  console.log(`    贷款编号: ${loan.loanReference}`);
  console.log(`    批次日期: ${loan.batchDate}`);
  console.log(`    商户ID: ${loan.merchantId}`);
  console.log(`    到期日: ${loan.maturityDate}`);
  console.log(`    贷款金额: ${loan.loanAmount}`);
  console.log(`    余额: ${loan.balance}`);
  console.log(`    已还金额: ${loan.totalRepaid}`);
  console.log(`    逾期金额: ${loan.pastdueAmount}`);
  console.log(`    状态: ${loan.status}`);
  console.log(`    逾期天数: ${loan.overdueDays}`);
  console.log();
});

console.log('========== 计算结果 ==========\n');
console.log(`贷款编号去重前: ${targetLoans.length} 笔`);
console.log(`贷款编号去重后: ${loanRefs.size} 笔`);
console.log();
console.log(`去重后的逾期金额合计: ${totalPastdueAmount.toLocaleString()}`);
console.log();

// 打印所有唯一贷款编号的逾期金额明细
console.log('========== 去重后每笔贷款的逾期金额明细 ==========\n');
let detailTotal = 0;
const seen = new Set<string>();
targetLoans.forEach((loan: any) => {
  if (seen.has(loan.loanReference)) return;
  seen.add(loan.loanReference);
  const pd = loan.pastdueAmount || 0;
  detailTotal += pd;
  console.log(`${loan.loanReference}: ${pd.toLocaleString()}`);
});
console.log(`合计: ${detailTotal.toLocaleString()}`);
