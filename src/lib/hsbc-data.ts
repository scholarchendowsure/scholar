// 汇丰贷款数据管理模块 - 文件持久化版本

import fs from 'fs';
import path from 'path';
import { calcBalance, calcPastdueAmount, calcOverdueDays, calcTotalRepaid } from './hsbc-loan';

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
  totalRepaid?: number;  // 已还款总额
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

export interface OverdueDaysStats {
  amount: number;
  rate: number;
  amountUSD: number;
  loanCount: number;
  merchantCount: number;
}

export interface WarningInfoStats {
  amount: number;
  amountUSD: number;
  loanCount: number;
  merchantCount: number;
}

export interface RepaymentDueStats {
  cnyAmount: number;
  usdAmount: number;
  count: number;
  merchantCount: number;
}

export interface HSBCDashboardStats {
  totalLoans: number;
  activeMerchants: number;
  totalLoanAmount: number;
  totalBalance: number; // 折CNY
  totalBalanceUSD: number; // 折USD
  totalBalanceLoanCount: number;
  totalBalanceMerchantCount: number;
  totalPastdueAmount: number; // 折CNY
  totalPastdueAmountUSD: number; // 折USD
  overdueRate: number;
  overdueMerchantRate: number;
  warningAmount: number; // 折CNY
  warningAmountUSD: number; // 折USD
  approachingMaturityAmount: number;
  overdueByDays: {
    over0Days: OverdueDaysStats;
    over30Days: OverdueDaysStats;
    over90Days: OverdueDaysStats;
  };
  warningInfo: WarningInfoStats;
  repaymentDue: Record<number, RepaymentDueStats>;
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
  // Always try to reload from file to get latest data
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
  const loans = loansByBatchDate.get(batchDate) || [];
  // 为每个贷款计算逾期天数和已还款总额
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return loans.map(loan => {
    const maturityDate = new Date(loan.maturityDate);
    maturityDate.setHours(0, 0, 0, 0);
    const balance = calcBalance(loan);
    let overdueDays = 0;
    if (today > maturityDate && balance > 0.9) {
      overdueDays = Math.floor((today.getTime() - maturityDate.getTime()) / (1000 * 60 * 60 * 24));
    }
    // 计算已还款总额
    const totalRepaid = loan.totalRepaid ?? calcTotalRepaid({ ...loan, balance });
    return { ...loan, overdueDays, totalRepaid };
  });
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
      totalBalanceUSD: 0,
      totalBalanceLoanCount: 0,
      totalBalanceMerchantCount: 0,
      totalPastdueAmount: 0,
      totalPastdueAmountUSD: 0,
      overdueRate: 0,
      overdueMerchantRate: 0,
      warningAmount: 0,
      warningAmountUSD: 0,
      approachingMaturityAmount: 0,
      overdueByDays: {
        over0Days: { amount: 0, rate: 0, amountUSD: 0, loanCount: 0, merchantCount: 0 },
        over30Days: { amount: 0, rate: 0, amountUSD: 0, loanCount: 0, merchantCount: 0 },
        over90Days: { amount: 0, rate: 0, amountUSD: 0, loanCount: 0, merchantCount: 0 },
      },
      warningInfo: { amount: 0, amountUSD: 0, loanCount: 0, merchantCount: 0 },
      repaymentDue: {},
      currencyBreakdown: [],
      approachingMaturity: [],
      overdueTrend: [],
      riskAssessment: [],
    };
  }

  const totalLoans = loans.length;
  const uniqueMerchants = [...new Set(loans.map(l => l.merchantId))];
  
  // 汇率：1 USD = 7 CNY
  // 汇率转换规则：USD→CNY 乘以7，CNY→USD 除以7
  const cnyLoans = loans.filter(l => l.loanCurrency === 'CNY');
  const usdLoans = loans.filter(l => l.loanCurrency === 'USD');
  
  // 1. 计算在贷余额
  const cnyBalanceSum = cnyLoans.reduce((sum, l) => sum + calcBalance(l), 0);
  const usdBalanceSum = usdLoans.reduce((sum, l) => sum + calcBalance(l), 0);
  const totalBalance = cnyBalanceSum + usdBalanceSum * USD_TO_CNY_RATE; // 折CNY
  const totalBalanceUSD = cnyBalanceSum / USD_TO_CNY_RATE + usdBalanceSum; // 折USD
  
  // 2. 计算逾期天数分级
  const today = new Date();
  const overdueByDays = {
    over0Days: { amount: 0, rate: 0, amountUSD: 0, loanCount: 0, merchantCount: 0 },
    over30Days: { amount: 0, rate: 0, amountUSD: 0, loanCount: 0, merchantCount: 0 },
    over90Days: { amount: 0, rate: 0, amountUSD: 0, loanCount: 0, merchantCount: 0 },
  };
  
  const over0Merchants = new Set<string>();
  const over30Merchants = new Set<string>();
  const over90Merchants = new Set<string>();
  
  loans.forEach(loan => {
    const maturityDate = new Date(loan.maturityDate);
    const balance = calcBalance(loan);
    const overdueAmount = calcPastdueAmount(loan);
    
    if (overdueAmount > 0) {
      const overdueDays = Math.floor((today.getTime() - maturityDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // 逾期>0天：所有逾期金额
      overdueByDays.over0Days.amount += overdueAmount;
      overdueByDays.over0Days.loanCount++;
      over0Merchants.add(loan.merchantId);
      
      // 逾期>30天
      if (overdueDays >= 30) {
        overdueByDays.over30Days.amount += overdueAmount;
        overdueByDays.over30Days.loanCount++;
        over30Merchants.add(loan.merchantId);
      }
      
      // 逾期>90天
      if (overdueDays >= 90) {
        overdueByDays.over90Days.amount += overdueAmount;
        overdueByDays.over90Days.loanCount++;
        over90Merchants.add(loan.merchantId);
      }
    }
  });
  
  // 计算折CNY和折USD
  // 逾期金额已经是统一币种，需要分别计算CNY和USD部分再转换
  overdueByDays.over0Days.amount = cnyLoans.reduce((sum, l) => sum + calcPastdueAmount(l), 0) 
    + usdLoans.reduce((sum, l) => sum + calcPastdueAmount(l) * USD_TO_CNY_RATE, 0);
  overdueByDays.over0Days.amountUSD = cnyLoans.reduce((sum, l) => sum + calcPastdueAmount(l) / USD_TO_CNY_RATE, 0) 
    + usdLoans.reduce((sum, l) => sum + calcPastdueAmount(l), 0);
  overdueByDays.over0Days.merchantCount = over0Merchants.size;
  
  overdueByDays.over30Days.amount = cnyLoans.filter(l => calcOverdueDays(l) >= 30).reduce((sum, l) => sum + calcPastdueAmount(l), 0)
    + usdLoans.filter(l => calcOverdueDays(l) >= 30).reduce((sum, l) => sum + calcPastdueAmount(l) * USD_TO_CNY_RATE, 0);
  overdueByDays.over30Days.amountUSD = cnyLoans.filter(l => calcOverdueDays(l) >= 30).reduce((sum, l) => sum + calcPastdueAmount(l) / USD_TO_CNY_RATE, 0)
    + usdLoans.filter(l => calcOverdueDays(l) >= 30).reduce((sum, l) => sum + calcPastdueAmount(l), 0);
  overdueByDays.over30Days.merchantCount = over30Merchants.size;
  
  overdueByDays.over90Days.amount = cnyLoans.filter(l => calcOverdueDays(l) >= 90).reduce((sum, l) => sum + calcPastdueAmount(l), 0)
    + usdLoans.filter(l => calcOverdueDays(l) >= 90).reduce((sum, l) => sum + calcPastdueAmount(l) * USD_TO_CNY_RATE, 0);
  overdueByDays.over90Days.amountUSD = cnyLoans.filter(l => calcOverdueDays(l) >= 90).reduce((sum, l) => sum + calcPastdueAmount(l) / USD_TO_CNY_RATE, 0)
    + usdLoans.filter(l => calcOverdueDays(l) >= 90).reduce((sum, l) => sum + calcPastdueAmount(l), 0);
  overdueByDays.over90Days.merchantCount = over90Merchants.size;
  
  // 计算逾期率
  overdueByDays.over0Days.rate = totalBalance > 0 ? overdueByDays.over0Days.amount / totalBalance : 0;
  overdueByDays.over30Days.rate = totalBalance > 0 ? overdueByDays.over30Days.amount / totalBalance : 0;
  overdueByDays.over90Days.rate = totalBalance > 0 ? overdueByDays.over90Days.amount / totalBalance : 0;
  
  // 逾期总金额（折CNY和折USD）
  const totalPastdueAmount = overdueByDays.over0Days.amount;
  const totalPastdueAmountUSD = overdueByDays.over0Days.amountUSD;
  
  // 3. 预警金额：逾期商户未到期的余额
  const warningMerchants = new Set<string>();
  let warningAmountCNY = 0;
  let warningAmountUSD = 0;
  let warningLoanCount = 0;
  
  loans.forEach(loan => {
    const maturityDate = new Date(loan.maturityDate);
    const balance = calcBalance(loan);
    const overdueAmount = calcPastdueAmount(loan);
    
    // 未到期但逾期的余额（逾期天数<=0但余额>0）
    if (today <= maturityDate && balance > 0.9) {
      // 计算未到期的逾期余额
      if (loan.loanCurrency === 'CNY') {
        warningAmountCNY += balance;
        warningAmountUSD += balance / USD_TO_CNY_RATE;
      } else {
        warningAmountCNY += balance * USD_TO_CNY_RATE;
        warningAmountUSD += balance;
      }
      warningLoanCount++;
      warningMerchants.add(loan.merchantId);
    }
  });

  // 计算还款期限金额
  const repaymentDue: Record<number, { cnyAmount: number; usdAmount: number; count: number; merchantCount: number }> = {
    3: { cnyAmount: 0, usdAmount: 0, count: 0, merchantCount: 0 },
    7: { cnyAmount: 0, usdAmount: 0, count: 0, merchantCount: 0 },
    15: { cnyAmount: 0, usdAmount: 0, count: 0, merchantCount: 0 },
    30: { cnyAmount: 0, usdAmount: 0, count: 0, merchantCount: 0 },
    45: { cnyAmount: 0, usdAmount: 0, count: 0, merchantCount: 0 },
  };
  
  // 用于去重的商户集合
  const merchantsByDays: Record<number, Set<string>> = {
    3: new Set<string>(),
    7: new Set<string>(),
    15: new Set<string>(),
    30: new Set<string>(),
    45: new Set<string>(),
  };
  
  loans.forEach(loan => {
    // 只计算未逾期的贷款
    if (calcPastdueAmount(loan) === 0) {
      const maturityDate = new Date(loan.maturityDate);
      const daysUntilDue = Math.floor((maturityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const balance = calcBalance(loan);
      const amountCNY = loan.loanCurrency === 'CNY' ? balance : balance * USD_TO_CNY_RATE;
      const amountUSD = loan.loanCurrency === 'USD' ? balance : balance / USD_TO_CNY_RATE;
      
      // 累计各期限的金额
      if (daysUntilDue >= 0 && daysUntilDue <= 3) {
        repaymentDue[3].cnyAmount += amountCNY;
        repaymentDue[3].usdAmount += amountUSD;
        repaymentDue[3].count++;
        merchantsByDays[3].add(loan.merchantId);
      }
      if (daysUntilDue >= 0 && daysUntilDue <= 7) {
        repaymentDue[7].cnyAmount += amountCNY;
        repaymentDue[7].usdAmount += amountUSD;
        repaymentDue[7].count++;
        merchantsByDays[7].add(loan.merchantId);
      }
      if (daysUntilDue >= 0 && daysUntilDue <= 15) {
        repaymentDue[15].cnyAmount += amountCNY;
        repaymentDue[15].usdAmount += amountUSD;
        repaymentDue[15].count++;
        merchantsByDays[15].add(loan.merchantId);
      }
      if (daysUntilDue >= 0 && daysUntilDue <= 30) {
        repaymentDue[30].cnyAmount += amountCNY;
        repaymentDue[30].usdAmount += amountUSD;
        repaymentDue[30].count++;
        merchantsByDays[30].add(loan.merchantId);
      }
      if (daysUntilDue >= 0 && daysUntilDue <= 45) {
        repaymentDue[45].cnyAmount += amountCNY;
        repaymentDue[45].usdAmount += amountUSD;
        repaymentDue[45].count++;
        merchantsByDays[45].add(loan.merchantId);
      }
    }
  });
  
  // 设置商户数
  repaymentDue[3].merchantCount = merchantsByDays[3].size;
  repaymentDue[7].merchantCount = merchantsByDays[7].size;
  repaymentDue[15].merchantCount = merchantsByDays[15].size;
  repaymentDue[30].merchantCount = merchantsByDays[30].size;
  repaymentDue[45].merchantCount = merchantsByDays[45].size;

  // 逾期商户数组（用于计算数量）
  const overdueMerchantArray = uniqueMerchants.filter(m =>
    loans.some(l => l.merchantId === m && calcPastdueAmount(l) > 0)
  );

  const riskAssessment: RiskAssessmentItem[] = [
    { riskLevel: '低风险', daysMin: 0, daysMax: 30, overdueAmount: totalPastdueAmount * 0.4, merchantCount: Math.floor(overdueMerchantArray.length * 0.4), loanCount: Math.floor(totalLoans * 0.3) },
    { riskLevel: '中风险', daysMin: 31, daysMax: 60, overdueAmount: totalPastdueAmount * 0.3, merchantCount: Math.floor(overdueMerchantArray.length * 0.3), loanCount: Math.floor(totalLoans * 0.2) },
    { riskLevel: '高风险', daysMin: 61, daysMax: 90, overdueAmount: totalPastdueAmount * 0.2, merchantCount: Math.floor(overdueMerchantArray.length * 0.2), loanCount: Math.floor(totalLoans * 0.15) },
    { riskLevel: '严重风险', daysMin: 91, daysMax: 180, overdueAmount: totalPastdueAmount * 0.08, merchantCount: Math.floor(overdueMerchantArray.length * 0.08), loanCount: Math.floor(totalLoans * 0.1) },
    { riskLevel: '极高风险', daysMin: 181, daysMax: 999, overdueAmount: totalPastdueAmount * 0.02, merchantCount: Math.floor(overdueMerchantArray.length * 0.02), loanCount: Math.floor(totalLoans * 0.05) },
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

  // 计算在贷笔数和商户数（余额>0.9的贷款）
  const activeLoans = loans.filter(l => calcBalance(l) > 0.9);
  const totalBalanceLoanCount = activeLoans.length;
  const totalBalanceMerchantCount = [...new Set(activeLoans.map(l => l.merchantId))].length;
  
  const activeMerchants = uniqueMerchants.filter(m =>
    loans.some(l => l.merchantId === m && calcBalance(l) > 0.9)
  ).length;
  
  const totalLoanAmount = cnyLoans.reduce((sum, l) => sum + l.loanAmount, 0)
    + usdLoans.reduce((sum, l) => sum + l.loanAmount * USD_TO_CNY_RATE, 0);
  
  // 逾期商户数
  const overdueMerchants = uniqueMerchants.filter(m =>
    loans.some(l => l.merchantId === m && calcPastdueAmount(l) > 0)
  ).length;

  return {
    totalLoans,
    activeMerchants,
    totalLoanAmount: Math.round(totalLoanAmount),
    totalBalance: Math.round(totalBalance),
    totalBalanceUSD: Math.round(totalBalanceUSD),
    totalBalanceLoanCount,
    totalBalanceMerchantCount,
    totalPastdueAmount: Math.round(totalPastdueAmount),
    totalPastdueAmountUSD: Math.round(totalPastdueAmountUSD),
    overdueRate: totalBalance > 0 ? Math.round((totalPastdueAmount / totalBalance) * 10000) / 100 : 0,
    overdueMerchantRate: activeMerchants > 0 ? Math.round((overdueMerchants / activeMerchants) * 10000) / 100 : 0,
    warningAmount: Math.round(warningAmountCNY),
    warningAmountUSD: Math.round(warningAmountUSD),
    approachingMaturityAmount: Math.round(totalBalance * 0.15),
    overdueByDays,
    warningInfo: {
      amount: Math.round(warningAmountCNY),
      amountUSD: Math.round(warningAmountUSD),
      loanCount: warningLoanCount,
      merchantCount: warningMerchants.size,
    },
    repaymentDue,
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
