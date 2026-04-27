// 优化后的 Mock 数据 - 缓存层

// 生成唯一ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// 缓存数据结构
interface CacheData<T> {
  data: T;
  timestamp: number;
}

// 内存缓存
const cache = new Map<string, CacheData<unknown>>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// 获取缓存
export function getCache<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

// 设置缓存
export function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// 清除缓存
export function clearCache(pattern?: string): void {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
}

// Mock 用户数据
export const MOCK_USERS = [
  { id: '1', name: '管理员', username: 'days', role: 'admin', status: 'active', email: 'admin@example.com' },
  { id: '2', name: '张三', username: 'zhangsan', role: 'agent', status: 'active', email: 'zhangsan@example.com' },
  { id: '3', name: '李四', username: 'lisi', role: 'agent', status: 'active', email: 'lisi@example.com' },
  { id: '4', name: '王五', username: 'wangwu', role: 'manager', status: 'active', email: 'wangwu@example.com' },
];

// Mock 案件数据 - 优化数量
export function getMockCases() {
  const cached = getCache<unknown[]>('cases');
  if (cached) return cached;

  const statuses = ['pending_assign', 'pending_visit', 'following', 'closed'] as const;
  const riskLevels = ['low', 'medium', 'high', 'critical', 'extreme'];
  const fundingSources = ['银行A', '银行B', '信托公司', '消费金融'];

  const cases = Array.from({ length: 50 }, (_, i) => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
    const overdueAmount = Math.floor(Math.random() * 500000) + 10000;
    const loanAmount = Math.floor(Math.random() * 1000000) + 50000;

    return {
      id: generateId(),
      caseNo: `CASE${String(2024001 + i).padStart(7, '0')}`,
      borrowerName: `借款人${i + 1}`,
      borrowerPhone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      address: `上海市浦东新区张江镇科苑路${Math.floor(Math.random() * 500) + 1}号`,
      debtAmount: String(overdueAmount),
      loanAmount: String(loanAmount),
      loanBalance: String(Math.floor(loanAmount * 0.7)),
      overdueAmount: String(overdueAmount),
      loanOrderNo: `LOAN${String(2024001 + i).padStart(7, '0')}`,
      companyName: `公司${i + 1}有限公司`,
      status,
      riskLevel,
      fundingSource: fundingSources[Math.floor(Math.random() * fundingSources.length)],
      assigneeName: status !== 'pending_assign' ? MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)]?.name || null : null,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
    };
  });

  setCache('cases', cases);
  return cases;
}

// Mock 汇丰贷款数据 - 优化
export function getMockHSBCLoans() {
  const cached = getCache<unknown[]>('hsbc_loans');
  if (cached) return cached;

  const merchants = ['商户A', '商户B', '商户C', '商户D', '商户E'];
  const currencies = ['CNY', 'USD'] as const;

  const loans = Array.from({ length: 20 }, (_, i) => {
    const currency = currencies[Math.floor(Math.random() * currencies.length)];
    const loanAmount = currency === 'USD' ? Math.floor(Math.random() * 500000) + 100000 : Math.floor(Math.random() * 5000000) + 500000;
    const balance = Math.floor(loanAmount * (0.5 + Math.random() * 0.5));
    const pastdueAmount = Math.random() > 0.7 ? Math.floor(balance * 0.1) : 0;

    return {
      id: generateId(),
      loanReference: `HSBC${String(2024001 + i).padStart(7, '0')}`,
      merchantId: `M${String(1001 + Math.floor(i / 4)).padStart(4, '0')}`,
      merchantName: merchants[Math.floor(i / 4) % merchants.length],
      borrowerName: `借款人${i + 1}`,
      loanStartDate: new Date(Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      loanCurrency: currency,
      loanAmount: String(loanAmount),
      loanInterest: `${(3 + Math.random() * 5).toFixed(2)}%`,
      loanTenor: `${12 + Math.floor(Math.random() * 36)}个月`,
      maturityDate: new Date(Date.now() + Math.floor(Math.random() * 180) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      balance: String(balance),
      pastdueAmount: String(pastdueAmount),
      batchDate: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
  });

  setCache('hsbc_loans', loans);
  return loans;
}

// Mock 还款记录
export function getMockRepaymentRecords() {
  const cached = getCache<unknown[]>('repayment_records');
  if (cached) return cached;

  const records = Array.from({ length: 30 }, (_, i) => ({
    id: generateId(),
    loanOrderNo: `LOAN${String(2024001 + Math.floor(i / 3)).padStart(7, '0')}`,
    borrowerName: `借款人${Math.floor(i / 3) + 1}`,
    repaymentDate: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000).toISOString(),
    repaymentAmount: String(Math.floor(Math.random() * 50000) + 5000),
    overdueAmount: String(Math.floor(Math.random() * 10000)),
    auditStatus: ['pending', 'approved', 'rejected'][Math.floor(Math.random() * 3)],
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
  }));

  setCache('repayment_records', records);
  return records;
}

// Mock 跟进记录
export function getMockFollowups(caseId: string) {
  const statuses = ['电话未接', '无人接听', '承诺还款', '拒绝还款', '暂时无法联系'];
  const intentions = ['强烈还款意愿', '一般还款意愿', '无还款意愿', '需要协商'];
  const nextPlans = ['继续跟进', '安排上门', '等待回复', '转交催收'];

  return Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, i) => ({
    id: generateId(),
    caseId,
    visitUser: MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)]?.name,
    visitTime: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
    visitResult: statuses[Math.floor(Math.random() * statuses.length)],
    communicationContent: `与借款人进行了第${i + 1}次沟通，了解了还款意愿情况。`,
    repaymentIntention: intentions[Math.floor(Math.random() * intentions.length)],
    nextPlan: nextPlans[Math.floor(Math.random() * nextPlans.length)],
    followupType: ['电话跟进', '上门外访', '短信提醒'][Math.floor(Math.random() * 3)],
    promiseRepaymentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    promiseRepaymentAmount: String(Math.floor(Math.random() * 20000) + 5000),
    createdAt: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

// Mock 风险评定
export function getMockRiskAssessments(caseId: string) {
  const shopStatuses = ['营业正常', '暂停营业', '关门歇业', '转让中'];
  const assets = ['有房产', '有车辆', '有存款', '无资产'];
  const repayments = ['正常还款', '偶尔逾期', '经常逾期', '恶意拖欠'];

  return Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, i) => ({
    id: generateId(),
    caseId,
    riskLevel: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
    shopStatusTags: shopStatuses.slice(0, Math.floor(Math.random() * 3) + 1),
    assetTags: assets.slice(0, Math.floor(Math.random() * 2) + 1),
    repaymentTags: repayments.slice(0, Math.floor(Math.random() * 2) + 1),
    result: '综合评估',
    createdAt: new Date(Date.now() - i * 15 * 24 * 60 * 60 * 1000).toISOString(),
  }));
}
