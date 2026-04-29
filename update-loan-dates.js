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

async function updateLoanDates() {
  try {
    console.log('开始读取Excel文件...');
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
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
    const startDateIdx = findColumnIndex(['Loan Start Date', 'Loan Start', 'Start Date']);
    
    console.log(`列索引 - 贷款编号: ${loanRefIdx}, 贷款日期: ${startDateIdx}`);
    
    // 建立贷款编号到日期的映射
    const loanDateMap = new Map();
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      const loanRef = String(getCellValue(row, loanRefIdx) || '').trim();
      const rawDate = getCellValue(row, startDateIdx);
      const parsedDate = parseExcelDate(rawDate);
      
      if (loanRef && parsedDate) {
        loanDateMap.set(loanRef, parsedDate);
      }
    }
    
    console.log(`找到 ${loanDateMap.size} 条贷款日期数据`);
    
    // 分批更新数据库
    const loanRefs = Array.from(loanDateMap.keys());
    const batchSize = 100;
    let updated = 0;
    let errors = 0;
    
    for (let i = 0; i < loanRefs.length; i += batchSize) {
      const batchRefs = loanRefs.slice(i, i + batchSize);
      
      console.log(`正在更新第 ${Math.floor(i / batchSize) + 1} 批，共 ${batchRefs.length} 条...`);
      
      for (const loanRef of batchRefs) {
        const loanDate = loanDateMap.get(loanRef);
        
        const { error } = await supabase
          .from('hsbc_loans')
          .update({ loan_date: loanDate })
          .eq('loan_reference', loanRef);
          
        if (error) {
          console.error(`更新 ${loanRef} 失败:`, error.message);
          errors++;
        } else {
          updated++;
        }
      }
      
      if (updated % 500 === 0) {
        console.log(`已更新 ${updated} 条记录...`);
      }
    }
    
    console.log(`\n更新完成！总计: ${updated} 成功, ${errors} 失败`);
    
    // 验证结果
    const { data: verifyData } = await supabase
      .from('hsbc_loans')
      .select('loan_reference, loan_date, maturity_date')
      .limit(10);
    
    console.log('\n验证数据（前10条）:');
    verifyData?.forEach(row => {
      console.log(`${row.loan_reference}: ${row.loan_date || '(空)'}`);
    });
    
    const hasDates = verifyData?.filter(row => row.loan_date).length || 0;
    console.log(`\n前10条中有 ${hasDates} 条有贷款日期`);
    
  } catch (err) {
    console.error('更新错误:', err.message);
    console.error(err.stack);
  }
}

updateLoanDates();
