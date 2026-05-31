import { pgTable, serial, timestamp, varchar, numeric, jsonb, index, text, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 汇丰贷款批次表 - 按批次日期分组
export const hsbcLoanBatches = pgTable(
  "hsbc_loan_batches",
  {
    id: serial("id").primaryKey(),
    batch_date: varchar("batch_date", { length: 20 }).notNull().unique(), // 批次日期 YYYY-MM-DD
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("hsbc_loan_batches_batch_date_idx").on(table.batch_date),
  ]
);

// 汇丰贷款主表
export const hsbcLoans = pgTable(
  "hsbc_loans",
  {
    id: serial("id").primaryKey(),
    batch_id: serial("batch_id").notNull().references(() => hsbcLoanBatches.id, { onDelete: "cascade" }),
    loan_reference: varchar("loan_reference", { length: 50 }).notNull(), // 贷款编号
    merchant_id: varchar("merchant_id", { length: 50 }), // 商户ID
    merchant_name: varchar("merchant_name", { length: 255 }), // 商户名称
    borrower_name: varchar("borrower_name", { length: 255 }), // 借款人名称
    currency: varchar("currency", { length: 10 }).notNull().default("CNY"), // 币种
    loan_date: varchar("loan_date", { length: 20 }), // 贷款日期
    maturity_date: varchar("maturity_date", { length: 20 }), // 到期日
    loan_amount: numeric("loan_amount", { precision: 20, scale: 2 }).notNull().default("0"), // 贷款金额
    balance: numeric("balance", { precision: 20, scale: 2 }).notNull().default("0"), // 余额
    pastdue_amount: numeric("pastdue_amount", { precision: 20, scale: 2 }).notNull().default("0"), // 逾期金额
    overdue_days: numeric("overdue_days", { precision: 10, scale: 2 }).notNull().default("0"), // 逾期天数
    status: varchar("status", { length: 20 }).notNull().default("normal"), // 状态
    repayment_schedule: jsonb("repayment_schedule"), // 还款计划 JSON
    remarks: text("remarks"), // 备注
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("hsbc_loans_batch_id_idx").on(table.batch_id),
    index("hsbc_loans_loan_reference_idx").on(table.loan_reference),
    index("hsbc_loans_merchant_id_idx").on(table.merchant_id),
    index("hsbc_loans_currency_idx").on(table.currency),
    index("hsbc_loans_status_idx").on(table.status),
  ]
);

// 商户-销售人员映射关系表
export const merchantSalesMappings = pgTable(
  "merchant_sales_mappings",
  {
    id: serial("id").primaryKey(),
    merchant_id: varchar("merchant_id", { length: 50 }).notNull(), // 商户ID
    sales_feishu_name: varchar("sales_feishu_name", { length: 255 }).notNull(), // 销售飞书名称
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("merchant_sales_mappings_merchant_id_idx").on(table.merchant_id),
    index("merchant_sales_mappings_sales_feishu_name_idx").on(table.sales_feishu_name),
  ]
);

// ============ 案件管理表 ============

// 案件主表
export const cases = pgTable(
  "cases",
  {
    id: varchar("id", { length: 36 }).primaryKey(), // UUID
    
    // 案件基础标识
    batch_no: varchar("batch_no", { length: 100 }).notNull(), // 批次号
    loan_no: varchar("loan_no", { length: 100 }).notNull(), // 贷款单号
    user_id: varchar("user_id", { length: 100 }).notNull(), // 用户ID
    borrower_name: varchar("borrower_name", { length: 255 }).notNull(), // 借款人姓名
    product_name: varchar("product_name", { length: 255 }), // 产品名称
    platform: varchar("platform", { length: 100 }), // 平台
    payment_company: varchar("payment_company", { length: 255 }), // 支付公司
    funder: varchar("funder", { length: 255 }), // 资金方
    fund_category: varchar("fund_category", { length: 100 }), // 资金分类
    category: varchar("category", { length: 100 }), // 分类
    overdue_stage: varchar("overdue_stage", { length: 100 }), // 逾期阶段
    
    // 案件核心状态
    status: varchar("status", { length: 50 }).notNull(), // 状态
    loan_status: varchar("loan_status", { length: 50 }), // 贷款状态
    is_locked: boolean("is_locked").default(false), // 锁定情况
    five_level_classification: varchar("five_level_classification", { length: 50 }), // 五级分类
    risk_level: varchar("risk_level", { length: 50 }), // 风险等级
    is_extended: boolean("is_extended").default(false), // 是否展期
    
    // 贷款核心金额
    currency: varchar("currency", { length: 10 }).default("CNY"), // 币种
    loan_amount: numeric("loan_amount", { precision: 20, scale: 2 }), // 贷款金额
    total_loan_amount: numeric("total_loan_amount", { precision: 20, scale: 2 }), // 总贷款金额
    total_outstanding_balance: numeric("total_outstanding_balance", { precision: 20, scale: 2 }).notNull().default("0"), // 总在贷余额
    total_repaid_amount: numeric("total_repaid_amount", { precision: 20, scale: 2 }), // 已还款总额
    outstanding_balance: numeric("outstanding_balance", { precision: 20, scale: 2 }), // 在贷余额
    overdue_amount: numeric("overdue_amount", { precision: 20, scale: 2 }).notNull().default("0"), // 逾期金额
    overdue_principal: numeric("overdue_principal", { precision: 20, scale: 2 }), // 逾期本金
    overdue_interest: numeric("overdue_interest", { precision: 20, scale: 2 }), // 逾期利息
    repaid_amount: numeric("repaid_amount", { precision: 20, scale: 2 }), // 已还金额
    repaid_principal: numeric("repaid_principal", { precision: 20, scale: 2 }), // 已还本金
    repaid_interest: numeric("repaid_interest", { precision: 20, scale: 2 }), // 已还利息
    compensation_amount: numeric("compensation_amount", { precision: 20, scale: 2 }), // 代偿总额
    
    // 贷款期限时间
    loan_term: numeric("loan_term", { precision: 10, scale: 0 }), // 贷款期限
    loan_term_unit: varchar("loan_term_unit", { length: 20 }), // 贷款期限单位
    loan_date: varchar("loan_date", { length: 20 }), // 贷款日期
    due_date: varchar("due_date", { length: 20 }), // 到期日
    overdue_days: numeric("overdue_days", { precision: 10, scale: 0 }).notNull().default("0"), // 逾期天数
    overdue_start_time: varchar("overdue_start_time", { length: 50 }), // 逾期开始时间
    first_overdue_time: varchar("first_overdue_time", { length: 50 }), // 首次逾期时间
    compensation_date: varchar("compensation_date", { length: 20 }), // 代偿日期
    
    // 借款人主体信息
    company_name: varchar("company_name", { length: 255 }), // 公司名称
    company_address: text("company_address"), // 公司地址
    home_address: text("home_address"), // 家庭地址
    household_address: text("household_address"), // 户籍地址
    borrower_phone: varchar("borrower_phone", { length: 50 }), // 借款人手机号
    registered_phone: varchar("registered_phone", { length: 50 }), // 注册手机号
    contact_info: text("contact_info"), // 联系方式
    
    // 案件责任归属
    assigned_sales: varchar("assigned_sales", { length: 255 }), // 所属销售
    assigned_risk_control: varchar("assigned_risk_control", { length: 255 }), // 所属风控
    assigned_post_loan: varchar("assigned_post_loan", { length: 255 }), // 所属贷后
    
    // 系统元数据
    assignee_name: varchar("assignee_name", { length: 255 }), // 当前跟进人
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), // 创建时间
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(), // 更新时间
  },
  (table) => [
    index("cases_batch_no_idx").on(table.batch_no),
    index("cases_loan_no_idx").on(table.loan_no),
    index("cases_user_id_idx").on(table.user_id),
    index("cases_status_idx").on(table.status),
    index("cases_borrower_name_idx").on(table.borrower_name),
  ]
);

// 跟进记录表
export const followups = pgTable(
  "followups",
  {
    id: varchar("id", { length: 36 }).primaryKey(), // UUID
    case_id: varchar("case_id", { length: 36 }).notNull().references(() => cases.id, { onDelete: "cascade" }), // 案件ID
    
    // 基础信息
    follower: varchar("follower", { length: 255 }).notNull(), // 跟进人
    follow_time: varchar("follow_time", { length: 50 }).notNull(), // 跟进时间
    follow_type: varchar("follow_type", { length: 20 }).notNull(), // 跟进类型：online/offline
    contact: varchar("contact", { length: 50 }).notNull(), // 联系人：legal_representative/actual_controller
    follow_result: varchar("follow_result", { length: 50 }).notNull(), // 跟进结果
    follow_record: text("follow_record").notNull(), // 跟进记录内容
    file_info: jsonb("file_info"), // 文件信息 JSON
    
    // 系统元数据
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), // 创建时间
    created_by: varchar("created_by", { length: 255 }).notNull(), // 创建人
  },
  (table) => [
    index("followups_case_id_idx").on(table.case_id),
    index("followups_follower_idx").on(table.follower),
    index("followups_follow_time_idx").on(table.follow_time),
  ]
);

// 案件文件表
export const caseFiles = pgTable(
  "case_files",
  {
    id: varchar("id", { length: 36 }).primaryKey(), // UUID
    case_id: varchar("case_id", { length: 36 }).notNull().references(() => cases.id, { onDelete: "cascade" }), // 案件ID
    
    name: varchar("name", { length: 255 }).notNull(), // 文件名
    type: varchar("type", { length: 20 }).notNull(), // 文件类型：image/document/other
    url: text("url"), // 文件URL
    data: text("data"), // base64数据（可选）
    upload_time: varchar("upload_time", { length: 50 }).notNull(), // 上传时间
    upload_by: varchar("upload_by", { length: 255 }).notNull(), // 上传人
    
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("case_files_case_id_idx").on(table.case_id),
    index("case_files_type_idx").on(table.type),
  ]
);

// 案件历史记录表
export const caseHistory = pgTable(
  "case_history",
  {
    id: varchar("id", { length: 36 }).primaryKey(), // UUID
    case_id: varchar("case_id", { length: 36 }).notNull().references(() => cases.id, { onDelete: "cascade" }), // 案件ID
    user_id: varchar("user_id", { length: 100 }), // 修改人用户ID
    user_name: varchar("user_name", { length: 255 }).notNull(), // 修改人姓名
    modified_at: varchar("modified_at", { length: 50 }).notNull(), // 修改时间
    field_name: varchar("field_name", { length: 100 }).notNull(), // 修改的字段名
    field_label: varchar("field_label", { length: 255 }), // 字段显示名称
    old_value: jsonb("old_value"), // 原值
    new_value: jsonb("new_value"), // 新值
    
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("case_history_case_id_idx").on(table.case_id),
    index("case_history_user_id_idx").on(table.user_id),
    index("case_history_modified_at_idx").on(table.modified_at),
  ]
);
