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
  
  // Find tenor column
  const tenorIdx = headers.findIndex(h => String(h).toLowerCase().includes('tenor'));
  console.log('Tenor column index:', tenorIdx);
  console.log('Header:', headers[tenorIdx]);
  
  // Show first 5 tenor values
  console.log('\nFirst 5 tenor values:');
  for (let i = 1; i <= 5; i++) {
    const ref = rawData[i][0];
    const tenor = rawData[i][tenorIdx];
    console.log(`  Row ${i} (${ref}): "${tenor}"`);
  }
}

main().catch(console.error);
