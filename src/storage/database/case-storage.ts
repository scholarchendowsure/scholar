import { Case } from '@/types/case';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_FILE = '/tmp/cases-v2.json';

// Mock数据生成
const generateMockCases = (): Case[] => {
  const cases: Case[] = [];
  const statuses = ['pending_assign', 'pending_visit', 'following', 'closed'];
  const riskLevels = ['low', 'medium', 'high', 'critical'];
  const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八'];
  const products = ['个人消费贷', '企业经营贷', '房屋抵押贷', '汽车消费贷'];
  const platforms = ['微信', '支付宝', '京东', '美团'];
  const paymentCompanies = ['支付宝', '微信支付', '银联'];
  const funders = ['银行A', '银行B', '银行C', '信托A'];
  const sales = ['销售A', '销售B', '销售C'];
  const postLoans = ['贷后A', '贷后B', '贷后C'];

  for (let i = 0; i < 20; i++) {
    const id = uuidv4();
    const name = names[i % names.length];
    const overdueDays = Math.floor(Math.random() * 365);
    const loanAmount = 100000 + Math.random() * 900000;

    cases.push({
      id,
      // 案件基础标识
      batchNo: `BATCH-${new Date().getFullYear()}${String(i + 1).padStart(4, '0')}`,
      loanNo: `LN${String(20240000 + i).padStart(8, '0')}`,
      userId: `UID${String(100000 + i).padStart(6, '0')}`,
      borrowerName: name,
      productName: products[i % products.length],
      platform: platforms[i % platforms.length],
      paymentCompany: paymentCompanies[i % paymentCompanies.length],
      funder: funders[i % funders.length],
      fundCategory: i % 3 === 0 ? '自有资金' : '合作资金',

      // 案件核心状态
      status: statuses[i % statuses.length],
      loanStatus: i % 2 === 0 ? '正常' : '逾期',
      isLocked: i % 5 === 0,
      fiveLevelClassification: ['正常', '关注', '次级', '可疑', '损失'][i % 5],
      riskLevel: riskLevels[i % riskLevels.length],
      isExtended: i % 4 === 0,

      // 贷款核心金额
      currency: 'CNY',
      loanAmount: Math.round(loanAmount),
      totalLoanAmount: Math.round(loanAmount * 1.1),
      totalOutstandingBalance: Math.round(loanAmount * 0.6),
      totalRepaidAmount: Math.round(loanAmount * 0.4),
      outstandingBalance: Math.round(loanAmount * 0.6),
      overdueAmount: Math.round(loanAmount * 0.3 * (overdueDays / 365)),
      overduePrincipal: Math.round(loanAmount * 0.2 * (overdueDays / 365)),
      overdueInterest: Math.round(loanAmount * 0.1 * (overdueDays / 365)),
      repaidAmount: Math.round(loanAmount * 0.4),
      repaidPrincipal: Math.round(loanAmount * 0.35),
      repaidInterest: Math.round(loanAmount * 0.05),
      compensationAmount: i % 6 === 0 ? Math.round(loanAmount * 0.1) : 0,

      // 贷款期限时间
      loanTerm: 12 + (i % 24),
      loanTermUnit: '月',
      loanDate: new Date(2023, i % 12, 15).toISOString().split('T')[0],
      dueDate: new Date(2024 + Math.floor(i / 12), (i + 12) % 12, 15).toISOString().split('T')[0],
      overdueDays,
      overdueStartTime: overdueDays > 0 ? new Date(2024, 0, 1).toISOString().split('T')[0] : '',
      firstOverdueTime: overdueDays > 0 ? new Date(2024, 0, 1).toISOString().split('T')[0] : '',
      compensationDate: i % 6 === 0 ? new Date(2024, i % 12, 1).toISOString().split('T')[0] : '',

      // 借款人主体信息
      companyName: i % 3 === 0 ? `某某科技有限公司${i + 1}` : '',
      companyAddress: i % 3 === 0 ? `北京市朝阳区路${i + 1}号` : '',
      homeAddress: `上海市浦东新区路${i + 1}号小区${i + 1}栋`,
      householdAddress: `浙江省杭州市西湖区路${i + 1}号`,
      borrowerPhone: `138${String(10000000 + i).slice(-8)}`,
      registeredPhone: `139${String(10000000 + i).slice(-8)}`,
      contactInfo: `联系人${i + 1}：186${String(10000000 + i).slice(-8)}`,

      // 案件责任归属
      assignedSales: sales[i % sales.length],
      assignedRiskControl: `风控${(i % 3) + 1}`,
      assignedPostLoan: postLoans[i % postLoans.length],

      // 系统元数据
      assigneeName: postLoans[i % postLoans.length],
      createdAt: new Date(2024, 0, 1 + i).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return cases;
};

let cachedCases: Case[] | null = null;

export const caseStorage = {
  async getAll(): Promise<Case[]> {
    if (!cachedCases) {
      cachedCases = generateMockCases();
    }
    return cachedCases;
  },

  async getById(id: string): Promise<Case | null> {
    const cases = await this.getAll();
    return cases.find(c => c.id === id) || null;
  },

  async create(data: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>): Promise<Case> {
    const newCase: Case = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (cachedCases) {
      cachedCases.unshift(newCase);
    }

    return newCase;
  },

  async update(id: string, data: Partial<Case>): Promise<Case | null> {
    const cases = await this.getAll();
    const index = cases.findIndex(c => c.id === id);
    if (index === -1) return null;

    cases[index] = {
      ...cases[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    cachedCases = [...cases];
    return cases[index];
  },

  async delete(id: string): Promise<boolean> {
    const cases = await this.getAll();
    const index = cases.findIndex(c => c.id === id);
    if (index === -1) return false;

    cases.splice(index, 1);
    cachedCases = [...cases];
    return true;
  },

  async importCases(casesData: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Case[]> {
    const importedCases: Case[] = [];

    for (const data of casesData) {
      const newCase: Case = {
        ...data,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      importedCases.push(newCase);
    }

    if (cachedCases) {
      cachedCases = [...importedCases, ...cachedCases];
    } else {
      cachedCases = importedCases;
    }

    return importedCases;
  },

  async getStats(): Promise<{ total: number; byStatus: Record<string, number>; byRiskLevel: Record<string, number> }> {
    const cases = await this.getAll();
    const byStatus: Record<string, number> = {};
    const byRiskLevel: Record<string, number> = {};

    cases.forEach(c => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      byRiskLevel[c.riskLevel] = (byRiskLevel[c.riskLevel] || 0) + 1;
    });

    return {
      total: cases.length,
      byStatus,
      byRiskLevel,
    };
  },
};
