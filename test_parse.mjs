import XLSX from 'xlsx';

const workbook = XLSX.readFile('public/test_excel.xlsx', { cellDates: true });
console.log('Sheet names:', workbook.SheetNames);

const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
console.log('Sheet type:', typeof firstSheet);
console.log('!ref:', firstSheet['!ref']);

const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1');
console.log('Rows:', range.e.r - range.s.r + 1);
console.log('Cols:', range.e.c - range.s.c + 1);

// Check first row (headers)
console.log('\nFirst row (headers):');
for (let c = 0; c <= Math.min(range.e.c, 15); c++) {
  const cellRef = XLSX.utils.encode_cell({ r: 0, c });
  const cell = firstSheet[cellRef];
  console.log(`  ${cellRef}: value="${cell?.v}", type="${cell?.t}"`);
}
