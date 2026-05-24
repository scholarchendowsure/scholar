#!/usr/bin/env node
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const excelPath = path.join(process.cwd(), 'assets/法律诉讼信息模板.xlsx');
const caseId = 'DSL17421023520618258';

console.log('测试法律诉讼API接口');
console.log('案件ID:', caseId);
console.log('Excel文件:', excelPath);

try {
  // 1. 读取Excel文件
  console.log('\n=== 1. 读取Excel文件 ===');
  const fileBuffer = fs.readFileSync(excelPath);
  const workbook = XLSX.read(fileBuffer);
  
  console.log('工作表列表:', workbook.SheetNames);
  
  // 2. 解析Excel数据
  console.log('\n=== 2. 解析Excel数据 ===');
  
  let litigationRecords = [];
  let limitHighRecords = [];
  let endCaseRecords = [];
  let courtNoticeRecords = [];
  
  // 解析司法案件 Sheet
  if (workbook.SheetNames.includes('司法案件')) {
    const sheet = workbook.Sheets['司法案件'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row && row.length > 0 && row[0]) {
        litigationRecords.push({
          id: `litigation-${i}`,
          caseName: row[1] || '',
          caseIdentity: row[2] || '',
          caseNumber: row[3] || '',
          caseCause: row[4] || '',
          caseAmount: row[5] || '',
          caseProgress: row[6] || '',
          courtName: row[7] || ''
        });
      }
    }
    console.log('司法案件记录:', litigationRecords.length);
  }
  
  // 解析限制高消费 Sheet
  if (workbook.SheetNames.includes('限制高消费')) {
    const sheet = workbook.Sheets['限制高消费'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row && row.length > 0 && row[0]) {
        limitHighRecords.push({
          id: `limit-${i}`,
          caseNumber: row[1] || '',
          limitObject: row[2] || '',
          relatedObject: row[3] || '',
          applicant: row[4] || '',
          executionCourt: row[5] || '',
          filingDate: row[6] || '',
          publishDate: row[7] || ''
        });
      }
    }
    console.log('限制高消费记录:', limitHighRecords.length);
  }
  
  // 解析终本案件 Sheet
  if (workbook.SheetNames.includes('终本案件')) {
    const sheet = workbook.Sheets['终本案件'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row && row.length > 0 && row[0]) {
        endCaseRecords.push({
          id: `end-${i}`,
          caseNumber: row[1] || '',
          subjectName: row[2] || '',
          unpaidAmount: row[3] || '',
          executionAmount: row[4] || '',
          executionCourt: row[5] || '',
          filingDate: row[6] || '',
          endDate: row[7] || ''
        });
      }
    }
    console.log('终本案件记录:', endCaseRecords.length);
  }
  
  // 解析开庭公告 Sheet
  if (workbook.SheetNames.includes('开庭公告')) {
    const sheet = workbook.Sheets['开庭公告'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row && row.length > 0 && row[0]) {
        courtNoticeRecords.push({
          id: `notice-${i}`,
          caseNumber: row[1] || '',
          caseCause: row[2] || '',
          parties: row[3] || '',
          court: row[4] || '',
          hearingDate: row[5] || ''
        });
      }
    }
    console.log('开庭公告记录:', courtNoticeRecords.length);
  }
  
  // 3. 测试API接口
  console.log('\n=== 3. 测试API接口 ===');
  
  const requestBody = {
    caseId,
    litigationRecords,
    limitHighRecords,
    endCaseRecords,
    courtNoticeRecords
  };
  
  console.log('请求数据:', JSON.stringify(requestBody, null, 2));
  
  // 调用本地API
  const response = await fetch('http://localhost:5000/api/legal-litigation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });
  
  console.log('响应状态:', response.status);
  
  const result = await response.json();
  console.log('响应结果:', JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('\n✅ API调用成功！');
  } else {
    console.log('\n❌ API调用失败！');
  }
  
} catch (error) {
  console.error('测试失败:', error);
}
