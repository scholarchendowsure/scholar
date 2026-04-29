// 汇丰贷款完整数据模型 - 完全适配 Excel 解密文件格式

export interface HSBCLoan {
  // 基本信息
  id: string;
  loanReference: string;           // Loan Reference
  merchantId: string;             // Merchant ID
  merchantName?: string;           // Merchant Name
  borrowerName: string;           // Borrower Name
  
  // 贷款信息
  loanStartDate: string;           // Loan Start Date
  loanDate?: string;               // Loan Date (alias for loanStartDate)
  loanCurrency: 'CNY' | 'USD';    // Loan Currency
  loanAmount: number;              // Loan Amount
  loanInterest: string;           // Loan Interest (e.g., "HIBOR 3.32848% + 2.75%")
  totalInterestRate: number;       // Total Interest Rate (%)
  loanTenor: string;              // Loan Tenor (e.g., "90D", "120D")
  maturityDate: string;           // Maturity Date
  
  // 还款计划
  repaymentSchedule: RepaymentRecord[];
  
  // 财务信息
  balance?: number;                // Balance (余额) - API 计算: 贷款金额 - 已还款总额
  pastdueAmount?: number;          // Pastdue amount (逾期金额) - API 计算: 到期后余额>=0.9
  totalRepaid?: number;            // 已还款总额 - API 从还款计划计算
  
  // 操作记录
  freezeAccountRequested?: string;       // Freeze Account Requested? (DDMMYY)
  forceDebitRequested?: string;          // Force Debit Requested? (DDMMYY)
  approvalFromRM?: string;               // Approval from RM TH? (DDMMYY)
  confirmationFreezeAccount?: string;    // Confirmation from Dowsure with action taken on Freeze Account? (DDMMYY)
  confirmationForceDebit?: string;       // Confirmation from Dowsure with action taken on Force Debit? (DDMMYY)
  
  // 备注
  remarks?: string;                // Remarks
  
  // 元数据
  batchDate?: string;             // 批次日期
  createdAt?: string;             // 创建时间
  updatedAt?: string;             // 更新时间
  status?: 'active' | 'settled' | 'overdue' | 'written_off' | 'normal' | 'settling'; // 状态
  overdueDays?: number;            // 逾期天数
  assignedTo?: string;            // 负责人员
  followUpCount?: number;         // 跟进次数
  lastFollowUpDate?: string;      // 最后跟进时间
}

export interface RepaymentRecord {
  date: string;           // Repayment Date
  amount: number;         // Repay amount
  repaid?: boolean;       // 是否已还
  actualDate?: string;    // 实际还款日期
  actualAmount?: number;  // 实际还款金额
}

// ============================================================
// 计算函数 - 统一优先使用 API 返回值，避免前后端逻辑不一致
// ============================================================

/**
 * 汇丰贷款筛选条件
 */
export interface HSBCLoanFilter {
  search?: string;
  currency?: string;
  status?: string;
  hasOverdue?: boolean;
  batchDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 汇丰贷款操作日志
 */
export interface HSBCLoanLog {
  id: string;
  loanId: string;
  loanReference: string;
  action: string;
  detail: string;
  details: string;
  operator: string;
  timestamp: string;
  createdAt: string;
}

/**
 * 计算已还款总额
 * 优先级: loan.totalRepaid (API) > loanAmount - loan.balance (反推) > 还款计划 > 0
 */
export function calcTotalRepaid(loan: HSBCLoan): number {
  // 1. 优先使用 API 返回的 totalRepaid 字段（从还款计划计算）
  if (loan.totalRepaid !== undefined && loan.totalRepaid !== null) {
    return loan.totalRepaid;
  }
  
  // 2. 如果有 balance 字段，反推已还款 = 贷款金额 - 余额
  if (loan.balance !== undefined && loan.balance !== null) {
    return Math.max(0, loan.loanAmount - loan.balance);
  }
  
  // 3. 检查还款计划中的 repaid 标记
  if (loan.repaymentSchedule && loan.repaymentSchedule.length > 0) {
    const hasRepaidField = loan.repaymentSchedule.some(r => r.repaid !== undefined);
    if (hasRepaidField) {
      return loan.repaymentSchedule
        .filter(r => r.repaid)
        .reduce((sum, r) => sum + (r.actualAmount || r.amount), 0);
    }
  }
  
  return 0;
}

/**
 * 计算余额：贷款金额 - 已还款总额
 * 优先级: loan.balance (API) > loanAmount - totalRepaid (计算)
 * 
 * 计算规则: 余额 = 贷款金额 - 已还款总额
 */
export function calcBalance(loan: HSBCLoan): number {
  // 1. 优先使用 API 返回的 balance 字段
  if (loan.balance !== undefined && loan.balance !== null) {
    return Math.max(0, loan.balance);
  }
  
  // 2. 从 totalRepaid 反推
  const totalRepaid = calcTotalRepaid(loan);
  return Math.max(0, loan.loanAmount - totalRepaid);
}

/**
 * 计算逾期金额
 * 计算规则: 到期日过后，如果余额 >= 0.9，才算为逾期金额（等于余额）
 * 优先级: 基于 loan.status 和 loan.balance (API) > 本地计算
 */
export function calcPastdueAmount(loan: HSBCLoan): number {
  // 1. 如果 API 明确标记状态，直接根据状态判断
  if (loan.status === 'overdue') {
    // 逾期金额 = 余额
    return calcBalance(loan);
  }
  
  // 2. 如果状态不是逾期，逾期金额为0
  if (loan.status === 'normal' || loan.status === 'settled' || loan.status === 'active') {
    return 0;
  }
  
  // 3. 如果没有 status 字段，本地计算
  // 到期日过后，余额 >= 0.9 才算逾期金额
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maturityDate = new Date(loan.maturityDate);
  maturityDate.setHours(0, 0, 0, 0);
  
  if (maturityDate < today) {
    const balance = calcBalance(loan);
    if (balance >= 0.9) {
      return balance;
    }
  }
  
  return 0;
}

/**
 * 计算逾期天数
 * 计算规则: 到期日过后，如果余额 >= 0.9，逾期天数 = 今天 - 到期日
 * 优先级: loan.overdueDays (API) > 本地计算
 * 
 * 返回值: >0 表示逾期天数，<=0 表示未逾期
 */
export function calcOverdueDays(loan: HSBCLoan): number {
  // 1. 优先使用 API 返回的 overdueDays 字段
  if (loan.overdueDays !== undefined && loan.overdueDays !== null) {
    return loan.overdueDays;
  }
  
  // 2. 本地计算
  const balance = calcBalance(loan);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maturityDate = new Date(loan.maturityDate);
  maturityDate.setHours(0, 0, 0, 0);
  
  // 余额 < 0.9 或未到期，不算逾期
  if (balance < 0.9 || maturityDate >= today) {
    return -1;
  }
  
  const diffTime = today.getTime() - maturityDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 计算距离到期的天数（负数表示已到期）
 */
export function calcDaysToMaturity(loan: HSBCLoan): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maturityDate = new Date(loan.maturityDate);
  maturityDate.setHours(0, 0, 0, 0);
  const diffTime = maturityDate.getTime() - today.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 获取状态
 * 优先级: loan.status (API) > 本地计算
 * 
 * 计算规则:
 * - 余额 = 0 → settled (已结清)
 * - 到期后余额 >= 0.9 → overdue (逾期)
 * - 有还款但未结清 → settling (还款中)
 * - 其他 → active (正常)
 */
export function calcStatus(loan: HSBCLoan): 'active' | 'settled' | 'overdue' | 'settling' | 'normal' {
  // 1. 优先使用 API 返回的 status 字段
  if (loan.status) {
    return loan.status as 'active' | 'settled' | 'overdue' | 'settling' | 'normal';
  }
  
  // 2. 本地计算
  const balance = calcBalance(loan);
  const pastdueAmount = calcPastdueAmount(loan);
  
  if (balance === 0) return 'settled';
  if (pastdueAmount > 0) return 'overdue';
  if (balance < loan.loanAmount) return 'settling';
  return 'active';
}



// Excel 导入行数据
export interface HSBCImportRow {
  'Loan Reference'?: string;
  'Merchant ID'?: string;
  'Merchant Name'?: string;
  'Borrower Name'?: string;
  'Loan Start Date'?: string;
  'Loan Currency'?: string;
  'Loan Amount'?: string;
  'Loan Interest'?: string;
  'Total Interest Rate'?: string;
  'Loan Tenor'?: string;
  'Maturity Date'?: string;
  'Balance'?: string;
  'Pastdue amount'?: string;
  'Freeze Account Requested? (DDMMYY)'?: string;
  'Force Debit Requested? (DDMMYY)'?: string;
  'Approval from RM TH (No action taken on Freeze Account OR Force Debit)? (DDMMYY)'?: string;
  'Confirmation from Dowsure with action taken on Freeze Account?'?: string;
  'Confirmation from Dowsure with action taken on Force Debit?'?: string;
  'Remarks (Any subsequent action likes freeze PSP account on day 8 or follow up with Dowsure if no response on action date)'?: string;
  [key: string]: string | undefined;
}

/**
 * 解析导入行数据为 HSBCLoan
 */
export function parseImportRow(row: HSBCImportRow, batchDate?: string): HSBCLoan {
  const loanAmount = parseFloat(String(row['Loan Amount'] || '0').replace(/,/g, '')) || 0;
  const balance = parseFloat(String(row['Balance'] || '0').replace(/,/g, '')) || 0;
  const pastdueAmount = parseFloat(String(row['Pastdue amount'] || '0').replace(/,/g, '')) || 0;
  const totalInterestRate = parseFloat(String(row['Total Interest Rate'] || '0').replace(/%/g, '')) || 0;
  
  const totalRepaid = Math.max(0, loanAmount - balance);
  const isOverdue = pastdueAmount > 0.9 && balance > 0.9;
  
  return {
    id: '',
    loanReference: String(row['Loan Reference'] || '').trim(),
    merchantId: String(row['Merchant ID'] || '').trim(),
    merchantName: String(row['Merchant Name'] || '').trim(),
    borrowerName: String(row['Borrower Name'] || '').trim(),
    loanStartDate: String(row['Loan Start Date'] || '').trim(),
    loanCurrency: (String(row['Loan Currency'] || 'USD').trim().toUpperCase() as 'CNY' | 'USD'),
    loanAmount,
    loanInterest: String(row['Loan Interest'] || '').trim(),
    totalInterestRate: totalInterestRate / 100,
    loanTenor: String(row['Loan Tenor'] || '').trim(),
    maturityDate: String(row['Maturity Date'] || '').trim(),
    balance,
    pastdueAmount,
    totalRepaid,
    repaymentSchedule: [],
    remarks: String(row['Remarks (Any subsequent action likes freeze PSP account on day 8 or follow up with Dowsure if no response on action date)'] || '').trim(),
    batchDate,
    status: isOverdue ? 'overdue' : 'normal',
    freezeAccountRequested: String(row['Freeze Account Requested? (DDMMYY)'] || '').trim(),
    forceDebitRequested: String(row['Force Debit Requested? (DDMMYY)'] || '').trim(),
    approvalFromRM: String(row['Approval from RM TH (No action taken on Freeze Account OR Force Debit)? (DDMMYY)'] || '').trim(),
    confirmationFreezeAccount: String(row['Confirmation from Dowsure with action taken on Freeze Account?'] || '').trim(),
    confirmationForceDebit: String(row['Confirmation from Dowsure with action taken on Force Debit?'] || '').trim(),
  };
}

/**
 * 计算统计数据
 */
export function calculateStats(loans: HSBCLoan[]) {
  const total = loans.length;
  const totalLoanAmount = loans.reduce((sum, l) => sum + l.loanAmount, 0);
  const totalBalance = loans.reduce((sum, l) => sum + calcBalance(l), 0);
  const totalRepaid = loans.reduce((sum, l) => sum + calcTotalRepaid(l), 0);
  const totalPastdueAmount = loans.reduce((sum, l) => sum + calcPastdueAmount(l), 0);
  
  const overdueLoans = loans.filter(l => l.status === 'overdue');
  const normalLoans = loans.filter(l => l.status !== 'overdue');
  
  const cnyLoans = loans.filter(l => l.loanCurrency === 'CNY');
  const usdLoans = loans.filter(l => l.loanCurrency === 'USD');
  
  return {
    total,
    totalLoanAmount,
    totalBalance,
    totalRepaid,
    totalPastdueAmount,
    overdueCount: overdueLoans.length,
    overdueAmount: overdueLoans.reduce((sum, l) => sum + calcBalance(l), 0),
    normalCount: normalLoans.length,
    normalAmount: normalLoans.reduce((sum, l) => sum + calcBalance(l), 0),
    cnyCount: cnyLoans.length,
    cnyAmount: cnyLoans.reduce((sum, l) => sum + l.loanAmount, 0),
    usdCount: usdLoans.length,
    usdAmount: usdLoans.reduce((sum, l) => sum + l.loanAmount, 0),
    overdueRate: total > 0 ? (overdueLoans.length / total) * 100 : 0,
    repaymentRate: totalLoanAmount > 0 ? (totalRepaid / totalLoanAmount) * 100 : 0,
  };
}

// JSON 缓存（已废弃，使用数据库）
let _cachedLoans: HSBCLoan[] | null = null;

/** @deprecated 使用数据库存储 */
export function getCachedLoans(): HSBCLoan[] | null {
  return _cachedLoans;
}

/** @deprecated 使用数据库存储 */
export function setCachedLoans(loans: HSBCLoan[]): void {
  _cachedLoans = loans;
}

/** @deprecated 使用数据库存储 */
export function generateSampleLoans(): HSBCLoan[] {
  return [];
}

// 还款统计相关类型
export interface RepaymentStatItem {
  amountUSD: number;
  amountCNY: number;
  amountUSDWan: string;
  amountCNYWan: string;
  count: number;
  loanCount: number;
  loanReferences: string[];
}

export interface TotalRepaymentStatItem {
  amountUSD: number;
  amountCNY: number;
  amountUSDWan: string;
  amountCNYWan: string;
  loanReferences: string[];
}

export interface MonthlyRepaymentStats {
  ontimeRepayment: RepaymentStatItem;
  overdueRepayment: RepaymentStatItem;
  totalRepayment: TotalRepaymentStatItem;
}
