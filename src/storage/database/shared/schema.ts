import { pgTable, text, integer, numeric, boolean, jsonb, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 汇丰贷款批次表
export const hsbcLoanBatches = pgTable('hsbc_loan_batches', {
  id: text('id').primaryKey(),
  batchDate: text('batch_date').notNull(),
  importTime: timestamp('import_time').defaultNow().notNull(),
  totalLoans: integer('total_loans').default(0).notNull(),
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).default('0').notNull(),
  status: text('status').default('pending').notNull(),
  remark: text('remark'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  batchDateIdx: index('hsbc_batches_batch_date_idx').on(table.batchDate),
  statusIdx: index('hsbc_batches_status_idx').on(table.status),
}));

// 汇丰贷款表
export const hsbcLoans = pgTable('hsbc_loans', {
  id: text('id').primaryKey(),
  batchId: text('batch_id').references(() => hsbcLoanBatches.id).notNull(),
  loanNo: text('loan_no').notNull(),
  userId: text('user_id').notNull(),
  borrowerName: text('borrower_name').notNull(),
  idCard: text('id_card'),
  companyName: text('company_name'),
  address: text('address'),
  phone1: text('phone1'),
  phone2: text('phone2'),
  phone3: text('phone3'),
  loanDate: text('loan_date'),
  dueDate: text('due_date'),
  loanAmount: numeric('loan_amount', { precision: 15, scale: 2 }),
  debtAmount: numeric('debt_amount', { precision: 15, scale: 2 }),
  overdueDays: integer('overdue_days').default(0),
  status: text('status').default('pending').notNull(),
  remark: text('remark'),
  merchantName: text('merchant_name'),
  merchantCode: text('merchant_code'),
  category: text('category'),
  productName: text('product_name'),
  platform: text('platform'),
  paymentCompany: text('payment_company'),
  funder: text('funder'),
  fundCategory: text('fund_category'),
  fiveLevelClassification: text('five_level_classification'),
  isLocked: boolean('is_locked').default(false),
  riskLevel: text('risk_level'),
  isExtended: boolean('is_extended').default(false),
  totalOutstandingBalance: numeric('total_outstanding_balance', { precision: 15, scale: 2 }),
  totalRepaidAmount: numeric('total_repaid_amount', { precision: 15, scale: 2 }),
  outstandingBalance: numeric('outstanding_balance', { precision: 15, scale: 2 }),
  overdueAmount: numeric('overdue_amount', { precision: 15, scale: 2 }),
  overduePrincipal: numeric('overdue_principal', { precision: 15, scale: 2 }),
  overdueInterest: numeric('overdue_interest', { precision: 15, scale: 2 }),
  repaidAmount: numeric('repaid_amount', { precision: 15, scale: 2 }),
  repaidPrincipal: numeric('repaid_principal', { precision: 15, scale: 2 }),
  repaidInterest: numeric('repaid_interest', { precision: 15, scale: 2 }),
  compensationAmount: numeric('compensation_amount', { precision: 15, scale: 2 }),
  loanTerm: integer('loan_term'),
  loanTermUnit: text('loan_term_unit'),
  overdueStartTime: text('overdue_start_time'),
  firstOverdueTime: text('first_overdue_time'),
  compensationDate: text('compensation_date'),
  companyAddress: text('company_address'),
  homeAddress: text('home_address'),
  householdAddress: text('household_address'),
  borrowerPhone: text('borrower_phone'),
  registeredPhone: text('registered_phone'),
  contactInfo: text('contact_info'),
  assignedSales: text('assigned_sales'),
  assignedRiskControl: text('assigned_risk_control'),
  assignedPostLoan: text('assigned_post_loan'),
  assigneeName: text('assignee_name'),
  caseLabels: jsonb('case_labels').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  batchIdIdx: index('hsbc_loans_batch_id_idx').on(table.batchId),
  loanNoIdx: index('hsbc_loans_loan_no_idx').on(table.loanNo),
  userIdIdx: index('hsbc_loans_user_id_idx').on(table.userId),
  statusIdx: index('hsbc_loans_status_idx').on(table.status),
  borrowerNameIdx: index('hsbc_loans_borrower_name_idx').on(table.borrowerName),
}));

// 商户销售映射表
export const merchantSalesMappings = pgTable('merchant_sales_mappings', {
  id: text('id').primaryKey(),
  merchantName: text('merchant_name').notNull(),
  merchantCode: text('merchant_code'),
  assignedSales: text('assigned_sales'),
  assignedRiskControl: text('assigned_risk_control'),
  assignedPostLoan: text('assigned_post_loan'),
  remark: text('remark'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  merchantNameIdx: index('merchant_mappings_name_idx').on(table.merchantName),
  merchantCodeIdx: index('merchant_mappings_code_idx').on(table.merchantCode),
}));

// 健康检查表
export const healthCheck = pgTable('health_check', {
  id: text('id').primaryKey(),
  status: text('status').notNull(),
  message: text('message'),
  checkedAt: timestamp('checked_at').defaultNow().notNull(),
});

// 案件表 - 匹配 types/case.ts 中的 Case 接口
export const cases = pgTable('cases', {
  id: text('id').primaryKey(),
  
  // 案件基础标识
  batchNo: text('batch_no').notNull(),
  loanNo: text('loan_no').notNull(),
  userId: text('user_id').notNull(),
  borrowerName: text('borrower_name').notNull(),
  productName: text('product_name'),
  platform: text('platform'),
  paymentCompany: text('payment_company'),
  funder: text('funder'),
  fundCategory: text('fund_category'),
  category: text('category'),
  overdueStage: text('overdue_stage'),
  
  // 案件核心状态
  status: text('status').notNull(),
  loanStatus: text('loan_status'),
  isLocked: boolean('is_locked').default(false),
  fiveLevelClassification: text('five_level_classification'),
  riskLevel: text('risk_level'),
  isExtended: boolean('is_extended').default(false),
  
  // 贷款核心金额
  currency: text('currency'),
  loanAmount: numeric('loan_amount', { precision: 15, scale: 2 }),
  totalLoanAmount: numeric('total_loan_amount', { precision: 15, scale: 2 }),
  totalOutstandingBalance: numeric('total_outstanding_balance', { precision: 15, scale: 2 }).notNull(),
  totalRepaidAmount: numeric('total_repaid_amount', { precision: 15, scale: 2 }),
  outstandingBalance: numeric('outstanding_balance', { precision: 15, scale: 2 }),
  overdueAmount: numeric('overdue_amount', { precision: 15, scale: 2 }).notNull(),
  overduePrincipal: numeric('overdue_principal', { precision: 15, scale: 2 }),
  overdueInterest: numeric('overdue_interest', { precision: 15, scale: 2 }),
  repaidAmount: numeric('repaid_amount', { precision: 15, scale: 2 }),
  repaidPrincipal: numeric('repaid_principal', { precision: 15, scale: 2 }),
  repaidInterest: numeric('repaid_interest', { precision: 15, scale: 2 }),
  compensationAmount: numeric('compensation_amount', { precision: 15, scale: 2 }),
  
  // 贷款期限时间
  loanTerm: integer('loan_term'),
  loanTermUnit: text('loan_term_unit'),
  loanDate: text('loan_date'),
  dueDate: text('due_date'),
  overdueDays: integer('overdue_days').notNull(),
  overdueStartTime: text('overdue_start_time'),
  firstOverdueTime: text('first_overdue_time'),
  compensationDate: text('compensation_date'),
  
  // 借款人主体信息
  companyName: text('company_name'),
  companyAddress: text('company_address'),
  homeAddress: text('home_address'),
  householdAddress: text('household_address'),
  borrowerPhone: text('borrower_phone'),
  registeredPhone: text('registered_phone'),
  contactInfo: text('contact_info'),
  
  // 案件责任归属
  assignedSales: text('assigned_sales'),
  assignedRiskControl: text('assigned_risk_control'),
  assignedPostLoan: text('assigned_post_loan'),
  
  // 系统元数据
  assigneeName: text('assignee_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  batchNoIdx: index('cases_batch_no_idx').on(table.batchNo),
  loanNoIdx: index('cases_loan_no_idx').on(table.loanNo),
  userIdIdx: index('cases_user_id_idx').on(table.userId),
  statusIdx: index('cases_status_idx').on(table.status),
  borrowerNameIdx: index('cases_borrower_name_idx').on(table.borrowerName),
}));

// 跟进记录表 - 匹配 types/case.ts 中的 FollowUp 接口
export const followups = pgTable('followups', {
  id: text('id').primaryKey(),
  caseId: text('case_id').references(() => cases.id).notNull(),
  
  // 基础信息
  follower: text('follower').notNull(),
  followTime: text('follow_time').notNull(),
  followType: text('follow_type').$type<'online' | 'offline' | 'other'>().notNull(),
  contact: text('contact').$type<'legal_representative' | 'actual_controller' | 'other'>().notNull(),
  followResult: text('follow_result').$type<'normal_repayment' | 'warning_rise' | 'overdue_promise' | 'other'>().notNull(),
  followRecord: text('follow_record').notNull(),
  fileInfo: jsonb('file_info'),
  
  // 系统元数据
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: text('created_by').notNull(),
}, (table) => ({
  caseIdIdx: index('followups_case_id_idx').on(table.caseId),
  followTimeIdx: index('followups_follow_time_idx').on(table.followTime),
}));

// 案件文件表 - 匹配 types/case.ts 中的 CaseFile 接口
export const caseFiles = pgTable('case_files', {
  id: text('id').primaryKey(),
  caseId: text('case_id').references(() => cases.id).notNull(),
  followupId: text('followup_id').references(() => followups.id),
  
  name: text('name').notNull(),
  type: text('type').$type<'image' | 'document' | 'other'>().notNull(),
  url: text('url'),
  data: text('data'),
  uploadTime: text('upload_time').notNull(),
  uploadBy: text('upload_by').notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  caseIdIdx: index('case_files_case_id_idx').on(table.caseId),
  followupIdIdx: index('case_files_followup_id_idx').on(table.followupId),
}));

// 案件历史记录表 - 匹配 types/case.ts 中的 CaseHistory 接口
export const caseHistory = pgTable('case_history', {
  id: text('id').primaryKey(),
  caseId: text('case_id').references(() => cases.id).notNull(),
  userId: text('user_id'),
  userName: text('user_name').notNull(),
  modifiedAt: text('modified_at').notNull(),
  fieldName: text('field_name').notNull(),
  fieldLabel: text('field_label'),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  caseIdIdx: index('case_history_case_id_idx').on(table.caseId),
  modifiedAtIndex: index('case_history_modified_at_idx').on(table.modifiedAt),
}));
