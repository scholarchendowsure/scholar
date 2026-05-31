-- 创建案件管理表
-- 手动创建表，匹配types/case.ts

CREATE TABLE IF NOT EXISTS cases (
  id VARCHAR(50) PRIMARY KEY,
  batch_no VARCHAR(100),
  loan_no VARCHAR(100),
  user_id VARCHAR(100),
  borrower_name VARCHAR(200),
  status VARCHAR(50) DEFAULT 'pending_assign',
  total_outstanding_balance NUMERIC(15,2) DEFAULT 0,
  overdue_amount NUMERIC(15,2) DEFAULT 0,
  overdue_days INTEGER DEFAULT 0,
  product_name VARCHAR(200),
  funder VARCHAR(200),
  fund_category VARCHAR(200),
  is_extended BOOLEAN DEFAULT false,
  currency VARCHAR(10) DEFAULT 'CNY',
  loan_amount NUMERIC(15,2) DEFAULT 0,
  outstanding_balance NUMERIC(15,2) DEFAULT 0,
  loan_term INTEGER,
  loan_term_unit VARCHAR(20),
  loan_date DATE,
  due_date DATE,
  company_name VARCHAR(200),
  borrower_phone VARCHAR(50),
  assigned_sales VARCHAR(200),
  assigned_post_loan VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS followups (
  id VARCHAR(50) PRIMARY KEY,
  case_id VARCHAR(50) REFERENCES cases(id) ON DELETE CASCADE,
  content TEXT,
  followup_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  followuper_id VARCHAR(100),
  followuper_name VARCHAR(200),
  followuper_avatar VARCHAR(500),
  file_info JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS case_files (
  id VARCHAR(50) PRIMARY KEY,
  case_id VARCHAR(50) REFERENCES cases(id) ON DELETE CASCADE,
  file_name VARCHAR(500),
  file_type VARCHAR(100),
  file_size BIGINT,
  file_url VARCHAR(1000),
  file_data TEXT,
  uploaded_by VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS case_history (
  id VARCHAR(50) PRIMARY KEY,
  case_id VARCHAR(50) REFERENCES cases(id) ON DELETE CASCADE,
  action VARCHAR(100),
  old_value JSONB,
  new_value JSONB,
  operator_id VARCHAR(100),
  operator_name VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 注释
COMMENT ON TABLE cases IS '案件主表';
COMMENT ON TABLE followups IS '跟进记录表';
COMMENT ON TABLE case_files IS '案件文件表';
COMMENT ON TABLE case_history IS '案件历史表';

SELECT 'Tables created successfully!' AS message;
