const XLSX = require('xlsx');

const filePath = '/workspace/projects/assets/解密.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  console.log('Total rows:', rawData.length);
  console.log('Total columns:', rawData[0].length);
  
  // Process headers
  const headerRow = rawData[0].map((h) => String(h || '').replace(/[\n\r]/g, ' ').trim());
  
  console.log('\nAll Headers:');
  headerRow.forEach((h, i) => {
    console.log(`  [${i}] "${h}"`);
  });
  
  // Find repayment related columns
  console.log('\nRepayment related columns:');
  headerRow.forEach((h, i) => {
    const hl = h.toLowerCase();
    if (hl.includes('repay') || hl.includes('payment') || hl.includes('install') || hl.includes('schedule') || hl.includes('principal') || hl.includes('interest')) {
      console.log(`  [${i}] "${h}"`);
    }
  });
  
  // Check first data row for all values
  if (rawData.length > 1) {
    const row1 = rawData[1];
    console.log('\nFirst data row - all values:');
    row1.forEach((v, i) => {
      if (v && v !== '') {
        console.log(`  [${i}] "${headerRow[i]}" = "${v}"`);
      }
    });
  }
} catch (err) {
  console.error('Error:', err.message);
  console.error(err.stack);
}
