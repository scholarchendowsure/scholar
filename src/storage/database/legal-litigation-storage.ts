import fs from 'fs';
import path from 'path';

export interface LitigationRecord {
  id: string;
  caseNumber: string;        // 案号
  caseName: string;          // 案件名称
  caseIdentity: string;      // 案件身份
  caseCause: string;         // 案由
  caseAmount: string;        // 案件金额
  caseProgress: string;      // 最新案件进程
  courtName: string;         // 法院名称
}

export interface LimitHighRecord {
  id: string;
  caseNumber: string;        // 案号
  limitObject: string;       // 限消令对象
  relatedObject: string;     // 关联对象
  applicant: string;        // 申请人
  executionCourt: string;    // 执行法院
  filingDate: string;        // 立案日期
  publishDate: string;       // 发布日期
}

export interface EndCaseRecord {
  id: string;
  caseNumber: string;        // 案号
  subjectName: string;       // 主体名称
  unpaidAmount: string;      // 未履行金额
  executionAmount: string;   // 执行标的
  executionCourt: string;    // 执行法院
  filingDate: string;        // 立案日期
  endDate: string;           // 终本日期
}

export interface CourtNoticeRecord {
  id: string;
  caseNumber: string;        // 案号
  caseCause: string;         // 案由
  parties: string;           // 当事人
  court: string;             // 审理法院
  hearingDate: string;        // 开庭时间
}

export interface LegalLitigation {
  caseId: string;
  userId?: string;
  importedAt?: string;
  // 司法案件
  judicialCases?: LitigationRecord[];
  // 限制高消费
  限制高消费?: LimitHighRecord[];
  // 终本案件
  终本案件?: EndCaseRecord[];
  // 开庭公告
  开庭公告?: CourtNoticeRecord[];
  updatedAt?: string;
}

type LitigationData = Record<string, LegalLitigation>;

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'legal-litigations.json');

let cachedData: LitigationData | null = null;
let lastModifiedTime = 0;

function loadData(): LitigationData {
  // 检查文件是否修改
  if (fs.existsSync(FILE_PATH)) {
    const stats = fs.statSync(FILE_PATH);
    if (stats.mtimeMs === lastModifiedTime && cachedData) {
      return cachedData;
    }
  }

  if (fs.existsSync(FILE_PATH)) {
    try {
      const content = fs.readFileSync(FILE_PATH, 'utf-8');
      cachedData = JSON.parse(content);
      lastModifiedTime = fs.statSync(FILE_PATH).mtimeMs;
      return cachedData!;
    } catch (e) {
      console.error('加载法律诉讼数据失败:', e);
    }
  }
  
  cachedData = {};
  return cachedData;
}

function saveData(data: LitigationData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  cachedData = data;
  lastModifiedTime = fs.statSync(FILE_PATH).mtimeMs;
}

export function getLitigationByCaseId(caseId: string): LegalLitigation | null {
  const data = loadData();
  return data[caseId] || null;
}

export function saveLitigation(caseId: string, litigation: LegalLitigation): void {
  const data = loadData();
  data[caseId] = {
    ...litigation,
    updatedAt: new Date().toISOString()
  };
  saveData(data);
}

export function importLitigationData(
  caseId: string,
  litigationRecords: LitigationRecord[],
  limitHighRecords: LimitHighRecord[],
  endCaseRecords: EndCaseRecord[],
  courtNoticeRecords: CourtNoticeRecord[]
): void {
  const data = loadData();
  data[caseId] = {
    caseId,
    judicialCases: litigationRecords, // 兼容存储为 judicialCases
    '限制高消费': limitHighRecords,
    '终本案件': endCaseRecords,
    '开庭公告': courtNoticeRecords,
    updatedAt: new Date().toISOString()
  };
  saveData(data);
}

export function deleteLitigation(caseId: string): void {
  const data = loadData();
  delete data[caseId];
  saveData(data);
}

export function getAllLitigations(): LitigationData {
  return loadData();
}
