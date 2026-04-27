// 汇丰贷款数据模型 - 适配 Excel 解密文件格式

export interface HSBCLoan {
  id: string;
  loanReference: string;      // Loan Reference
  merchantId: string;         // Merchant ID
  borrowerName: string;      // Borrower Name
  loanStartDate: string;      // Loan Start Date
  loanCurrency: 'CNY' | 'USD'; // Loan Currency
  loanAmount: number;         // Loan Amount
  loanInterest: string;       // Loan Interest (e.g., "HIBOR 3.32848% + 2.75%")
  totalInterestRate: number;  // Total Interest Rate (%)
  loanTenor: string;         // Loan Tenor (e.g., "90D", "120D")
  maturityDate: string;       // Maturity Date
  repaymentSchedule: RepaymentRecord[]; // 还款计划
  balance: number;            // Balance (余额)
  pastdueAmount: number;      // Pastdue amount (逾期金额)
  freezeAccountRequested?: string;      // 冻结账户请求日期
  forceDebitRequested?: string;        // 强制扣款请求日期
  approvalFromRM?: string;             // RM审批日期
  confirmationFreezeAccount?: string;   // Dowsure冻结账户确认
  confirmationForceDebit?: string;      // Dowsure强制扣款确认
  remarks: string;                      // 备注
  // 批次日期 (从文件名或导入日期获取)
  batchDate?: string;
}

export interface RepaymentRecord {
  date: string;      // 还款日期
  amount: number;    // 还款金额
  repaid?: boolean;  // 是否已还
}

// 汇丰统计仪表盘数据结构
export interface HSBCDashboardStats {
  totalLoans: number;            // 总贷款笔数
  activeMerchants: number;        // 在贷商户数量
  totalLoanAmount: number;        // 累计放款 (CNY)
  totalBalance: number;           // 在贷余额 (CNY)
  totalPastdueAmount: number;     // 逾期总额 (CNY)
  overdueRate: number;           // 逾期率
  overdueMerchantRate: number;    // 逾期商户占比
  warningAmount: number;          // 预警金额
  approachingMaturityAmount: number; // 临期金额 (3天内)
  
  // 币种细分
  currencyBreakdown: CurrencyBreakdown[];
  
  // 临近到期统计
  approachingMaturity: ApproachingMaturity[];
  
  // 逾期趋势 (按批次日期)
  overdueTrend: OverdueTrendItem[];
  
  // 风险评定
  riskAssessment: RiskAssessmentItem[];
}

export interface CurrencyBreakdown {
  currency: string;              // CNY / USD
  loanCount: number;             // 贷款笔数
  totalAmount: number;           // 总金额
  totalAmountUSD: number;        // 总金额(USD)
  overdueAmount: number;         // 逾期金额
  overdueAmountUSD: number;      // 逾期金额(USD)
  balance: number;              // 余额
  balanceUSD: number;            // 余额(USD)
  overdueMerchantCount: number;  // 逾期商户数
  overdueLoanCount: number;     // 逾期笔数
}

export interface ApproachingMaturity {
  daysRange: string;             // e.g., "7天内", "15天内"
  days: number;                  // 天数
  cnyAmount: number;             // CNY金额
  cnyMerchants: number;          // CNY商户数
  usdAmount: number;            // USD金额
  usdMerchants: number;          // USD商户数
}

export interface OverdueTrendItem {
  batchDate: string;             // 批次日期
  overdueAmount: number;        // 逾期总额
  balance: number;              // 在贷余额
  overdueRate: number;          // 逾期率
}

export interface RiskAssessmentItem {
  riskLevel: string;            // 低/中/高/严重/极高
  daysMin: number;              // 逾期天数最小值
  daysMax: number;              // 逾期天数最大值
  overdueAmount: number;        // 逾期金额
  merchantCount: number;        // 商户数
  loanCount: number;           // 笔数
}

// Excel导入数据 (原始行数据)
export interface HSBCImportRow {
  loanReference: string;
  merchantId: string;
  borrowerName: string;
  loanStartDate: string;
  loanCurrency: string;
  loanAmount: string;
  loanInterest: string;
  totalInterestRate: string;
  loanTenor: string;
  maturityDate: string;
  balance: string;
  pastdueAmount: string;
  [key: string]: string; // 动态还款计划列等
}

// Mock 数据生成
function generateMockLoans(): HSBCLoan[] {
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
    { merchantId: '72640', name: 'HK YUANHAO HOLDING GROUP LTD', currency: 'USD' as const, baseAmount: 100 },
    { merchantId: '71543', name: 'CHUANGXIN INTL TRADE CO LIMITED', currency: 'USD' as const, baseAmount: 85000 },
    { merchantId: '72248', name: 'HK XINJINHUI TECHNOLOGY CO LIMITED', currency: 'USD' as const, baseAmount: 350000 },
    { merchantId: '68665', name: 'FUTURE LIGHT HOLDINGS LIMITED', currency: 'USD' as const, baseAmount: 500000 },
    { merchantId: '62596', name: 'HYTOP INOVATION (HK) TECHNOLOGY LTD', currency: 'USD' as const, baseAmount: 485000 },
    { merchantId: '72851', name: 'HONGKONG FEILING TRADING LIMITED', currency: 'USD' as const, baseAmount: 300000 },
    { merchantId: '65366', name: 'KARY (HONG KONG) SUPPLY CHAIN MGT C', currency: 'USD' as const, baseAmount: 1000 },
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
      const interestRate = 3 + Math.random() * 6;
      const tenor = ['90D', '120D', '91D', '101D', '122D'][Math.floor(Math.random() * 5)];
      const startDate = new Date(2024, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1);
      const maturityDate = new Date(startDate);
      maturityDate.setDate(maturityDate.getDate() + parseInt(tenor));
      
      const hasOverdue = Math.random() > 0.7;
      const pastdueAmount = hasOverdue ? loanAmount * (0.05 + Math.random() * 0.15) : 0;
      
      loans.push({
        id: loanRef,
        loanReference: loanRef,
        merchantId: borrower.merchantId,
        borrowerName: borrower.name,
        loanStartDate: formatDate(startDate),
        loanCurrency: borrower.currency,
        loanAmount: Math.round(loanAmount * 100) / 100,
        loanInterest: borrower.currency === 'USD' 
          ? '120D SOFR TERM + 3%' 
          : '90D CNY HBR + 2.25%',
        totalInterestRate: Math.round(interestRate * 100) / 100,
        loanTenor: tenor,
        maturityDate: formatDate(maturityDate),
        repaymentSchedule: generateRepaymentSchedule(loanAmount, maturityDate),
        balance: Math.round(loanAmount * (0.3 + Math.random() * 0.7) * 100) / 100,
        pastdueAmount: Math.round(pastdueAmount * 100) / 100,
        freezeAccountRequested: hasOverdue && Math.random() > 0.5 ? formatDate(new Date()) : undefined,
        forceDebitRequested: hasOverdue && Math.random() > 0.7 ? formatDate(new Date()) : undefined,
        remarks: hasOverdue ? '逾期跟进中' : '',
        batchDate: '2024-07-01',
      });
    }
  });
  
  return loans;
}

function generateRepaymentSchedule(amount: number, maturityDate: Date): RepaymentRecord[] {
  const records: RepaymentRecord[] = [];
  const repaymentDate = new Date(maturityDate);
  repaymentDate.setDate(repaymentDate.getDate() - 3);
  
  records.push({
    date: formatDate(repaymentDate),
    amount: Math.round(amount * 100) / 100,
    repaid: Math.random() > 0.2,
  });
  
  return records;
}

function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate().toString().padStart(2, '0')}-${months[date.getMonth()]}-${date.getFullYear()}`;
}

// 汇率 (USD -> CNY)
const USD_TO_CNY_RATE = 7;

// 缓存的Mock数据
let cachedLoans: HSBCLoan[] | null = null;

export function getMockHSBCLoans(): HSBCLoan[] {
  if (!cachedLoans) {
    cachedLoans = generateMockLoans();
  }
  return cachedLoans;
}

export function setMockHSBCLoans(loans: HSBCLoan[]): void {
  cachedLoans = loans;
}

export function getMockHSBCStats(): HSBCDashboardStats {
  const loans = getMockHSBCLoans();
  
  // 计算统计数据
  const totalLoans = loans.length;
  const uniqueMerchants = [...new Set(loans.map(l => l.merchantId))];
  const activeMerchants = uniqueMerchants.filter(m => 
    loans.some(l => l.merchantId === m && l.balance > 1)
  ).length;
  
  // 按币种分组
  const cnyLoans = loans.filter(l => l.loanCurrency === 'CNY');
  const usdLoans = loans.filter(l => l.loanCurrency === 'USD');
  
  const totalLoanAmount = cnyLoans.reduce((sum, l) => sum + l.loanAmount, 0) 
    + usdLoans.reduce((sum, l) => sum + l.loanAmount * USD_TO_CNY_RATE, 0);
  const totalBalance = cnyLoans.reduce((sum, l) => sum + l.balance, 0) 
    + usdLoans.reduce((sum, l) => sum + l.balance * USD_TO_CNY_RATE, 0);
  const totalPastdueAmount = cnyLoans.reduce((sum, l) => sum + l.pastdueAmount, 0) 
    + usdLoans.reduce((sum, l) => sum + l.pastdueAmount * USD_TO_CNY_RATE, 0);
  
  // 逾期商户
  const overdueMerchants = uniqueMerchants.filter(m => 
    loans.some(l => l.merchantId === m && l.pastdueAmount >= 0.5)
  );
  
  // 计算风险评估
  const riskAssessment: RiskAssessmentItem[] = [
    { riskLevel: '低风险', daysMin: 0, daysMax: 30, overdueAmount: totalPastdueAmount * 0.4, merchantCount: Math.floor(overdueMerchants.length * 0.4), loanCount: Math.floor(totalLoans * 0.3) },
    { riskLevel: '中风险', daysMin: 31, daysMax: 60, overdueAmount: totalPastdueAmount * 0.3, merchantCount: Math.floor(overdueMerchants.length * 0.3), loanCount: Math.floor(totalLoans * 0.2) },
    { riskLevel: '高风险', daysMin: 61, daysMax: 90, overdueAmount: totalPastdueAmount * 0.2, merchantCount: Math.floor(overdueMerchants.length * 0.2), loanCount: Math.floor(totalLoans * 0.15) },
    { riskLevel: '严重风险', daysMin: 91, daysMax: 180, overdueAmount: totalPastdueAmount * 0.08, merchantCount: Math.floor(overdueMerchants.length * 0.08), loanCount: Math.floor(totalLoans * 0.1) },
    { riskLevel: '极高风险', daysMin: 181, daysMax: 999, overdueAmount: totalPastdueAmount * 0.02, merchantCount: Math.floor(overdueMerchants.length * 0.02), loanCount: Math.floor(totalLoans * 0.05) },
  ];
  
  // 生成逾期趋势
  const overdueTrend: OverdueTrendItem[] = [];
  const batchDates = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06', '2024-07'];
  batchDates.forEach((date, idx) => {
    const progress = (idx + 1) / batchDates.length;
    overdueTrend.push({
      batchDate: date,
      overdueAmount: Math.round(totalPastdueAmount * progress * (0.8 + Math.random() * 0.4)),
      balance: Math.round(totalBalance * progress),
      overdueRate: Math.round(progress * 8 * 100) / 100,
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
