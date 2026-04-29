const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.COZE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.COZE_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const filePath = '/workspace/projects/assets/解密.xlsx';

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
    const startDateIdx = findColumnIndex(['Loan Start', 'Start Date']);
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
    
    const parseDate = (dateValue) => {
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
        return String(val);
      }
      return val;
    };
    
    console.log('清空现有数据...');
    await supabase.from('hsbc_loans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    const batchDate = '2026-04-28';
    
    const batchSize = 50;
    let imported = 0;
    let errors = 0;
    
    for (let i = 1; i < rawData.length; i += batchSize) {
      const loansToInsert = [];
      
      for (let j = i; j < Math.min(i + batchSize, rawData.length); j++) {
        const row = rawData[j];
        const loanRef = cleanString(getCellValue(row, loanRefIdx));
        if (!loanRef) continue;
        
        const repayments = [];
        const pairCount = Math.min(repaymentDateIndices.length, repaymentAmountIndices.length);
        for (let k = 0; k < pairCount; k++) {
          const d = parseDate(getCellValue(row, repaymentDateIndices[k]));
          const a = Number(getCellValue(row, repaymentAmountIndices[k])) || 0;
          if (d && a > 0) {
            repayments.push({ date: d, amount: a });
          }
        }
        
        const totalRepaid = repayments.reduce((sum, r) => sum + r.amount, 0);
        
        loansToInsert.push({
          batch_id: batchDate,
          batch_date: batchDate,
          loan_reference: loanRef,
          merchant_id: cleanString(getCellValue(row, merchantIdIdx)),
          borrower_name: cleanString(getCellValue(row, borrowerIdx)),
          currency: getCellValue(row, currencyIdx) === 'USD' ? 'USD' : 'CNY',
          loan_date: parseDate(getCellValue(row, startDateIdx)),
          loan_amount: Number(getCellValue(row, amountIdx)) || 0,
          loan_interest: cleanString(getCellValue(row, interestIdx)),
          interest_rate: Number(getCellValue(row, rateIdx)) || 0,
          loan_tenor: cleanString(getCellValue(row, tenorIdx)),
          maturity_date: parseDate(getCellValue(row, maturityIdx)),
          balance: Number(getCellValue(row, balanceIdx)) || 0,
          pastdue_amount: Number(getCellValue(row, pastdueIdx)) || 0,
          status: 'normal',
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
        console.log(`已导入 ${imported} 条记录...`);
      }
    }
    
    console.log(`\n导入完成！总计: ${imported} 成功, ${errors} 失败`);
    
    // 验证
    const { data: verifyData } = await supabase
      .from('hsbc_loans')
      .select('loan_reference, loan_amount, total_repaid')
      .eq('loan_reference', 'EMFAM1023160');
    
    console.log('\n验证 EMFAM1023160:', verifyData);
    
  } catch (err) {
    console.error('导入错误:', err.message);
  }
}

importToDatabase();
