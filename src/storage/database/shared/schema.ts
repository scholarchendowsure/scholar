import { pgTable, serial, timestamp, varchar, numeric, jsonb, index } from "drizzle-orm/pg-core";
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
