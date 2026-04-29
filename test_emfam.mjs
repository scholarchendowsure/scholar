import * as fs from 'fs';
import XLSX from 'xlsx';

async function main() {
  const buffer = fs.readFileSync('assets/AMAZON_EMF0428_20260429123620304.xlsx');
  const oc = await import('officecrypto-tool');
  const officecrypto = oc.default || oc;
  const decrypted = await officecrypto.decrypt(buffer, { password: 'amazon246' });
  
  const workbook = XLSX.read(decrypted, { type: 'buffer', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  const headers = rawData[0];
  
  // Find EMFAM1023160
  const loanRefIdx = 0;
  
  for (let i = 1; i < rawData.length; i++) {
    const ref = rawData[i][loanRefIdx];
    if (ref && String(ref).includes('1023160')) {
      console.log(`Found at row ${i}:`);
      console.log(`  Loan Reference: "${rawData[i][0]}"`);
      console.log(`  Loan Start Date (col 3): "${rawData[i][3]}"`);
      console.log(`  Loan Interest (col 6): "${rawData[i][6]}"`);
      console.log(`  Loan Tenor (col 8): "${rawData[i][8]}"`);
      break;
    }
  }
}

main().catch(console.error);
