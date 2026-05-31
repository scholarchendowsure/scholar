import { pgTable, text, numeric, integer, boolean, timestamp, jsonb, varchar, serial, primaryKey, index, date, real } from 'drizzle-orm/pg-core';

// ===== 案件表（汇丰贷款专项管理
export const cases = pgTable('cases', {
  id: text('id').primaryKey(),
  
  // ===== 案件基础标识
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
  
  // ===== 案件核心状态
  status: text('status').notNull(),
  loanStatus: text('loan_status'),
  isLocked: boolean('is_locked'),
  fiveLevelClassification: text('five_level_classification'),
  riskLevel: text('risk_level'),
  isExtended: boolean('is_extended'),
  
  // ===== 贷款核心金额
  currency: text('currency'),
  loanAmount: numeric('loan_amount'),
  totalLoanAmount: numeric('total_loan_amount'),
  totalOutstandingBalance: numeric('total_outstanding_balance').notNull(),
  totalRepaidAmount: numeric('total_repaid_amount'),
  outstandingBalance: numeric('outstanding_balance'),
  overdueAmount: numeric('overdue_amount').notNull(),
  overduePrincipal: numeric('overdue_principal'),
  overdueInterest: numeric('overdue_interest'),
  repaidAmount: numeric('repaid_amount'),
  repaidPrincipal: numeric('repaid_principal'),
  repaidInterest: numeric('repaid_interest'),
  compensationAmount: numeric('compensation_amount'),
  
  // ===== 贷款期限时间
  loanTerm: integer('loan_term'),
  loanTermUnit: text('loan_term_unit'),
  loanDate: text('loan_date'),
  dueDate: text('due_date'),
  overdueDays: integer('overdue_days').notNull(),
  overdueStartTime: text('overdue_start_time'),
  firstOverdueTime: text('first_overdue_time'),
  compensationDate: text('compensation_date'),
  
  // ===== 借款人主体信息
  companyName: text('company_name'),
  companyAddress: text('company_address'),
  homeAddress: text('home_address'),
  householdAddress: text('household_address'),
  borrowerPhone: text('borrower_phone'),
  registeredPhone: text('registered_phone'),
  contactInfo: text('contact_info'),
  
  // ===== 案件责任归属
  assignedSales: text('assigned_sales'),
  assignedRiskControl: text('assigned_risk_control'),
  assignedPostLoan: text('assigned_post_loan'),
  
  // ===== 系统元数据
  assigneeName: text('assignee_name'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => {
  return {
    batchNoIdx: index('cases_batch_no_idx').on(table.batchNo),
    loanNoIdx: index('cases_loan_no_idx').on(table.loanNo),
    userIdIdx: index('cases_user_id_idx').on(table.userId),
    statusIdx: index('cases_status_idx').on(table.status),
  };
});

// ===== 跟进记录表
export const followups = pgTable('followups', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  
  // ===== 基础信息
  follower: text('follower').notNull(),
  followTime: text('follow_time').notNull(),
  followType: text('follow_type').notNull(),
  contact: text('contact').notNull(),
  followResult: text('follow_result').notNull(),
  followRecord: text('follow_record').notNull(),
  fileInfo: jsonb('file_info'),
  
  // ===== 系统元数据
  createdAt: text('created_at').notNull(),
  createdBy: text('created_by').notNull(),
}, (table) => {
  return {
    caseIdIdx: index('followups_case_id_idx').on(table.caseId),
    followTimeIdx: index('followups_follow_time_idx').on(table.followTime),
  };
});

// ===== 案件文件表
export const caseFiles = pgTable('case_files', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  followUpId: text('follow_up_id'),
  
  // ===== 文件信息
  name: text('name').notNull(),
  type: text('type').notNull(),
  url: text('url'),
  data: text('data'),
  uploadTime: text('upload_time').notNull(),
  uploadBy: text('upload_by').notNull(),
}, (table) => {
  return {
    caseIdIdx: index('case_files_case_id_idx').on(table.caseId),
    followUpIdIdx: index('case_files_follow_up_id_idx').on(table.followUpId),
  };
});

// ===== 案件历史记录表
export const caseHistory = pgTable('case_history', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  userId: text('user_id'),
  userName: text('user_name').notNull(),
  modifiedAt: text('modified_at').notNull(),
  fieldName: text('field_name').notNull(),
  fieldLabel: text('field_label'),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
}, (table) => {
  return {
    caseIdIdx: index('case_history_case_id_idx').on(table.caseId),
    modifiedAtIdx: index('case_history_modified_at_idx').on(table.modifiedAt),
  };
});

// ===== 汇丰贷款批次表
export const hsbcLoanBatches = pgTable('hsbc_loan_batches', {
  id: serial('id').primaryKey(),
  batchDate: date('batch_date').notNull(),
  importDate: timestamp('import_date').defaultNow().notNull(),
  recordCount: integer('record_count').notNull(),
  totalAmount: numeric('total_amount'),
}, (table) => {
  return {
    batchDateIdx: index('hsbc_loan_batches_batch_date_idx').on(table.batchDate),
  };
});

// ===== 汇丰贷款表
export const hsbcLoans = pgTable('hsbc_loans', {
  id: text('id').primaryKey(),
  loanReference: text('loan_reference').notNull(),
  merchantId: text('merchant_id').notNull(),
  merchantName: text('merchant_name'),
  borrowerName: text('borrower_name').notNull(),
  loanStartDate: text('loan_start_date'),
  loanDate: text('loan_date'),
  loanCurrency: text('loan_currency'),
  loanAmount: numeric('loan_amount'),
  loanInterest: text('loan_interest'),
  totalInterestRate: real('total_interest_rate'),
  loanTenor: text('loan_tenor'),
  maturityDate: text('maturity_date'),
  repaymentSchedule: jsonb('repayment_schedule'),
  balance: numeric('balance'),
  pastdueAmount: numeric('pastdue_amount'),
  totalRepaid: numeric('total_repaid'),
  freezeAccountRequested: text('freeze_account_requested'),
  forceDebitRequested: text('force_debit_requested'),
  approvalFromRM: text('approval_from_rm'),
  confirmationFreezeAccount: text('confirmation_freeze_account'),
  confirmationForceDebit: text('confirmation_force_debit'),
  remarks: text('remarks'),
  batchDate: text('batch_date'),
  status: text('status'),
  overdueDays: integer('overdue_days'),
  assignedTo: text('assigned_to'),
  followUpCount: integer('follow_up_count'),
  lastFollowUpDate: text('last_follow_up_date'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
}, (table) => {
  return {
    loanReferenceIdx: index('hsbc_loans_loan_reference_idx').on(table.loanReference),
    batchDateIdx: index('hsbc_loans_batch_date_idx').on(table.batchDate),
    statusIdx: index('hsbc_loans_status_idx').on(table.status),
  };
});

// ===== 商户销售映射表
export const merchantSalesMappings = pgTable('merchant_sales_mappings', {
  id: serial('id').primaryKey(),
  merchantName: varchar('merchant_name', { length: 200 }).notNull(),
  salesName: varchar('sales_name', { length: 100 }).notNull(),
}, (table) => {
  return {
    merchantNameIdx: index('merchant_sales_mappings_merchant_name_idx').on(table.merchantName),
  };
});

// ===== 健康检查表
export const healthCheck = pgTable('health_check', {
  id: serial('id').primaryKey(),
  checkTime: timestamp('check_time').defaultNow().notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  details: jsonb('details'),
});

// ===== 店铺数据表
export const shopData = pgTable('shop_data', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  updateTime: text('update_time').notNull(),
  latestDataset: text('latest_dataset').notNull(), // JSON字符串
  createdAt: text('created_at'),
  updatedAt: text('updated_at')
}, (table) => {
  return {
    userIdIdx: index('shop_data_user_id_idx').on(table.userId),
  };
});

// ===== 数据库类型定义
export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;
export type FollowUp = typeof followups.$inferSelect;
export type NewFollowUp = typeof followups.$inferInsert;
export type CaseFile = typeof caseFiles.$inferSelect;
export type NewCaseFile = typeof caseFiles.$inferInsert;
export type CaseHistory = typeof caseHistory.$inferSelect;
export type NewCaseHistory = typeof caseHistory.$inferInsert;
export type HsbcLoanBatch = typeof hsbcLoanBatches.$inferSelect;
export type NewHsbcLoanBatch = typeof hsbcLoanBatches.$inferInsert;
export type HsbcLoan = typeof hsbcLoans.$inferSelect;
export type NewHsbcLoan = typeof hsbcLoans.$inferInsert;
export type MerchantSalesMapping = typeof merchantSalesMappings.$inferSelect;
export type NewMerchantSalesMapping = typeof merchantSalesMappings.$inferInsert;
export type HealthCheck = typeof healthCheck.$inferSelect;
export type NewHealthCheck = typeof healthCheck.$inferInsert;
export type ShopData = typeof shopData.$inferSelect;
export type NewShopData = typeof shopData.$inferInsert;

