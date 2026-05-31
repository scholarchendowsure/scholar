import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  decimal,
  boolean,
  jsonb,
  date,
  primaryKey,
  index
} from 'drizzle-orm/pg-core';

// ==================== 案件管理表 ====================

// 案件表
export const cases = pgTable('cases', {
  id: varchar('id', { length: 100 }).primaryKey(),
  batchNo: varchar('batch_no', { length: 100 }),
  loanNo: varchar('loan_no', { length: 100 }).notNull(),
  userId: varchar('user_id', { length: 100 }),
  borrowerName: varchar('borrower_name', { length: 200 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending_assign'),
  totalOutstandingBalance: decimal('total_outstanding_balance', { precision: 15, scale: 2 }),
  overdueAmount: decimal('overdue_amount', { precision: 15, scale: 2 }),
  overdueDays: integer('overdue_days'),
  productName: varchar('product_name', { length: 200 }),
  funder: varchar('funder', { length: 200 }),
  fundCategory: varchar('fund_category', { length: 100 }),
  isExtended: boolean('is_extended').default(false),
  currency: varchar('currency', { length: 10 }).default('CNY'),
  loanAmount: decimal('loan_amount', { precision: 15, scale: 2 }),
  outstandingBalance: decimal('outstanding_balance', { precision: 15, scale: 2 }),
  loanTerm: integer('loan_term'),
  loanTermUnit: varchar('loan_term_unit', { length: 20 }),
  loanDate: date('loan_date'),
  dueDate: date('due_date'),
  companyName: varchar('company_name', { length: 500 }),
  borrowerPhone: varchar('borrower_phone', { length: 50 }),
  assignedSales: varchar('assigned_sales', { length: 200 }),
  assignedPostLoan: varchar('assigned_post_loan', { length: 200 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  statusIdx: index('idx_cases_status').on(table.status),
  loanNoIdx: index('idx_cases_loan_no').on(table.loanNo),
  userIdIdx: index('idx_cases_user_id').on(table.userId),
  createdAtIdx: index('idx_cases_created_at').on(table.createdAt),
}));

// 跟进记录表
export const followups = pgTable('followups', {
  id: varchar('id', { length: 100 }).primaryKey(),
  caseId: varchar('case_id', { length: 100 }).notNull().references(() => cases.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 100 }),
  userName: varchar('user_name', { length: 200 }).notNull(),
  content: text('content').notNull(),
  type: varchar('type', { length: 50 }).notNull().default('normal'),
  location: varchar('location', { length: 500 }),
  duration: integer('duration'),
  nextFollowUpDate: date('next_follow_up_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  caseIdIdx: index('idx_followups_case_id').on(table.caseId),
  createdAtIdx: index('idx_followups_created_at').on(table.createdAt),
}));

// 案件文件表
export const caseFiles = pgTable('case_files', {
  id: varchar('id', { length: 100 }).primaryKey(),
  caseId: varchar('case_id', { length: 100 }).notNull().references(() => cases.id, { onDelete: 'cascade' }),
  followUpId: varchar('follow_up_id', { length: 100 }).references(() => followups.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 500 }).notNull(),
  fileType: varchar('file_type', { length: 100 }).notNull(),
  fileSize: integer('file_size'),
  url: text('url'),
  data: text('data'),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
  uploadedBy: varchar('uploaded_by', { length: 100 }),
  uploadedByName: varchar('uploaded_by_name', { length: 200 }),
}, (table) => ({
  caseIdIdx: index('idx_case_files_case_id').on(table.caseId),
  followUpIdIdx: index('idx_case_files_follow_up_id').on(table.followUpId),
}));

// 案件修改历史表
export const caseHistory = pgTable('case_history', {
  id: varchar('id', { length: 100 }).primaryKey(),
  caseId: varchar('case_id', { length: 100 }).notNull().references(() => cases.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 100 }),
  userName: varchar('user_name', { length: 200 }).notNull(),
  modifiedAt: timestamp('modified_at').notNull().defaultNow(),
  fieldName: varchar('field_name', { length: 100 }).notNull(),
  fieldLabel: varchar('field_label', { length: 200 }),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  caseIdIdx: index('idx_case_history_case_id').on(table.caseId),
  modifiedAtIdx: index('idx_case_history_modified_at').on(table.modifiedAt),
}));

// ==================== 汇丰贷款表 ====================

// 汇丰贷款批次表
export const hsbcLoanBatches = pgTable('hsbc_loan_batches', {
  id: serial('id').primaryKey(),
  batchDate: date('batch_date').notNull(),
  importedAt: timestamp('imported_at').notNull().defaultNow(),
  importedBy: varchar('imported_by', { length: 200 }),
  loanCount: integer('loan_count').notNull().default(0),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  remarks: text('remarks'),
}, (table) => ({
  batchDateIdx: index('idx_hsbc_batches_batch_date').on(table.batchDate),
}));

// 汇丰贷款表
export const hsbcLoans = pgTable('hsbc_loans', {
  id: serial('id').primaryKey(),
  batchId: integer('batch_id').references(() => hsbcLoanBatches.id),
  caseNo: varchar('case_no', { length: 50 }),
  accountNo: varchar('account_no', { length: 50 }),
  cardNo: varchar('card_no', { length: 50 }),
  idCard: varchar('id_card', { length: 50 }),
  customerName: varchar('customer_name', { length: 200 }),
  currency: varchar('currency', { length: 10 }),
  balance: decimal('balance', { precision: 15, scale: 2 }),
  daysPastDue: integer('days_past_due'),
  bucket: varchar('bucket', { length: 20 }),
  product: varchar('product', { length: 100 }),
  address: text('address'),
  phone1: varchar('phone1', { length: 50 }),
  phone2: varchar('phone2', { length: 50 }),
  phone3: varchar('phone3', { length: 50 }),
  phone4: varchar('phone4', { length: 50 }),
  phone5: varchar('phone5', { length: 50 }),
  companyName: varchar('company_name', { length: 500 }),
  merchantId: varchar('merchant_id', { length: 100 }),
  status: varchar('status', { length: 50 }).default('new'),
  assignedTo: varchar('assigned_to', { length: 200 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  caseNoIdx: index('idx_hsbc_loans_case_no').on(table.caseNo),
  idCardIdx: index('idx_hsbc_loans_id_card').on(table.idCard),
  statusIdx: index('idx_hsbc_loans_status').on(table.status),
  batchIdIdx: index('idx_hsbc_loans_batch_id').on(table.batchId),
}));

// 商户销售映射表
export const merchantSalesMappings = pgTable('merchant_sales_mappings', {
  id: serial('id').primaryKey(),
  merchantId: varchar('merchant_id', { length: 100 }).notNull(),
  salesName: varchar('sales_name', { length: 200 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  merchantIdIdx: index('idx_merchant_mappings_merchant_id').on(table.merchantId),
}));

// 健康检查表
export const healthCheck = pgTable('health_check', {
  id: serial('id').primaryKey(),
  status: varchar('status', { length: 20 }).notNull(),
  checkedAt: timestamp('checked_at').notNull().defaultNow(),
  details: jsonb('details'),
});
