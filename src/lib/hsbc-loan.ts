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
  balance?: number;                // Balance (余额)
  pastdueAmount?: number;          // Pastdue amount (逾期金额)
  totalRepaid?: number;            // 已还款总额（从还款计划计算）
  
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

// 计算已还款总额（从还款计划中累加已还款金额）
export function calcTotalRepaid(loan: HSBCLoan): number {
  // 优先使用API返回的totalRepaid字段（从Excel导入的还款计划计算）
  if (loan.totalRepaid !== undefined && loan.totalRepaid !== null) {
    return loan.totalRepaid;
  }
  
  // 如果有存储的balance字段，根据余额计算已还款
  // 已还金额 = 贷款金额 - 余额
  if (loan.balance !== undefined) {
    return Math.max(0, loan.loanAmount - loan.balance);
  }
  
  // 如果没有balance，检查还款计划
  // Excel导入的还款计划可能是未来还款计划，不是已还款记录
  // 因此主要依赖balance来计算已还款
  if (!loan.repaymentSchedule || loan.repaymentSchedule.length === 0) {
    return 0;
  }
  
  // 如果还款计划存在，检查是否有repaid标记
  const hasRepaidField = loan.repaymentSchedule.some(r => r.repaid !== undefined);
  
  if (hasRepaidField) {
    return loan.repaymentSchedule
      .filter(r => r.repaid)
      .reduce((sum, r) => sum + (r.actualAmount || r.amount), 0);
  }
  
  // 没有repaid标记的还款计划，默认返回0
  // 已还款应该通过 balance = loanAmount - totalRepaid 来计算
  return 0;
}

// 计算余额：优先使用存储的余额，否则计算
export function calcBalance(loan: HSBCLoan): number {
  // 如果有存储的 balance 且大于 0，直接使用
  if (loan.balance !== undefined && loan.balance > 0) {
    return loan.balance;
  }
  
  // 如果余额 <= 0.9 或者没有存储余额，则计算
  const totalRepaid = calcTotalRepaid(loan);
  const balance = loan.loanAmount - totalRepaid;
  // 余额不能为负数
  return Math.max(0, balance);
}

// 计算逾期金额：直接使用 Excel 导入的逾期金额
// 根据字段说明文档：优先使用存储的 pastdueAmount 值
export function calcPastdueAmount(loan: HSBCLoan): number {
  // 如果有存储的 pastdueAmount 且大于 0，直接使用
  if (loan.pastdueAmount !== undefined && loan.pastdueAmount > 0) {
    return loan.pastdueAmount;
  }
  
  // 如果没有存储的逾期金额，返回 0
  // 不进行动态计算，以确保与 Excel 导入数据一致
  return 0;
}

// 计算逾期天数：从到期日到今天的天数（如果是负数表示未到期）
export function calcOverdueDays(loan: HSBCLoan): number {
  // 如果有存储的 pastdueAmount 且大于 0，说明已逾期
  if (loan.pastdueAmount !== undefined && loan.pastdueAmount > 0) {
    // 如果有存储的 overdueDays，直接使用
    if (loan.overdueDays !== undefined && loan.overdueDays > 0) {
      return loan.overdueDays;
    }
    
    // 否则基于 maturityDate 和 batchDate 计算
    // 使用批次日期或到期日计算逾期天数
    const batchDate = loan.batchDate ? new Date(loan.batchDate) : new Date();
    const maturityDate = new Date(loan.maturityDate);
    
    // 计算从到期日到批次日期的逾期天数
    const diffTime = batchDate.getTime() - maturityDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 1; // 至少返回1表示逾期
  }
  
  const balance = calcBalance(loan);
  // 如果余额 <= 0.9，则不算逾期，返回 -1 表示不逾期
  if (balance <= 0.9) {
    return -1;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maturityDate = new Date(loan.maturityDate);
  maturityDate.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - maturityDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// 计算距离到期的天数（负数表示已到期）
export function calcDaysToMaturity(loan: HSBCLoan): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maturityDate = new Date(loan.maturityDate);
  maturityDate.setHours(0, 0, 0, 0);
  const diffTime = maturityDate.getTime() - today.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// 获取状态：基于余额和逾期金额判断
export function calcStatus(loan: HSBCLoan): 'active' | 'settled' | 'overdue' | 'settling' {
  const balance = calcBalance(loan);
  const pastdueAmount = calcPastdueAmount(loan);
  
  if (balance === 0) {
    return 'settled';
  }
  if (pastdueAmount > 0) {
    return 'overdue';
  }
  if (balance < loan.loanAmount) {
    return 'settling'; // 还款中
  }
  return 'active';
}

// Excel 导入行数据
export interface HSBCImportRow {
  'Loan Reference'?: string;
  'Merchant ID'?: string;
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

// 汇丰统计仪表盘
export interface HSBCStats {
  totalLoans: number;
  totalMerchants: number;
  activeMerchants: number;
  totalLoanAmount: number;
  totalBalance: number;
  totalPastdueAmount: number;
  overdueRate: number;
  overdueMerchants: number;
  overdueLoans: number;
  currencyBreakdown: CurrencyBreakdown[];
  riskDistribution: RiskDistribution[];
  maturityDistribution: MaturityDistribution[];
  recentTrend: TrendItem[];
}

export interface CurrencyBreakdown {
  currency: 'CNY' | 'USD';
  loanCount: number;
  totalAmount: number;
  balance: number;
  pastdueAmount: number;
  overdueLoans: number;
  overdueMerchants: number;
}

export interface RiskDistribution {
  level: string;
  count: number;
  amount: number;
  color: string;
}

export interface MaturityDistribution {
  range: string;
  days: number;
  count: number;
  amount: number;
}

export interface TrendItem {
  date: string;
  amount: number;
  pastdue: number;
}

// 案件筛选条件
export interface HSBCLoanFilter {
  search?: string;
  merchantId?: string;
  borrowerName?: string;
  currency?: 'CNY' | 'USD' | 'all';
  status?: 'all' | 'active' | 'settled' | 'overdue';
  minAmount?: number;
  maxAmount?: number;
  batchDate?: string;
  hasOverdue?: boolean;
  page?: number;
  pageSize?: number;
}

// 案件操作日志
export interface HSBCLoanLog {
  id: string;
  loanId: string;
  action: string;
  operator: string;
  timestamp: string;
  details?: string;
}

// 导出数据结构
export interface HSBCExportData {
  loans: HSBCLoan[];
  stats: HSBCStats;
  exportTime: string;
  exportedBy: string;
}

// 缓存的贷款数据
let cachedLoans: HSBCLoan[] = [];
let lastImportTime: string | null = null;

export function getCachedLoans(): HSBCLoan[] {
  return cachedLoans;
}

export function setCachedLoans(loans: HSBCLoan[]): void {
  cachedLoans = loans;
  lastImportTime = new Date().toISOString();
}

export function getLastImportTime(): string | null {
  return lastImportTime;
}

export function clearCachedLoans(): void {
  cachedLoans = [];
  lastImportTime = null;
}

// 解析 Excel 行为贷款数据
export function parseImportRow(row: HSBCImportRow, batchDate?: string): HSBCLoan | null {
  try {
    // 使用批次日期或当前日期来判断逾期
    const today = batchDate ? new Date(batchDate) : new Date();
    
    const loanReference = row['Loan Reference']?.trim();
    if (!loanReference) return null;

    const merchantId = row['Merchant ID']?.trim() || '';
    const borrowerName = row['Borrower Name']?.trim() || '';
    
    // 解析还款计划
    const repaymentSchedule: RepaymentRecord[] = [];
    let idx = 1;
    while (row[`Repayment Date`] && row[`Repay amount`]) {
      const dateKey = Object.keys(row).find(k => k.includes('Repayment Date') && !k.includes('Repay'));
      const amountKey = Object.keys(row).find(k => k.includes('Repay amount'));
      if (!dateKey || !amountKey) break;
      
      const date = row[dateKey];
      const amountStr = row[amountKey];
      if (date && amountStr) {
        const amount = parseFloat(amountStr.replace(/,/g, '')) || 0;
        if (amount > 0) {
          repaymentSchedule.push({
            date: date.trim(),
            amount,
            repaid: false,
          });
        }
      }
      
      // 移动到下一对
      idx++;
      if (idx > 40) break; // 防止无限循环
    }

    // 解析金额
    const parseAmount = (str?: string): number => {
      if (!str) return 0;
      const cleaned = str.toString().replace(/,/g, '').trim();
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    };

    return {
      id: loanReference,
      loanReference,
      merchantId,
      borrowerName,
      loanStartDate: row['Loan Start Date']?.trim() || '',
      loanCurrency: (row['Loan Currency']?.trim().toUpperCase() || 'USD') as 'CNY' | 'USD',
      loanAmount: parseAmount(row['Loan Amount']),
      loanInterest: row['Loan Interest']?.trim() || '',
      totalInterestRate: parseFloat(row['Total Interest Rate'] || '0') || 0,
      loanTenor: row['Loan Tenor']?.trim() || '',
      maturityDate: row['Maturity Date']?.trim() || '',
      repaymentSchedule,
      // 余额 = 贷款金额 - 已还款总额（从还款计划计算）
      balance: (() => {
        const totalRepaid = repaymentSchedule.reduce((sum, r) => sum + r.amount, 0);
        return Math.max(0, parseAmount(row['Loan Amount']) - totalRepaid);
      })(),
      // 逾期金额 = 到期日之后仍未还款的金额
      // 只有当前日期超过到期日，且仍有未还金额时才计算逾期
      pastdueAmount: (() => {
        const loanAmount = parseAmount(row['Loan Amount']);
        const totalRepaid = repaymentSchedule.reduce((sum, r) => sum + r.amount, 0);
        const balance = Math.max(0, loanAmount - totalRepaid);
        
        const maturityDateStr = row['Maturity Date']?.trim();
        if (!maturityDateStr) return 0;
        
        const maturityDate = new Date(maturityDateStr);
        if (today <= maturityDate) {
          // 还未到到期日，没有逾期
          return 0;
        }
        
        // 超过到期日，逾期金额 = 余额
        return balance;
      })(),
      freezeAccountRequested: row['Freeze Account Requested? (DDMMYY)']?.trim() || undefined,
      forceDebitRequested: row['Force Debit Requested? (DDMMYY)']?.trim() || undefined,
      approvalFromRM: row['Approval from RM TH (No action taken on Freeze Account OR Force Debit)? (DDMMYY)']?.trim() || undefined,
      confirmationFreezeAccount: row['Confirmation from Dowsure with action taken on Freeze Account?']?.trim() || undefined,
      confirmationForceDebit: row['Confirmation from Dowsure with action taken on Force Debit?']?.trim() || undefined,
      remarks: row['Remarks (Any subsequent action likes freeze PSP account on day 8 or follow up with Dowsure if no response on action date)']?.trim() || 
               row['备注（任何后续行动，如在第8天冻结PSP账户，或在行动日期没有回应时跟进Dowsure）']?.trim() || '',
      // 状态判断：基于余额和逾期金额
      status: (() => {
        const loanAmount = parseAmount(row['Loan Amount']);
        const totalRepaid = repaymentSchedule.reduce((sum, r) => sum + r.amount, 0);
        const balance = Math.max(0, loanAmount - totalRepaid);
        
        if (balance === 0) return 'settled';
        
        const maturityDateStr = row['Maturity Date']?.trim();
        if (maturityDateStr) {
          const maturityDate = new Date(maturityDateStr);
          if (today > maturityDate && balance > 0) {
            return 'overdue';
          }
        }
        
        return balance < loanAmount ? 'settling' : 'active';
      })(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error parsing import row:', error);
    return null;
  }
}

// 计算统计数据
export function calculateStats(loans: HSBCLoan[]): HSBCStats {
  const USD_TO_CNY = 7;
  
  const totalLoans = loans.length;
  const uniqueMerchants = [...new Set(loans.map(l => l.merchantId))];
  const activeMerchants = uniqueMerchants.filter(m => 
    loans.some(l => l.merchantId === m && (l.balance ?? 0) > 1)
  ).length;
  
  const cnyLoans = loans.filter(l => l.loanCurrency === 'CNY');
  const usdLoans = loans.filter(l => l.loanCurrency === 'USD');
  
  const totalLoanAmount = 
    cnyLoans.reduce((sum, l) => sum + l.loanAmount, 0) +
    usdLoans.reduce((sum, l) => sum + l.loanAmount * USD_TO_CNY, 0);
  
  const totalBalance = 
    cnyLoans.reduce((sum, l) => sum + (l.balance ?? 0), 0) +
    usdLoans.reduce((sum, l) => sum + (l.balance ?? 0) * USD_TO_CNY, 0);
  
  const totalPastdueAmount = 
    cnyLoans.reduce((sum, l) => sum + (l.pastdueAmount ?? 0), 0) +
    usdLoans.reduce((sum, l) => sum + (l.pastdueAmount ?? 0) * USD_TO_CNY, 0);
  
  const overdueLoans = loans.filter(l => (l.pastdueAmount ?? 0) > 0);
  const overdueMerchantSet = new Set(overdueLoans.map(l => l.merchantId));

  // 币种分布
  const currencyBreakdown: CurrencyBreakdown[] = [
    {
      currency: 'CNY',
      loanCount: cnyLoans.length,
      totalAmount: cnyLoans.reduce((sum, l) => sum + l.loanAmount, 0),
      balance: cnyLoans.reduce((sum, l) => sum + (l.balance ?? 0), 0),
      pastdueAmount: cnyLoans.reduce((sum, l) => sum + (l.pastdueAmount ?? 0), 0),
      overdueLoans: cnyLoans.filter(l => (l.pastdueAmount ?? 0) > 0).length,
      overdueMerchants: new Set(cnyLoans.filter(l => (l.pastdueAmount ?? 0) > 0).map(l => l.merchantId)).size,
    },
    {
      currency: 'USD',
      loanCount: usdLoans.length,
      totalAmount: usdLoans.reduce((sum, l) => sum + l.loanAmount, 0),
      balance: usdLoans.reduce((sum, l) => sum + (l.balance ?? 0), 0),
      pastdueAmount: usdLoans.reduce((sum, l) => sum + (l.pastdueAmount ?? 0), 0),
      overdueLoans: usdLoans.filter(l => (l.pastdueAmount ?? 0) > 0).length,
      overdueMerchants: new Set(usdLoans.filter(l => (l.pastdueAmount ?? 0) > 0).map(l => l.merchantId)).size,
    },
  ];

  // 风险分布
  const riskDistribution: RiskDistribution[] = [
    { level: '低风险', count: Math.floor(overdueLoans.length * 0.3), amount: totalPastdueAmount * 0.3, color: '#22c55e' },
    { level: '中风险', count: Math.floor(overdueLoans.length * 0.25), amount: totalPastdueAmount * 0.25, color: '#eab308' },
    { level: '高风险', count: Math.floor(overdueLoans.length * 0.25), amount: totalPastdueAmount * 0.25, color: '#f97316' },
    { level: '严重风险', count: Math.floor(overdueLoans.length * 0.15), amount: totalPastdueAmount * 0.15, color: '#ef4444' },
    { level: '极高风险', count: Math.floor(overdueLoans.length * 0.05), amount: totalPastdueAmount * 0.05, color: '#991b1b' },
  ];

  // 期限分布
  const maturityDistribution: MaturityDistribution[] = [
    { range: '7天内', days: 7, count: Math.floor(totalLoans * 0.05), amount: totalBalance * 0.05 },
    { range: '15天内', days: 15, count: Math.floor(totalLoans * 0.08), amount: totalBalance * 0.08 },
    { range: '30天内', days: 30, count: Math.floor(totalLoans * 0.12), amount: totalBalance * 0.12 },
    { range: '45天内', days: 45, count: Math.floor(totalLoans * 0.1), amount: totalBalance * 0.1 },
    { range: '45天以上', days: 999, count: Math.floor(totalLoans * 0.65), amount: totalBalance * 0.65 },
  ];

  // 趋势数据 (最近6个月)
  const recentTrend: TrendItem[] = [];
  const months = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06'];
  months.forEach((month, idx) => {
    recentTrend.push({
      date: month,
      amount: totalBalance * (0.8 + idx * 0.04),
      pastdue: totalPastdueAmount * (0.5 + idx * 0.1),
    });
  });

  return {
    totalLoans,
    totalMerchants: uniqueMerchants.length,
    activeMerchants,
    totalLoanAmount: Math.round(totalLoanAmount),
    totalBalance: Math.round(totalBalance),
    totalPastdueAmount: Math.round(totalPastdueAmount),
    overdueRate: totalBalance > 0 ? Math.round((totalPastdueAmount / totalBalance) * 10000) / 100 : 0,
    overdueMerchants: overdueMerchantSet.size,
    overdueLoans: overdueLoans.length,
    currencyBreakdown,
    riskDistribution,
    maturityDistribution,
    recentTrend,
  };
}

// 筛选贷款
export function filterLoans(loans: HSBCLoan[], filter: HSBCLoanFilter): HSBCLoan[] {
  let result = [...loans];

  if (filter.search) {
    const search = filter.search.toLowerCase();
    result = result.filter(l =>
      l.loanReference.toLowerCase().includes(search) ||
      l.borrowerName.toLowerCase().includes(search) ||
      l.merchantId.toLowerCase().includes(search)
    );
  }

  if (filter.merchantId) {
    result = result.filter(l => l.merchantId === filter.merchantId);
  }

  if (filter.currency && filter.currency !== 'all') {
    result = result.filter(l => l.loanCurrency === filter.currency);
  }

  if (filter.status && filter.status !== 'all') {
    if (filter.status === 'overdue') {
      result = result.filter(l => (l.pastdueAmount ?? 0) > 0);
    } else {
      result = result.filter(l => l.status === filter.status);
    }
  }

  if (filter.hasOverdue) {
    result = result.filter(l => (l.pastdueAmount ?? 0) > 0);
  }

  if (filter.minAmount) {
    result = result.filter(l => l.loanAmount >= filter.minAmount!);
  }

  if (filter.maxAmount) {
    result = result.filter(l => l.loanAmount <= filter.maxAmount!);
  }

  if (filter.batchDate) {
    result = result.filter(l => l.batchDate === filter.batchDate);
  }

  return result;
}

// 生成示例贷款数据
export function generateSampleLoans(): HSBCLoan[] {
  const borrowers = [
    { merchantId: '68537', name: 'RONDAFUL (HK) INTERNATIONAL LIMITED', currency: 'CNY' as const, baseAmount: 1971109.85 },
    { merchantId: '63257', name: 'ZHONGBO INTL TRADE CO LIMITED', currency: 'USD' as const, baseAmount: 250000 },
    { merchantId: '70643', name: 'HK GRATEFULNESS GROUP CO LIMITED', currency: 'CNY' as const, baseAmount: 638712 },
    { merchantId: '69717', name: 'MAXUP HOLDINGS LIMITED', currency: 'USD' as const, baseAmount: 400000 },
    { merchantId: '69248', name: 'HK LA LA LA TECH CO LTD', currency: 'USD' as const, baseAmount: 110000 },
    { merchantId: '69300', name: 'HK HENGYU INTERNATIONAL LIMITED', currency: 'USD' as const, baseAmount: 100000 },
    { merchantId: '71490', name: 'XIAOYOUZI TECH CO LTD', currency: 'USD' as const, baseAmount: 50000 },
    { merchantId: '71880', name: 'HONGKONG ZHENGDASHENG PACKING CO LIMITED', currency: 'USD' as const, baseAmount: 300000 },
    { merchantId: '71753', name: 'KOWCOMMS TECH (HK) CO LIMITED', currency: 'USD' as const, baseAmount: 500000 },
    { merchantId: '71830', name: 'SECUTEK TECH LTD', currency: 'USD' as const, baseAmount: 500000 },
    { merchantId: '68718', name: 'ZHILE HOLDINGS GROUP (HK) LIMITED', currency: 'USD' as const, baseAmount: 500000 },
    { merchantId: '71228', name: 'HK HONGYI HUI INTL TECHNOLOGY LTD', currency: 'USD' as const, baseAmount: 100000 },
    { merchantId: '62312', name: 'SMART DO INTERNATIONAL LIMITED', currency: 'USD' as const, baseAmount: 400000 },
    { merchantId: '70536', name: 'HK INAMORI TRADING LIMITED', currency: 'USD' as const, baseAmount: 500000 },
    { merchantId: '61382', name: 'GAMEGEEK LIMITED', currency: 'USD' as const, baseAmount: 1000000 },
    { merchantId: '72311', name: 'LH TECHNOLOGY (HK) CO LIMITED', currency: 'USD' as const, baseAmount: 500000 },
    { merchantId: '72640', name: 'HK YUANHAO HOLDING GROUP LTD', currency: 'USD' as const, baseAmount: 1 },
    { merchantId: '71543', name: 'CHUANGXIN INTL TRADE CO LIMITED', currency: 'USD' as const, baseAmount: 85000 },
    { merchantId: '72248', name: 'HK XINJINHUI TECHNOLOGY CO LIMITED', currency: 'USD' as const, baseAmount: 350000 },
    { merchantId: '68665', name: 'FUTURE LIGHT HOLDINGS LIMITED', currency: 'USD' as const, baseAmount: 500000 },
    { merchantId: '62596', name: 'HYTOP INOVATION (HK) TECHNOLOGY LTD', currency: 'USD' as const, baseAmount: 485000 },
    { merchantId: '72851', name: 'HONGKONG FEILING TRADING LIMITED', currency: 'USD' as const, baseAmount: 300000 },
    { merchantId: '65366', name: 'KARY (HONG KONG) SUPPLY CHAIN MGT C', currency: 'USD' as const, baseAmount: 1 },
    { merchantId: '67348', name: 'BEST CHOICE ARTS PRODUCTS CO LTD', currency: 'USD' as const, baseAmount: 240000 },
  ];

  const prefixes = ['LAEAM', 'WCTHK', 'TPJHK', 'LAEHK'];
  const loans: HSBCLoan[] = [];

  borrowers.forEach((borrower, idx) => {
    const loanCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < loanCount; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const loanRef = `${prefix}${1000000 + idx * 100 + i}`;
      const loanAmount = borrower.baseAmount * (0.1 + Math.random() * 0.9);
      // 随机生成还款进度（已还比例）
      const repaidRatio = Math.random();
      const balance = loanAmount * (1 - repaidRatio);
      // 逾期：到期日设为过去的日期，且还有未还金额
      const isPastDue = Math.random() > 0.7;
      const startDate = new Date(2024, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1);
      const tenorDays = [90, 120, 180][Math.floor(Math.random() * 3)];
      const maturityDate = new Date(startDate);
      maturityDate.setDate(maturityDate.getDate() + tenorDays);
      
      // 如果需要逾期，设置到期日为过去
      if (isPastDue && balance > 0) {
        maturityDate.setFullYear(maturityDate.getFullYear() - 1); // 设为一年前
      }

      // 生成还款计划
      const repaymentSchedule: RepaymentRecord[] = [];
      if (repaidRatio > 0) {
        repaymentSchedule.push({
          date: startDate.toISOString().split('T')[0],
          amount: loanAmount * repaidRatio,
          repaid: true,
        });
      }
      if (balance > 0) {
        repaymentSchedule.push({
          date: maturityDate.toISOString().split('T')[0],
          amount: balance,
          repaid: false,
        });
      }

      loans.push({
        id: `loan_${idx}_${i}`,
        loanReference: loanRef,
        merchantId: borrower.merchantId,
        borrowerName: borrower.name,
        loanStartDate: startDate.toISOString().split('T')[0],
        loanCurrency: borrower.currency,
        loanAmount: Math.round(loanAmount * 100) / 100,
        loanInterest: borrower.currency === 'CNY' 
          ? `90D CNY HBR + ${(1.5 + Math.random()).toFixed(2)}%`
          : `120D SOFR TERM + ${(2.5 + Math.random()).toFixed(2)}%`,
        totalInterestRate: 5 + Math.random() * 4,
        loanTenor: `${tenorDays}D`,
        maturityDate: maturityDate.toISOString().split('T')[0],
        // 余额由calcBalance函数计算，这里存储计算后的值用于兼容
        balance: Math.round(balance * 100) / 100,
        repaymentSchedule,
        // 逾期金额由calcPastdueAmount函数计算，这里存储计算后的值
        pastdueAmount: Math.round(Math.max(0, balance) * 100) / 100,
        status: balance === 0 ? 'settled' : (isPastDue && balance > 0 ? 'overdue' : (balance < loanAmount ? 'active' : 'active')),
        batchDate: startDate.toISOString().split('T')[0].substring(0, 7),
      });
    }
  });

  return loans;
}
