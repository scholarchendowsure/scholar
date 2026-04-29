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
  
  // Test different search patterns
  console.log('Testing search patterns for tenor:');
  console.log('  "Loan Tenor":', headers.findIndex(h => h === 'Loan Tenor'));
  console.log('  includes "tenor":', headers.findIndex(h => h.toLowerCase().includes('tenor')));
  console.log('  includes "loan" && includes "tenor":', headers.findIndex(h => h.toLowerCase().includes('loan') && h.toLowerCase().includes('tenor')));
  
  console.log('\nHeader 8 actual value:', JSON.stringify(headers[8]));
}

main().catch(console.error);
