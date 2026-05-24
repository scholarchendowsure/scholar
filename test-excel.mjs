#!/usr/bin/env node
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const excelPath = path.join(process.cwd(), 'assets/法律诉讼信息模板.xlsx');

console.log('读取Excel文件:', excelPath);

try {
  // 读取Excel文件
  const fileBuffer = fs.readFileSync(excelPath);
  const workbook = XLSX.read(fileBuffer);
  
  console.log('工作表列表:', workbook.SheetNames);
  
  // 读取所有工作表
  for (const sheetName of workbook.SheetNames) {
    console.log(`\n=== ${sheetName} ===`);
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log('前10行数据:', rows.slice(0, 10));
  }
  
} catch (error) {
  console.error('读取Excel文件失败:', error);
}
