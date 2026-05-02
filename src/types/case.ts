// 重构后的案件数据类型定义
// 基于业务模块划分的完整字段体系

export interface Case {
  id: string;

  // ===== 案件基础标识 =====
  batchNo: string; // 批次号
  loanNo: string; // 贷款单号
  userId: string; // 用户ID
  borrowerName: string; // 借款人姓名
  productName?: string; // 产品名称（可选）
  platform?: string; // 平台（可选）
  paymentCompany?: string; // 支付公司（可选）
  funder?: string; // 资金方（可选）
  fundCategory?: string; // 资金分类（可选）
  category?: string; // 分类（新增，可选）
  overdueStage?: string; // 逾期阶段（新增，可选）

  // ===== 案件核心状态 =====
  status: string; // 状态
  loanStatus?: string; // 贷款状态（可选）
  isLocked?: boolean; // 锁定情况（可选）
  fiveLevelClassification?: string; // 五级分类（可选）
  riskLevel?: string; // 风险等级（可选）
  isExtended?: boolean; // 是否展期（可选）
  
  // ===== 跟进记录 =====
  followups?: FollowUp[]; // 跟进记录（新增，可选）

  // ===== 贷款核心金额 =====
  currency?: string; // 币种（可选）
  loanAmount?: number; // 贷款金额（可选）
  totalLoanAmount?: number; // 总贷款金额（可选）
  totalOutstandingBalance: number; // 总在贷余额
  totalRepaidAmount?: number; // 已还款总额（可选）
  outstandingBalance?: number; // 在贷余额（可选）
  overdueAmount: number; // 逾期金额
  overduePrincipal?: number; // 逾期本金（可选）
  overdueInterest?: number; // 逾期利息（可选）
  repaidAmount?: number; // 已还金额（可选）
  repaidPrincipal?: number; // 已还本金（可选）
  repaidInterest?: number; // 已还利息（可选）
  compensationAmount?: number; // 代偿总额（可选）

  // ===== 贷款期限时间 =====
  loanTerm?: number; // 贷款期限（可选）
  loanTermUnit?: string; // 贷款期限单位（可选）
  loanDate?: string; // 贷款日期（可选）
  dueDate?: string; // 到期日（可选）
  overdueDays: number; // 逾期天数
  overdueStartTime?: string; // 逾期开始时间（可选）
  firstOverdueTime?: string; // 首次逾期时间（可选）
  compensationDate?: string; // 代偿日期（可选）

  // ===== 借款人主体信息 =====
  companyName?: string; // 公司名称（可选）
  companyAddress?: string; // 公司地址（可选）
  homeAddress?: string; // 家庭地址（可选）
  householdAddress?: string; // 户籍地址（可选）
  borrowerPhone?: string; // 借款人手机号（可选）
  registeredPhone?: string; // 注册手机号（可选）
  contactInfo?: string; // 联系方式（可选）

  // ===== 案件责任归属 =====
  assignedSales?: string; // 所属销售（可选）
  assignedRiskControl?: string; // 所属风控（可选）
  assignedPostLoan?: string; // 所属贷后（可选）

  // ===== 系统元数据 =====
  assigneeName?: string | null; // 当前跟进人（可选）
  createdAt: string; // 创建时间
  updatedAt: string; // 更新时间
}

// ===== 跟进记录类型定义
export interface FollowUp {
  id: string;
  
  // ===== 基础信息 =====
  follower: string; // 跟进人
  followTime: string; // 跟进时间
  followType: 'online' | 'offline'; // 跟进类型：线上/线下
  contact: 'legal_representative' | 'actual_controller'; // 联系人：法人/实控人
  followResult: 'normal_repayment' | 'warning_rise' | 'overdue_promise'; // 跟进结果：正常还款/预警上升/逾期承诺
  followRecord: string; // 跟进记录内容
  fileInfo?: string[]; // 文件信息：文件列表
  // ===== 系统元数据 =====
  createdAt: string; // 创建时间
  createdBy: string; // 创建人
}

// 跟进记录的显示配置
export const FOLLOWUP_TYPE_OPTIONS = [
  { value: 'online', label: '线上' },
  { value: 'offline', label: '线下' },
];

export const CONTACT_OPTIONS = [
  { value: 'legal_representative', label: '法人' },
  { value: 'actual_controller', label: '实控人' },
];

export const FOLLOWUP_RESULT_OPTIONS = [
  { value: 'normal_repayment', label: '正常还款' },
  { value: 'warning_rise', label: '预警上升' },
  { value: 'overdue_promise', label: '逾期承诺' },
];

// 导入时的字段映射（用于Excel导入）
export const CASE_IMPORT_FIELDS = {
  // 案件基础标识
  batchNo: { label: '批次号', required: true },
  loanNo: { label: '贷款单号', required: true },
  userId: { label: '用户ID', required: true },
  borrowerName: { label: '借款人姓名', required: true },
  productName: { label: '产品名称', required: false },
  platform: { label: '平台', required: false },
  paymentCompany: { label: '支付公司', required: false },
  funder: { label: '资金方', required: false },
  fundCategory: { label: '资金分类', required: false },

  // 案件核心状态
  status: { label: '状态', required: true },
  loanStatus: { label: '贷款状态', required: false },
  isLocked: { label: '锁定情况', required: false },
  fiveLevelClassification: { label: '五级分类', required: false },
  riskLevel: { label: '风险等级', required: false },
  isExtended: { label: '是否展期', required: false },

  // 贷款核心金额
  currency: { label: '币种', required: false },
  loanAmount: { label: '贷款金额', required: false },
  totalLoanAmount: { label: '总贷款金额', required: false },
  totalOutstandingBalance: { label: '总在贷余额', required: false },
  totalRepaidAmount: { label: '已还款总额', required: false },
  outstandingBalance: { label: '在贷余额', required: false },
  overdueAmount: { label: '逾期金额', required: false },
  overduePrincipal: { label: '逾期本金', required: false },
  overdueInterest: { label: '逾期利息', required: false },
  repaidAmount: { label: '已还金额', required: false },
  repaidPrincipal: { label: '已还本金', required: false },
  repaidInterest: { label: '已还利息', required: false },
  compensationAmount: { label: '代偿总额', required: false },

  // 贷款期限时间
  loanTerm: { label: '贷款期限', required: false },
  loanTermUnit: { label: '贷款期限单位', required: false },
  loanDate: { label: '贷款日期', required: false },
  dueDate: { label: '到期日', required: false },
  overdueDays: { label: '逾期天数', required: false },
  overdueStartTime: { label: '逾期开始时间', required: false },
  firstOverdueTime: { label: '首次逾期时间', required: false },
  compensationDate: { label: '代偿日期', required: false },

  // 借款人主体信息
  companyName: { label: '公司名称', required: false },
  companyAddress: { label: '公司地址', required: false },
  homeAddress: { label: '家庭地址', required: false },
  householdAddress: { label: '户籍地址', required: false },
  borrowerPhone: { label: '借款人手机号', required: false },
  registeredPhone: { label: '注册手机号', required: false },
  contactInfo: { label: '联系方式', required: false },

  // 案件责任归属
  assignedSales: { label: '所属销售', required: false },
  assignedRiskControl: { label: '所属风控', required: false },
  assignedPostLoan: { label: '所属贷后', required: false },
};

