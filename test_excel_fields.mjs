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
  
  // Search for loan date, tenor, interest columns
  console.log('Searching for key columns:');
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).toLowerCase();
    if (h.includes('loan') || h.includes('date') || h.includes('tenor') || h.includes('interest') || h.includes('rate')) {
      console.log(`  ${i}: "${headers[i]}"`);
    }
  }
  
  // Find first data row
  const firstRow = rawData[1];
  console.log('\nFirst data row values for key columns:');
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).toLowerCase();
    if (h.includes('loan') && (h.includes('date') || h.includes('start')) || 
        h.includes('tenor') || h.includes('interest') || h.includes('rate')) {
      console.log(`  "${headers[i]}" = "${firstRow[i]}"`);
    }
  }
}

main().catch(console.error);
