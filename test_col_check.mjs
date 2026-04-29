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
  
  console.log('All headers (indices 0-20):');
  for (let i = 0; i <= 20; i++) {
    console.log(`  ${i}: "${headers[i]}"`);
  }
}

main().catch(console.error);
