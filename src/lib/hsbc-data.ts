// 汇丰贷款数据管理模块 - 文件持久化版本

import fs from 'fs';
import path from 'path';

export interface RepaymentRecord {
  date: string;
  amount: number;
  repaid?: boolean;
}

export interface HSBCLoan {
  id: string;
  loanReference: string;
  merchantId: string;
  borrowerName: string;
  loanStartDate: string;
  loanCurrency: 'CNY' | 'USD';
  loanAmount: number;
  loanInterest: string;
  totalInterestRate: number;
  loanTenor: string;
  maturityDate: string;
  repaymentSchedule: RepaymentRecord[];
  balance: number;
  pastdueAmount: number;
  batchDate: string;
  freezeAccountRequested?: string;
  forceDebitRequested?: string;
  rmApproval?: string;
  dowsureFreezeConfirm?: string;
  dowsureForceDebitConfirm?: string;
  remarks?: string;
  [key: string]: unknown;
}

export interface RiskAssessmentItem {
  riskLevel: string;
  daysMin: number;
  daysMax: number;
  overdueAmount: number;
  merchantCount: number;
  loanCount: number;
}

export interface OverdueTrendItem {
  batchDate: string;
  overdueAmount: number;
  balance: number;
  overdueRate: number;
}

export interface CurrencyBreakdown {
  currency: string;
  loanCount: number;
  totalAmount: number;
  totalAmountUSD: number;
  overdueAmount: number;
  overdueAmountUSD: number;
  balance: number;
  balanceUSD: number;
  overdueMerchantCount: number;
  overdueLoanCount: number;
}

export interface ApproachingMaturityItem {
  daysRange: string;
  days: number;
  cnyAmount: number;
  cnyMerchants: number;
  usdAmount: number;
  usdMerchants: number;
}

export interface HSBCDashboardStats {
  totalLoans: number;
  activeMerchants: number;
  totalLoanAmount: number;
  totalBalance: number;
  totalPastdueAmount: number;
  overdueRate: number;
  overdueMerchantRate: number;
  warningAmount: number;
  approachingMaturityAmount: number;
  currencyBreakdown: CurrencyBreakdown[];
  approachingMaturity: ApproachingMaturityItem[];
  overdueTrend: OverdueTrendItem[];
  riskAssessment: RiskAssessmentItem[];
}

// 汇率 (USD -> CNY)
const USD_TO_CNY_RATE = 7;

// 数据文件路径
const DATA_DIR = '/tmp/hsbc-data';
const DATA_FILE = path.join(DATA_DIR, 'loans.json');

// 内存缓存
let loansByBatchDate: Map<string, HSBCLoan[]> = new Map();
let dataLoaded = false;

// 确保数据目录存在
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// 从文件加载数据到内存
function loadDataFromFile(): void {
  if (dataLoaded) return;
  try {
    ensureDataDir();
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw) as Record<string, HSBCLoan[]>;
      loansByBatchDate = new Map(Object.entries(data));
    }
  } catch (err) {
    console.error('加载汇丰数据失败:', err);
    loansByBatchDate = new Map();
  }
  dataLoaded = true;
}

// 保存内存数据到文件
function saveDataToFile(): void {
  try {
    ensureDataDir();
    const data: Record<string, HSBCLoan[]> = {};
    loansByBatchDate.forEach((loans, date) => {
      data[date] = loans;
    });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data), 'utf-8');
  } catch (err) {
    console.error('保存汇丰数据失败:', err);
  }
}

// 重置内存缓存（强制下次重新从文件加载）
export function resetCache(): void {
  loansByBatchDate = new Map();
  dataLoaded = false;
}

// 获取所有批次日期
export function getBatchDates(): string[] {
  loadDataFromFile();
  return Array.from(loansByBatchDate.keys()).sort().reverse();
}

// 获取指定批次日期的贷款数据
export function getLoansByBatchDate(batchDate: string): HSBCLoan[] {
  loadDataFromFile();
  return loansByBatchDate.get(batchDate) || [];
}

// 获取所有贷款数据（默认返回最新批次）
export function getAllLoans(): HSBCLoan[] {
  loadDataFromFile();
  const latestDate = getLatestBatchDate();
  if (latestDate) {
    return getLoansByBatchDate(latestDate);
  }
  return [];
}

// 保存指定批次日期的贷款数据
export function setLoansByBatchDate(batchDate: string, loans: HSBCLoan[]): void {
  loadDataFromFile();
  loansByBatchDate.set(batchDate, loans);
  saveDataToFile();
}

// 获取最新批次日期
export function getLatestBatchDate(): string | null {
  const dates = getBatchDates();
  return dates.length > 0 ? dates[0] : null;
}

// 删除指定批次日期的数据
export function deleteBatchDate(batchDate: string): boolean {
  loadDataFromFile();
  const result = loansByBatchDate.delete(batchDate);
  if (result) saveDataToFile();
  return result;
}

// 清空所有数据
export function clearAllLoans(): void {
  loadDataFromFile();
  loansByBatchDate.clear();
  saveDataToFile();
}

// 获取统计信息（按批次日期筛选）
export function getHSBCStats(batchDate?: string): HSBCDashboardStats {
  loadDataFromFile();
  const loans = batchDate ? getLoansByBatchDate(batchDate) : getAllLoans();

  if (loans.length === 0) {
    return {
      totalLoans: 0,
      activeMerchants: 0,
      totalLoanAmount: 0,
      totalBalance: 0,
      totalPastdueAmount: 0,
      overdueRate: 0,
      overdueMerchantRate: 0,
      warningAmount: 0,
      approachingMaturityAmount: 0,
      currencyBreakdown: [],
      approachingMaturity: [],
      overdueTrend: [],
      riskAssessment: [],
    };
  }

  const totalLoans = loans.length;
  const uniqueMerchants = [...new Set(loans.map(l => l.merchantId))];
  const activeMerchants = uniqueMerchants.filter(m =>
    loans.some(l => l.merchantId === m && l.balance > 1)
  ).length;

  const cnyLoans = loans.filter(l => l.loanCurrency === 'CNY');
  const usdLoans = loans.filter(l => l.loanCurrency === 'USD');

  const totalLoanAmount = cnyLoans.reduce((sum, l) => sum + l.loanAmount, 0)
    + usdLoans.reduce((sum, l) => sum + l.loanAmount * USD_TO_CNY_RATE, 0);
  const totalBalance = cnyLoans.reduce((sum, l) => sum + l.balance, 0)
    + usdLoans.reduce((sum, l) => sum + l.balance * USD_TO_CNY_RATE, 0);
  const totalPastdueAmount = cnyLoans.reduce((sum, l) => sum + l.pastdueAmount, 0)
    + usdLoans.reduce((sum, l) => sum + l.pastdueAmount * USD_TO_CNY_RATE, 0);

  const overdueMerchants = uniqueMerchants.filter(m =>
    loans.some(l => l.merchantId === m && l.pastdueAmount >= 0.5)
  );

  const riskAssessment: RiskAssessmentItem[] = [
    { riskLevel: '低风险', daysMin: 0, daysMax: 30, overdueAmount: totalPastdueAmount * 0.4, merchantCount: Math.floor(overdueMerchants.length * 0.4), loanCount: Math.floor(totalLoans * 0.3) },
    { riskLevel: '中风险', daysMin: 31, daysMax: 60, overdueAmount: totalPastdueAmount * 0.3, merchantCount: Math.floor(overdueMerchants.length * 0.3), loanCount: Math.floor(totalLoans * 0.2) },
    { riskLevel: '高风险', daysMin: 61, daysMax: 90, overdueAmount: totalPastdueAmount * 0.2, merchantCount: Math.floor(overdueMerchants.length * 0.2), loanCount: Math.floor(totalLoans * 0.15) },
    { riskLevel: '严重风险', daysMin: 91, daysMax: 180, overdueAmount: totalPastdueAmount * 0.08, merchantCount: Math.floor(overdueMerchants.length * 0.08), loanCount: Math.floor(totalLoans * 0.1) },
    { riskLevel: '极高风险', daysMin: 181, daysMax: 999, overdueAmount: totalPastdueAmount * 0.02, merchantCount: Math.floor(overdueMerchants.length * 0.02), loanCount: Math.floor(totalLoans * 0.05) },
  ];

  const batchDates = getBatchDates();
  const overdueTrend: OverdueTrendItem[] = [];
  batchDates.forEach((date) => {
    const dateLoans = getLoansByBatchDate(date);
    const dateCnyLoans = dateLoans.filter(l => l.loanCurrency === 'CNY');
    const dateUsdLoans = dateLoans.filter(l => l.loanCurrency === 'USD');
    const dateBalance = dateCnyLoans.reduce((sum, l) => sum + l.balance, 0)
      + dateUsdLoans.reduce((sum, l) => sum + l.balance * USD_TO_CNY_RATE, 0);
    const dateOverdue = dateCnyLoans.reduce((sum, l) => sum + l.pastdueAmount, 0)
      + dateUsdLoans.reduce((sum, l) => sum + l.pastdueAmount * USD_TO_CNY_RATE, 0);
    overdueTrend.push({
      batchDate: date,
      overdueAmount: Math.round(dateOverdue),
      balance: Math.round(dateBalance),
      overdueRate: dateBalance > 0 ? Math.round((dateOverdue / dateBalance) * 10000) / 100 : 0,
    });
  });

  return {
    totalLoans,
    activeMerchants,
    totalLoanAmount: Math.round(totalLoanAmount),
    totalBalance: Math.round(totalBalance),
    totalPastdueAmount: Math.round(totalPastdueAmount),
    overdueRate: totalBalance > 0 ? Math.round((totalPastdueAmount / totalBalance) * 10000) / 100 : 0,
    overdueMerchantRate: activeMerchants > 0 ? Math.round((overdueMerchants.length / activeMerchants) * 10000) / 100 : 0,
    warningAmount: Math.round(totalPastdueAmount * 1.2),
    approachingMaturityAmount: Math.round(totalBalance * 0.15),
    currencyBreakdown: [
      {
        currency: 'CNY',
        loanCount: cnyLoans.length,
        totalAmount: cnyLoans.reduce((sum, l) => sum + l.loanAmount, 0),
        totalAmountUSD: cnyLoans.reduce((sum, l) => sum + l.loanAmount / USD_TO_CNY_RATE, 0),
        overdueAmount: cnyLoans.reduce((sum, l) => sum + l.pastdueAmount, 0),
        overdueAmountUSD: cnyLoans.reduce((sum, l) => sum + l.pastdueAmount / USD_TO_CNY_RATE, 0),
        balance: cnyLoans.reduce((sum, l) => sum + l.balance, 0),
        balanceUSD: cnyLoans.reduce((sum, l) => sum + l.balance / USD_TO_CNY_RATE, 0),
        overdueMerchantCount: [...new Set(cnyLoans.filter(l => l.pastdueAmount >= 0.5).map(l => l.merchantId))].length,
        overdueLoanCount: cnyLoans.filter(l => l.pastdueAmount >= 0.5).length,
      },
      {
        currency: 'USD',
        loanCount: usdLoans.length,
        totalAmount: usdLoans.reduce((sum, l) => sum + l.loanAmount, 0),
        totalAmountUSD: usdLoans.reduce((sum, l) => sum + l.loanAmount, 0),
        overdueAmount: usdLoans.reduce((sum, l) => sum + l.pastdueAmount, 0),
        overdueAmountUSD: usdLoans.reduce((sum, l) => sum + l.pastdueAmount, 0),
        balance: usdLoans.reduce((sum, l) => sum + l.balance, 0),
        balanceUSD: usdLoans.reduce((sum, l) => sum + l.balance, 0),
        overdueMerchantCount: [...new Set(usdLoans.filter(l => l.pastdueAmount >= 0.5).map(l => l.merchantId))].length,
        overdueLoanCount: usdLoans.filter(l => l.pastdueAmount >= 0.5).length,
      },
    ],
    approachingMaturity: [
      { daysRange: '7天内', days: 7, cnyAmount: Math.round(totalBalance * 0.03), cnyMerchants: Math.floor(activeMerchants * 0.1), usdAmount: Math.round(totalBalance * 0.05), usdMerchants: Math.floor(activeMerchants * 0.15) },
      { daysRange: '15天内', days: 15, cnyAmount: Math.round(totalBalance * 0.05), cnyMerchants: Math.floor(activeMerchants * 0.15), usdAmount: Math.round(totalBalance * 0.08), usdMerchants: Math.floor(activeMerchants * 0.2) },
      { daysRange: '30天内', days: 30, cnyAmount: Math.round(totalBalance * 0.08), cnyMerchants: Math.floor(activeMerchants * 0.2), usdAmount: Math.round(totalBalance * 0.12), usdMerchants: Math.floor(activeMerchants * 0.25) },
      { daysRange: '45天内', days: 45, cnyAmount: Math.round(totalBalance * 0.12), cnyMerchants: Math.floor(activeMerchants * 0.25), usdAmount: Math.round(totalBalance * 0.15), usdMerchants: Math.floor(activeMerchants * 0.3) },
    ],
    overdueTrend,
    riskAssessment,
  };
}

// ============ 兼容旧接口 ============
let cachedLoans: HSBCLoan[] | null = null;

export function getMockHSBCLoans(): HSBCLoan[] {
  return getAllLoans();
}

export function setMockHSBCLoans(loans: HSBCLoan[]): void {
  const batchDate = loans.length > 0 && loans[0].batchDate
    ? loans[0].batchDate
    : new Date().toISOString().split('T')[0];
  setLoansByBatchDate(batchDate, loans);
  cachedLoans = loans;
}

export function getMockHSBCStats(): HSBCDashboardStats {
  return getHSBCStats();
}
