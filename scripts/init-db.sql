-- ============================================
-- 贷后案件管理系统 - 数据库初始化脚本
-- ============================================

-- 创建数据库（如果不存在）
-- CREATE DATABASE loandb;

-- 连接到数据库后运行以下脚本

-- ============================================
-- 1. 用户表
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'agent',
    phone VARCHAR(20),
    email VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. 案件表
-- ============================================
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(100) UNIQUE NOT NULL,
    user_id VARCHAR(50),
    customer_name VARCHAR(200) NOT NULL,
    id_number VARCHAR(50),
    phone VARCHAR(20),
    address TEXT,
    loan_code VARCHAR(100),
    loan_amount DECIMAL(15, 2),
    overdue_days INTEGER DEFAULT 0,
    overdue_amount DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending_assign',
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMP,
    followup_count INTEGER DEFAULT 0,
    closure_type VARCHAR(50),
    closure_remark TEXT,
    closed_at TIMESTAMP,
    closed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. 跟进记录表
-- ============================================
CREATE TABLE IF NOT EXISTS followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    status VARCHAR(50),
    next_followup_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. 还款记录表
-- ============================================
CREATE TABLE IF NOT EXISTS repayment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    repayment_date DATE NOT NULL,
    repayment_method VARCHAR(50),
    remark TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. 风险评估表
-- ============================================
CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    risk_level VARCHAR(20) NOT NULL,
    risk_score INTEGER,
    assessment_content TEXT,
    recommendations TEXT,
    assessed_by UUID REFERENCES users(id),
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. 文件表
-- ============================================
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_type VARCHAR(50),
    file_size BIGINT,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. 飞书配置表
-- ============================================
CREATE TABLE IF NOT EXISTS feishu_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. 汇丰贷款表
-- ============================================
CREATE TABLE IF NOT EXISTS hsbc_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_code VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(200),
    id_number VARCHAR(50),
    phone VARCHAR(20),
    loan_amount DECIMAL(15, 2),
    outstanding_amount DECIMAL(15, 2),
    due_date DATE,
    batch_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 9. 法律诉讼表
-- ============================================
CREATE TABLE IF NOT EXISTS legal_litigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    litigation_type VARCHAR(50),
    case_name VARCHAR(500),
    case_number VARCHAR(100),
    case_role VARCHAR(50),
    case_amount DECIMAL(15, 2),
    court_name VARCHAR(200),
    latest_process VARCHAR(500),
    filing_date DATE,
    end_date DATE,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 插入默认管理员账户
-- ============================================
INSERT INTO users (username, password, name, role)
VALUES ('admin', '$2a$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', '系统管理员', 'admin')
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- 创建索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_to ON cases(assigned_to);
CREATE INDEX IF NOT EXISTS idx_followups_case_id ON followups(case_id);
CREATE INDEX IF NOT EXISTS idx_files_case_id ON files(case_id);
CREATE INDEX IF NOT EXISTS idx_legal_litigations_case_id ON legal_litigations(case_id);

-- ============================================
-- 完成
-- ============================================
SELECT '数据库初始化完成!' AS status;
