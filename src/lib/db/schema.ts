import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, decimal, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 枚举定义
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'agent']);
export const caseStatusEnum = pgEnum('case_status', ['pending_assign', 'pending_visit', 'following', 'closed']);
export const closureTypeEnum = pgEnum('closure_type', ['full_repayment', 'partial_repayment', 'no_repayment', 'other']);
export const auditStatusEnum = pgEnum('audit_status', ['pending', 'approved', 'rejected']);
export const serviceStatusEnum = pgEnum('service_status', ['active', 'inactive', 'error']);
export const serviceTypeEnum = pgEnum('service_type', ['mysql', 'postgresql', 'mongodb', 'http']);

// 用户表
export const systemUsers = pgTable('system_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  sequence: integer('sequence').default(0),
  name: varchar('name', { length: 100 }).notNull(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 100 }),
  password: varchar('password', { length: 255 }).notNull(),
  department: varchar('department', { length: 100 }),
  role: userRoleEnum('role').default('agent'),
  status: userStatusEnum('status').default('active'),
  feishuUserId: varchar('feishu_user_id', { length: 100 }),
  lastLoginTime: timestamp('last_login_time'),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').defaultNow(),
  updatedBy: uuid('updated_by'),
});

// 角色表
export const systemRoles = pgTable('system_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  permissions: jsonb('permissions').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').defaultNow(),
  updatedBy: uuid('updated_by'),
});

// 外访案件表
export const visitCases = pgTable('visit_cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseNo: varchar('case_no', { length: 50 }).notNull().unique(),
  borrowerName: varchar('borrower_name', { length: 100 }).notNull(),
  borrowerIdCard: varchar('borrower_id_card', { length: 50 }),
  borrowerPhone: varchar('borrower_phone', { length: 20 }),
  address: text('address'),
  debtAmount: decimal('debt_amount', { precision: 15, scale: 2 }),
  loanOrderNo: varchar('loan_order_no', { length: 50 }),
  companyName: varchar('company_name', { length: 200 }),

  loanAmount: decimal('loan_amount', { precision: 15, scale: 2 }),
  loanBalance: decimal('loan_balance', { precision: 15, scale: 2 }),
  overdueAmount: decimal('overdue_amount', { precision: 15, scale: 2 }),

  status: caseStatusEnum('status').default('pending_assign'),
  assignedUser: uuid('assigned_user'),
  userId: uuid('user_id'),
  batchNumber: varchar('batch_number', { length: 50 }),

  // 地址字段
  homeAddress: text('home_address'),
  companyAddress: text('company_address'),
  otherAddress: text('other_address'),
  addressSource: varchar('address_source', { length: 50 }),

  // 高级字段
  riskLevel: varchar('risk_level', { length: 20 }),
  salesPerson: varchar('sales_person', { length: 100 }),
  postLoanManager: varchar('post_loan_manager', { length: 100 }),
  fundingSource: varchar('funding_source', { length: 100 }),
  platform: varchar('platform', { length: 100 }),
  productName: varchar('product_name', { length: 100 }),
  contactInfo: text('contact_info'),
  lockStatus: varchar('lock_status', { length: 20 }),
  guaranteeType: varchar('guarantee_type', { length: 50 }),
  loanTerm: integer('loan_term'),
  overdueDays: integer('overdue_days'),
  totalOverdueAmount: decimal('total_overdue_amount', { precision: 15, scale: 2 }),

  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').defaultNow(),
  updatedBy: uuid('updated_by'),
});

// 跟进记录表
export const followups = pgTable('followups', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').notNull().references(() => visitCases.id),
  visitUser: uuid('visit_user'),
  visitTime: timestamp('visit_time'),
  visitResult: varchar('visit_result', { length: 50 }),
  communicationContent: text('communication_content'),
  repaymentIntention: varchar('repayment_intention', { length: 50 }),
  nextPlan: text('next_plan'),
  photos: jsonb('photos').$type<string[]>(),
  followupType: varchar('followup_type', { length: 50 }),
  phoneStatus: varchar('phone_status', { length: 50 }),
  addressValidity: varchar('address_validity', { length: 50 }),
  contactInfo: text('contact_info'),
  promiseRepaymentDate: timestamp('promise_repayment_date'),
  promiseRepaymentAmount: decimal('promise_repayment_amount', { precision: 15, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').defaultNow(),
  updatedBy: uuid('updated_by'),
});

// 结案记录表
export const caseClosures = pgTable('case_closures', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').notNull().references(() => visitCases.id),
  closureType: closureTypeEnum('closure_type'),
  closureNote: text('closure_note'),
  actualRepaymentAmount: decimal('actual_repayment_amount', { precision: 15, scale: 2 }),
  closedBy: uuid('closed_by'),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').defaultNow(),
  updatedBy: uuid('updated_by'),
});

// 风险评定表
export const riskAssessments = pgTable('risk_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').notNull().references(() => visitCases.id),
  riskLevel: varchar('risk_level', { length: 20 }),
  shopStatusTags: jsonb('shop_status_tags').$type<string[]>(),
  assetTags: jsonb('asset_tags').$type<string[]>(),
  repaymentTags: jsonb('repayment_tags').$type<string[]>(),
  result: text('result'),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').defaultNow(),
  updatedBy: uuid('updated_by'),
});

// 还款记录表
export const repaymentRecords = pgTable('repayment_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').references(() => visitCases.id),
  repaymentDate: timestamp('repayment_date'),
  repaymentAmount: decimal('repayment_amount', { precision: 15, scale: 2 }),
  currency: varchar('currency', { length: 10 }).default('CNY'),
  relatedPerson: varchar('related_person', { length: 100 }),
  attachments: jsonb('attachments').$type<string[]>(),
  overdueAmount: decimal('overdue_amount', { precision: 15, scale: 2 }),
  repaymentRatio: decimal('repayment_ratio', { precision: 5, scale: 2 }),
  riskLevel: varchar('risk_level', { length: 20 }),
  auditStatus: auditStatusEnum('audit_status').default('pending'),
  auditBy: uuid('audit_by'),
  auditAt: timestamp('audit_at'),
  auditRemark: text('audit_remark'),
  loanOrderNo: varchar('loan_order_no', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').defaultNow(),
  updatedBy: uuid('updated_by'),
});

// 文件记录表
export const fileRecords = pgTable('file_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').references(() => visitCases.id),
  content: text('content'),
  attachments: jsonb('attachments').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').defaultNow(),
  updatedBy: uuid('updated_by'),
});

// 汇丰贷款表
export const hsbcLoans = pgTable('hsbc_loans', {
  id: uuid('id').primaryKey().defaultRandom(),
  loanReference: varchar('loan_reference', { length: 50 }),
  merchantId: varchar('merchant_id', { length: 50 }),
  borrowerName: varchar('borrower_name', { length: 100 }),
  loanStartDate: timestamp('loan_start_date'),
  loanCurrency: varchar('loan_currency', { length: 10 }).default('CNY'),
  loanAmount: decimal('loan_amount', { precision: 15, scale: 2 }),
  loanInterest: varchar('loan_interest', { length: 100 }),
  totalInterestRate: decimal('total_interest_rate', { precision: 8, scale: 4 }),
  loanTenor: integer('loan_tenor'),
  maturityDate: timestamp('maturity_date'),
  repaymentSchedule: jsonb('repayment_schedule').$type<{
    period: number;
    principal: number;
    interest: number;
    balance: number;
    dueDate: string;
  }[]>(),
  balance: decimal('balance', { precision: 15, scale: 2 }),
  pastdueAmount: decimal('pastdue_amount', { precision: 15, scale: 2 }).default('0'),
  actionInfo: jsonb('action_info').$type<{
    lastAction: string;
    actionDate: string;
    remark: string;
  }>(),
  batchDate: varchar('batch_date', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').defaultNow(),
  updatedBy: uuid('updated_by'),
});

// 汇丰风险评定表
export const hsbcRiskAssessments = pgTable('hsbc_risk_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: varchar('merchant_id', { length: 50 }),
  storeCount: integer('store_count').default(0),
  riskLabel: varchar('risk_label', { length: 50 }),
  totalOverdueAmount: decimal('total_overdue_amount', { precision: 15, scale: 2 }),
  loanCount: integer('loan_count').default(0),
  batchDate: varchar('batch_date', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').defaultNow(),
  updatedBy: uuid('updated_by'),
});

// 展期商户表
export const hsbcExtensionMerchants = pgTable('hsbc_extension_merchants', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: varchar('merchant_id', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').defaultNow(),
  updatedBy: uuid('updated_by'),
});

// MCP 服务配置表
export const mcpServices = pgTable('mcp_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  type: serviceTypeEnum('type').default('postgresql'),
  status: serviceStatusEnum('status').default('inactive'),
  endpoint: varchar('endpoint', { length: 500 }),
  config: jsonb('config').$type<{
    host?: string;
    port?: number;
    database?: string;
    ssl?: boolean;
  }>(),
  apiKey: varchar('api_key', { length: 255 }),
  lastSyncTime: timestamp('last_sync_time'),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at').defaultNow(),
  updatedBy: uuid('updated_by'),
});

// 关系定义
export const systemUsersRelations = relations(systemUsers, ({ many }) => ({
  assignedCases: many(visitCases),
  roles: many(systemRoles),
}));

export const systemRolesRelations = relations(systemRoles, ({ many }) => ({
  users: many(systemUsers),
}));

export const visitCasesRelations = relations(visitCases, ({ one, many }) => ({
  assignee: one(systemUsers, {
    fields: [visitCases.assignedUser],
    references: [systemUsers.id],
  }),
  followups: many(followups),
  closures: many(caseClosures),
  riskAssessments: many(riskAssessments),
  repaymentRecords: many(repaymentRecords),
  files: many(fileRecords),
}));

export const followupsRelations = relations(followups, ({ one }) => ({
  case: one(visitCases, {
    fields: [followups.caseId],
    references: [visitCases.id],
  }),
  visitor: one(systemUsers, {
    fields: [followups.visitUser],
    references: [systemUsers.id],
  }),
}));

export const caseClosuresRelations = relations(caseClosures, ({ one }) => ({
  case: one(visitCases, {
    fields: [caseClosures.caseId],
    references: [visitCases.id],
  }),
  closer: one(systemUsers, {
    fields: [caseClosures.closedBy],
    references: [systemUsers.id],
  }),
}));

export const riskAssessmentsRelations = relations(riskAssessments, ({ one }) => ({
  case: one(visitCases, {
    fields: [riskAssessments.caseId],
    references: [visitCases.id],
  }),
}));

export const repaymentRecordsRelations = relations(repaymentRecords, ({ one }) => ({
  case: one(visitCases, {
    fields: [repaymentRecords.caseId],
    references: [visitCases.id],
  }),
}));

export const fileRecordsRelations = relations(fileRecords, ({ one }) => ({
  case: one(visitCases, {
    fields: [fileRecords.caseId],
    references: [visitCases.id],
  }),
}));

// 类型导出
export type SystemUser = typeof systemUsers.$inferSelect;
export type NewSystemUser = typeof systemUsers.$inferInsert;
export type SystemRole = typeof systemRoles.$inferSelect;
export type NewSystemRole = typeof systemRoles.$inferInsert;
export type VisitCase = typeof visitCases.$inferSelect;
export type NewVisitCase = typeof visitCases.$inferInsert;
export type Followup = typeof followups.$inferSelect;
export type NewFollowup = typeof followups.$inferInsert;
export type CaseClosure = typeof caseClosures.$inferSelect;
export type NewCaseClosure = typeof caseClosures.$inferInsert;
export type RiskAssessment = typeof riskAssessments.$inferSelect;
export type NewRiskAssessment = typeof riskAssessments.$inferInsert;
export type RepaymentRecord = typeof repaymentRecords.$inferSelect;
export type NewRepaymentRecord = typeof repaymentRecords.$inferInsert;
export type HsbcLoan = typeof hsbcLoans.$inferSelect;
export type NewHsbcLoan = typeof hsbcLoans.$inferInsert;
export type HsbcRiskAssessment = typeof hsbcRiskAssessments.$inferSelect;
export type NewHsbcRiskAssessment = typeof hsbcRiskAssessments.$inferInsert;
export type HsbcExtensionMerchant = typeof hsbcExtensionMerchants.$inferSelect;
export type NewHsbcExtensionMerchant = typeof hsbcExtensionMerchants.$inferInsert;
export type McpService = typeof mcpServices.$inferSelect;
export type NewMcpService = typeof mcpServices.$inferInsert;
