import * as fs from 'fs';
import http from 'http';

async function main() {
  // Parse
  const buffer = fs.readFileSync('assets/AMAZON_EMF0428_20260429123620304.xlsx');
  
  const boundary = '----Test' + Math.random().toString(36).substring(2);
  const fileHeader = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.xlsx"\r\nContent-Type: application/octet-stream\r\n\r\n`
  );
  const fileFooter = Buffer.from(`\r\n--${boundary}--\r\n`);
  const fileBody = Buffer.concat([fileHeader, buffer, fileFooter]);
  
  console.log('1. Parsing Excel...');
  const parseResult = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 5000, path: '/api/hsbc/parse', method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': fileBody.length },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(fileBody);
    req.end();
  });
  
  const parsed = JSON.parse(parseResult.data);
  console.log(`   Parsed: ${parsed.loans?.length} loans`);
  
  // Check first loan
  if (parsed.loans && parsed.loans.length > 0) {
    const firstLoan = parsed.loans[0];
    console.log('\n2. First loan fields:');
    console.log(`   loanReference: ${firstLoan.loanReference}`);
    console.log(`   loanStartDate: ${firstLoan.loanStartDate}`);
    console.log(`   loanInterest: ${firstLoan.loanInterest}`);
    console.log(`   loanTenor: ${firstLoan.loanTenor}`);
  }
  
  // Import
  console.log('\n3. Importing...');
  const importBody = JSON.stringify({
    loans: parsed.loans,
    batchDate: '2026-04-28',
    mode: 'replace',
  });
  
  const importResult = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 5000, 
      path: '/api/hsbc/import?batchDate=2026-04-28', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(importBody) },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(importBody);
    req.end();
  });
  
  const imported = JSON.parse(importResult.data);
  console.log(`   ${importResult.status} - ${imported.message}`);
  
  // Check database
  console.log('\n4. Database check:');
  const checkResult = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 5000, 
      path: '/api/hsbc/loans?batchDate=2026-04-28&pageSize=3', method: 'GET',
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.end();
  });
  
  const checkData = JSON.parse(checkResult.data);
  if (checkData.data && checkData.data.length > 0) {
    const loan = checkData.data[0];
    console.log(`   First loan in API:`);
    console.log(`     loanReference: ${loan.loanReference}`);
    console.log(`     loanStartDate: ${loan.loanStartDate}`);
    console.log(`     loanInterest: ${loan.loanInterest}`);
    console.log(`     loanTenor: ${loan.loanTenor}`);
  }
}

main().catch(console.error);
