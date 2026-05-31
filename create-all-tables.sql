-- 贷后案件管理系统 - 数据库表创建脚本（完全匹配 schema.ts）

-- 删除旧表（级联删除依赖）
DROP TABLE IF EXISTS case_history CASCADE;
DROP TABLE IF EXISTS case_files CASCADE;
DROP TABLE IF EXISTS followups CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS merchant_sales_mappings CASCADE;
DROP TABLE IF EXISTS hsbc_loans CASCADE;
DROP TABLE IF EXISTS hsbc_loan_batches CASCADE;
DROP TABLE IF EXISTS health_check CASCADE;
DROP TABLE IF EXISTS shop_data CASCADE;

-- 1. 健康检查表
CREATE TABLE IF NOT EXISTS health_check (
    id SERIAL PRIMARY KEY,
    check_time TIMESTAMP DEFAULT NOW() NOT NULL,
    status VARCHAR(50) NOT NULL,
    details JSONB
);

-- 2. 汇丰贷款批次表（完全匹配 schema.ts）
CREATE TABLE IF NOT EXISTS hsbc_loan_batches (
    id SERIAL PRIMARY KEY,
    batch_date DATE NOT NULL,
    import_date TIMESTAMP DEFAULT NOW() NOT NULL,
    record_count INTEGER NOT NULL,
    total_amount NUMERIC
);

CREATE INDEX IF NOT EXISTS hsbc_loan_batches_batch_date_idx ON hsbc_loan_batches(batch_date);

-- 3. 汇丰贷款表（完全匹配 schema.ts）
CREATE TABLE IF NOT EXISTS hsbc_loans (
    id TEXT PRIMARY KEY,
    loan_reference TEXT NOT NULL,
    merchant_id TEXT NOT NULL,
    merchant_name TEXT,
    borrower_name TEXT NOT NULL,
    loan_start_date TEXT,
    loan_date TEXT,
    loan_currency TEXT,
    loan_amount NUMERIC,
    loan_interest TEXT,
    total_interest_rate REAL,
    loan_tenor TEXT,
    maturity_date TEXT,
    repayment_schedule JSONB,
    balance NUMERIC,
    pastdue_amount NUMERIC,
    total_repaid NUMERIC,
    freeze_account_requested TEXT,
    force_debit_requested TEXT,
    approval_from_rm TEXT,
    confirmation_freeze_account TEXT,
    confirmation_force_debit TEXT,
    remarks TEXT,
    batch_date TEXT,
    status TEXT,
    overdue_days INTEGER,
    assigned_to TEXT,
    follow_up_count INTEGER,
    last_follow_up_date TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS hsbc_loans_batch_date_idx ON hsbc_loans(batch_date);
CREATE INDEX IF NOT EXISTS hsbc_loans_loan_reference_idx ON hsbc_loans(loan_reference);
CREATE INDEX IF NOT EXISTS hsbc_loans_status_idx ON hsbc_loans(status);

-- 4. 商户销售映射表（完全匹配 schema.ts）
CREATE TABLE IF NOT EXISTS merchant_sales_mappings (
    id SERIAL PRIMARY KEY,
    merchant_name VARCHAR(200) NOT NULL,
    sales_name VARCHAR(100) NOT NULL
);

CREATE INDEX IF NOT EXISTS merchant_sales_mappings_merchant_name_idx ON merchant_sales_mappings(merchant_name);

-- 5. 案件表（完全匹配 schema.ts）
CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    batch_no TEXT NOT NULL,
    loan_no TEXT NOT NULL,
    user_id TEXT NOT NULL,
    borrower_name TEXT NOT NULL,
    product_name TEXT,
    platform TEXT,
    payment_company TEXT,
    funder TEXT,
    fund_category TEXT,
    category TEXT,
    overdue_stage TEXT,
    status TEXT NOT NULL,
    loan_status TEXT,
    is_locked BOOLEAN,
    five_level_classification TEXT,
    risk_level TEXT,
    is_extended BOOLEAN,
    currency TEXT,
    loan_amount NUMERIC,
    total_loan_amount NUMERIC,
    total_outstanding_balance NUMERIC NOT NULL,
    total_repaid_amount NUMERIC,
    outstanding_balance NUMERIC,
    overdue_amount NUMERIC NOT NULL,
    overdue_principal NUMERIC,
    overdue_interest NUMERIC,
    repaid_amount NUMERIC,
    repaid_principal NUMERIC,
    repaid_interest NUMERIC,
    compensation_amount NUMERIC,
    loan_term INTEGER,
    loan_term_unit TEXT,
    loan_date TEXT,
    due_date TEXT,
    overdue_days INTEGER NOT NULL,
    overdue_start_time TEXT,
    first_overdue_time TEXT,
    compensation_date TEXT,
    company_name TEXT,
    company_address TEXT,
    home_address TEXT,
    household_address TEXT,
    borrower_phone TEXT,
    registered_phone TEXT,
    contact_info TEXT,
    assigned_sales TEXT,
    assigned_risk_control TEXT,
    assigned_post_loan TEXT,
    assignee_name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    deleted_by TEXT
);

CREATE INDEX IF NOT EXISTS cases_batch_no_idx ON cases(batch_no);
CREATE INDEX IF NOT EXISTS cases_loan_no_idx ON cases(loan_no);
CREATE INDEX IF NOT EXISTS cases_user_id_idx ON cases(user_id);
CREATE INDEX IF NOT EXISTS cases_status_idx ON cases(status);
CREATE INDEX IF NOT EXISTS cases_deleted_at_idx ON cases(deleted_at);

-- 6. 跟进记录表（完全匹配 schema.ts）
CREATE TABLE IF NOT EXISTS followups (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    follower TEXT NOT NULL,
    follow_time TEXT NOT NULL,
    follow_type TEXT NOT NULL,
    contact TEXT NOT NULL,
    follow_result TEXT NOT NULL,
    follow_record TEXT NOT NULL,
    file_info JSONB,
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS followups_case_id_idx ON followups(case_id);
CREATE INDEX IF NOT EXISTS followups_follow_time_idx ON followups(follow_time);

-- 7. 案件文件表（完全匹配 schema.ts）
CREATE TABLE IF NOT EXISTS case_files (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    follow_up_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT,
    data TEXT,
    upload_time TEXT NOT NULL,
    upload_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS case_files_case_id_idx ON case_files(case_id);
CREATE INDEX IF NOT EXISTS case_files_follow_up_id_idx ON case_files(follow_up_id);

-- 8. 案件历史记录表（完全匹配 schema.ts）
CREATE TABLE IF NOT EXISTS case_history (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id TEXT,
    user_name TEXT NOT NULL,
    modified_at TEXT NOT NULL,
    field_name TEXT NOT NULL,
    field_label TEXT,
    old_value JSONB,
    new_value JSONB
);

CREATE INDEX IF NOT EXISTS case_history_case_id_idx ON case_history(case_id);
CREATE INDEX IF NOT EXISTS case_history_modified_at_idx ON case_history(modified_at);

-- 9. 店铺数据表（完全匹配 schema.ts）
CREATE TABLE IF NOT EXISTS shop_data (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    update_time TEXT NOT NULL,
    latest_dataset TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS shop_data_user_id_idx ON shop_data(user_id);

-- 插入健康检查记录
INSERT INTO health_check (status, details) 
VALUES ('success', '{"message": "数据库表创建成功"}')
ON CONFLICT DO NOTHING;

SELECT '✅ 数据库表创建完成' AS message;
