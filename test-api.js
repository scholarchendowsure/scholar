const path = require('path');
const fs = require('fs');

const DATA_DIR = '/tmp/hsbc-data';
const DATA_FILE = path.join(DATA_DIR, 'loans.json');

console.log('DATA_DIR:', DATA_DIR);
console.log('DATA_FILE:', DATA_FILE);
console.log('exists:', fs.existsSync(DATA_FILE));

if (fs.existsSync(DATA_FILE)) {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const data = JSON.parse(raw);
  const loans = data['2026-04-28'] || [];
  console.log('Loans count:', loans.length);
  console.log('First loan:', loans[0]?.loanReference, loans[0]?.totalRepaid);
}
