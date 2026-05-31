-- 案件管理表
CREATE TABLE IF NOT EXISTS cases (
    id SERIAL PRIMARY KEY,
    case_number VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    id_card VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'pending_assign',
    case_type VARCHAR(100),
    overdue_amount NUMERIC(15,2) DEFAULT 0,
    overdue_days INTEGER DEFAULT 0,
    address TEXT,
    assigned_to VARCHAR(255),
    assigned_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    risk_level VARCHAR(50),
    priority VARCHAR(50),
    description TEXT,
    tags TEXT[],
    custom_fields JSONB,
    closed_at TIMESTAMP,
    closed_by VARCHAR(255),
    close_reason TEXT
);

-- 跟进记录表
CREATE TABLE IF NOT EXISTS followups (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    followup_type VARCHAR(50) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    next_followup_at TIMESTAMP,
    followup_result VARCHAR(100),
    location TEXT,
    latitude NUMERIC(10,6),
    longitude NUMERIC(10,6),
    attachments JSONB,
    custom_fields JSONB
);

-- 案件文件表
CREATE TABLE IF NOT EXISTS case_files (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    followup_id INTEGER REFERENCES followups(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT,
    file_url TEXT,
    file_path TEXT,
    uploaded_by VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    custom_fields JSONB
);

-- 案件历史记录表
CREATE TABLE IF NOT EXISTS case_history (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    action_details TEXT,
    performed_by VARCHAR(255) NOT NULL,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    old_values JSONB,
    new_values JSONB
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_to ON cases(assigned_to);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at);
CREATE INDEX IF NOT EXISTS idx_followups_case_id ON followups(case_id);
CREATE INDEX IF NOT EXISTS idx_followups_created_at ON followups(created_at);
CREATE INDEX IF NOT EXISTS idx_case_files_case_id ON case_files(case_id);
CREATE INDEX IF NOT EXISTS idx_case_history_case_id ON case_history(case_id);
