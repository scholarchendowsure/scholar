const XLSX = require('xlsx');
const filePath = '/workspace/projects/assets/解密.xlsx';

console.log('正在读取Excel文件...');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log('\n列标题（前20列）:');
const headerRow = rawData[0].map((h, i) => `${i}: "${String(h || '').trim()}"`);
console.log(headerRow.slice(0, 30).join('\n'));

console.log('\n第一行数据（前20列）:');
if (rawData.length > 1) {
  const firstRow = rawData[1].map((h, i) => `${i}: "${String(h || '').trim()}"`);
  console.log(firstRow.slice(0, 30).join('\n'));
}
