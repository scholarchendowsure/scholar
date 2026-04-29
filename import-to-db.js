const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.COZE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.COZE_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const filePath = '/workspace/projects/assets/解密.xlsx';

// 解析Excel日期序列号
const parseExcelDate = (dateValue) => {
  if (!dateValue || dateValue === '') return '';
  if (typeof dateValue === 'number' && dateValue > 40000 && dateValue < 60000) {
    const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
    const year = excelDate.getFullYear();
    const month = String(excelDate.getMonth() + 1).padStart(2, '0');
    const day = String(excelDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(dateValue);
};

// 解析日期字符串（支持多种格式）
const parseDateString = (dateStr) => {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  
  // 格式: DD-MMM-YYYY (如 18-Dec-2025)
  const dmmyMatch = str.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (dmmyMatch) {
    const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    const month = months[dmmyMatch[2].toLowerCase()];
    const day = String(dmmyMatch[1]).padStart(2, '0');
    const year = dmmyMatch[3];
    return `${year}-${String(month).padStart(2, '0')}-${day}`;
  }
  
  // 格式: YYYY-MM-DD
  const ymdMatch = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${String(ymdMatch[2]).padStart(2, '0')}-${String(ymdMatch[3]).padStart(2, '0')}`;
  }
  
  return str;
};

// 解析日期值（处理多值情况，取后面的日期）
// 例如: "18-Dec-2025\nExtend date :17-Apr-2026" → 取后面的日期 17-Apr-2026
const parseDate = (dateValue) => {
  if (!dateValue || dateValue === '') return '';
  
  const str = String(dateValue);
  
  // 如果包含换行符，取后面的日期
  if (str.includes('\n')) {
    const parts = str.split('\n');
    // 找到最后一个有效的日期部分
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i].trim();
      // 跳过 "Extend date :" 等前缀
      const datePart = part.replace(/^Extend\s*date\s*:\s*/i, '').trim();
      const parsed = parseDateString(datePart);
      if (parsed) return parsed;
    }
  }
  
  // 单个日期值
  if (typeof dateValue === 'number') {
    return parseExcelDate(dateValue);
  }
  
  return parseDateString(str);
};

// 解析数值（处理多值情况，取前面的数值）
// 例如: "7000000\nExtend loan amount:4865677.25" → 取前面的数值 7000000
const parseAmount = (amountValue) => {
  if (!amountValue || amountValue === '') return 0;
  
  const str = String(amountValue);
  
  // 如果包含换行符，取前面的数值
  if (str.includes('\n')) {
    const parts = str.split('\n');
    const firstPart = parts[0].trim();
    const num = parseFloat(firstPart.replace(/,/g, ''));
    if (!isNaN(num)) return num;
  }
  
  // 单个数值
  if (typeof amountValue === 'number') {
    return amountValue;
  }
  
  const num = parseFloat(String(amountValue).replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
};

const cleanString = (val) => {
  if (!val) return '';
  return String(val).replace(/[\n\r\t]/g, ' ').trim();
};

const getCellValue = (row, idx) => {
  if (idx < 0 || idx >= row.length) return '';
  const val = row[idx];
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if (typeof val.v === 'number') return val.v;
    if (typeof val.w === 'string') return val.w;
    if (val.t === 's') return String(val.v);
    return String(val);
  }
  return val;
};

async function importToDatabase() {
  try {
    console.log('开始导入数据到数据库...');
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    console.log('总行数:', rawData.length);
    
    const headerRow = rawData[0].map((h) => String(h || '').replace(/[\n\r]/g, ' ').trim());
    
    const findColumnIndex = (keywords) => {
      for (let i = 0; i < headerRow.length; i++) {
        const headerLower = headerRow[i].toLowerCase();
        for (const kw of keywords) {
          if (headerLower.includes(kw.toLowerCase())) return i;
        }
      }
      return -1;
    };
    
    const loanRefIdx = findColumnIndex(['Loan Reference']);
    const merchantIdIdx = findColumnIndex(['Merchant ID']);
    const borrowerIdx = findColumnIndex(['Borrower Name']);
    const startDateIdx = findColumnIndex(['Loan Start Date', 'Loan Start', 'Start Date']);
    const currencyIdx = findColumnIndex(['Loan Currency']);
    const amountIdx = headerRow.findIndex((h, i) => {
      const hl = h.toLowerCase();
      return hl === 'loan amount' || (hl.includes('loan') && hl.includes('amount') && i < 20);
    });
    const interestIdx = findColumnIndex(['Loan Interest']);
    const rateIdx = findColumnIndex(['Total Interest Rate']);
    const tenorIdx = headerRow.findIndex((h) => h.replace(/[\s\n\r]/g, '').toLowerCase().includes('tenor'));
    const maturityIdx = findColumnIndex(['Maturity Date']);
    const balanceIdx = headerRow.findIndex((h) => h.toLowerCase() === 'balance');
    const pastdueIdx = headerRow.findIndex((h) => h.toLowerCase().includes('pastdue'));
    const remarksIdx = findColumnIndex(['Remarks']);
    
    const repaymentDateIndices = [];
    const repaymentAmountIndices = [];
    for (let i = 0; i < headerRow.length; i++) {
      const h = headerRow[i].toLowerCase();
      if (h === 'repayment date' || (h.includes('repayment') && h.includes('date'))) {
        repaymentDateIndices.push(i);
      }
      if (h === 'repay amount' || (h.includes('repay') && h.includes('amount'))) {
        repaymentAmountIndices.push(i);
      }
    }
    
    console.log('清空现有数据...');
    await supabase.from('hsbc_loans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    const batchDate = '2026-04-29';
    
    const batchSize = 50;
    let imported = 0;
    let errors = 0;
    
    for (let i = 1; i < rawData.length; i += batchSize) {
      const loansToInsert = [];
      
      for (let j = i; j < Math.min(i + batchSize, rawData.length); j++) {
        const row = rawData[j];
        const loanRef = cleanString(getCellValue(row, loanRefIdx));
        if (!loanRef) continue;
        
        // 处理还款计划
        const repayments = [];
        const pairCount = Math.min(repaymentDateIndices.length, repaymentAmountIndices.length);
        for (let k = 0; k < pairCount; k++) {
          const d = parseDate(getCellValue(row, repaymentDateIndices[k]));
          const a = Number(getCellValue(row, repaymentAmountIndices[k])) || 0;
          if (d && a > 0) {
            repayments.push({ date: d, amount: a });
          }
        }
        
        // 使用解析函数处理多值情况（需要先声明再使用）
        const rawStartDate = getCellValue(row, startDateIdx);
        const rawLoanAmount = getCellValue(row, amountIdx);
        const rawMaturityDateVal = getCellValue(row, maturityIdx);
        
        const totalRepaid = repayments.reduce((sum, r) => sum + r.amount, 0);
        const loanAmount = parseAmount(rawLoanAmount);
        const calculatedBalance = Math.max(0, loanAmount - totalRepaid);
        const maturityDate = parseDate(rawMaturityDateVal);
        const isPastDue = maturityDate && new Date(maturityDate) < new Date() && calculatedBalance > 0.9;
        
        loansToInsert.push({
          batch_id: batchDate,
          batch_date: batchDate,
          loan_reference: loanRef,
          merchant_id: cleanString(getCellValue(row, merchantIdIdx)),
          borrower_name: cleanString(getCellValue(row, borrowerIdx)),
          currency: getCellValue(row, currencyIdx) === 'USD' ? 'USD' : 'CNY',
          loan_date: parseDate(rawStartDate),
          loan_amount: loanAmount,
          loan_interest: cleanString(getCellValue(row, interestIdx)),
          interest_rate: Number(getCellValue(row, rateIdx)) || 0,
          loan_tenor: cleanString(getCellValue(row, tenorIdx)),
          maturity_date: maturityDate,
          balance: calculatedBalance,
          pastdue_amount: isPastDue ? calculatedBalance : 0,
          status: isPastDue ? 'overdue' : 'normal',
          repayment_schedule: repayments,
          total_repaid: totalRepaid,
          remarks: cleanString(getCellValue(row, remarksIdx)),
          created_at: new Date().toISOString()
        });
      }
      
      if (loansToInsert.length > 0) {
        const { error } = await supabase.from('hsbc_loans').insert(loansToInsert);
        if (error) {
          console.error('插入失败:', error.message);
          errors += loansToInsert.length;
        } else {
          imported += loansToInsert.length;
        }
        if (imported % 500 === 0 || errors > 0) {
          console.log(`已导入 ${imported} 条记录...`);
        }
      }
    }
    
    console.log(`\n导入完成！总计: ${imported} 成功, ${errors} 失败`);
    
    // 验证数据
    const { data: verifyData } = await supabase
      .from('hsbc_loans')
      .select('loan_reference, loan_date, maturity_date, loan_amount, total_repaid')
      .limit(5);
    
    console.log('\n验证数据（前5条）:', verifyData);
    
  } catch (err) {
    console.error('导入错误:', err.message);
    console.error(err.stack);
  }
}

importToDatabase();
