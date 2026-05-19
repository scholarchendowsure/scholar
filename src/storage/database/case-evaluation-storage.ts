/**
 * 企业信用资产评估表存储
 * 按案件ID保存评估表数据
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const DATA_FILE = path.join(DATA_DIR, 'case-evaluations.json');

// 确保数据目录存在
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// 读取所有评估数据
function readAllData(): Record<string, any> {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    return {};
  }
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// 写入所有评估数据
function writeAllData(data: Record<string, any>) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 获取案件的评估表数据
 */
export function getEvaluationByCaseId(caseId: string): any | null {
  const allData = readAllData();
  return allData[caseId] || null;
}

/**
 * 保存案件的评估表数据
 */
export function saveEvaluation(caseId: string, data: any): void {
  const allData = readAllData();
  allData[caseId] = {
    ...data,
    updatedAt: new Date().toISOString()
  };
  writeAllData(allData);
}

/**
 * 删除案件的评估表数据
 */
export function deleteEvaluation(caseId: string): void {
  const allData = readAllData();
  delete allData[caseId];
  writeAllData(allData);
}
