import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || '101.96.214.104',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'coze',
  password: process.env.DB_PASSWORD || 'GWRXnGAWfTt75CY',
  database: process.env.DB_NAME || 'coze',
  ssl: { rejectUnauthorized: false }
});

async function createTables() {
  console.log('📊 开始创建表...');
  
  const client = await pool.connect();
  
  try {
    // 创建cases表
    console.log('📝 创建 cases 表...');
    await client.query(`
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
      )
    `);
    console.log('✅ cases 表创建成功');
    
    // 创建followups表
    console.log('📝 创建 followups 表...');
    await client.query(`
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
      )
    `);
    console.log('✅ followups 表创建成功');
    
    // 创建case_files表
    console.log('📝 创建 case_files 表...');
    await client.query(`
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
      )
    `);
    console.log('✅ case_files 表创建成功');
    
    // 创建case_history表
    console.log('📝 创建 case_history 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS case_history (
        id SERIAL PRIMARY KEY,
        case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        action_type VARCHAR(100) NOT NULL,
        action_details TEXT,
        performed_by VARCHAR(255) NOT NULL,
        performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        old_values JSONB,
        new_values JSONB
      )
    `);
    console.log('✅ case_history 表创建成功');
    
    // 创建索引
    console.log('📝 创建索引...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cases_assigned_to ON cases(assigned_to)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_followups_case_id ON followups(case_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_followups_created_at ON followups(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_case_files_case_id ON case_files(case_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_case_history_case_id ON case_history(case_id)');
    console.log('✅ 索引创建成功');
    
    // 验证表是否创建成功
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 数据库中的表:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    console.log('\n🎉 所有表创建完成！');
    
  } catch (err) {
    console.error('❌ 创建表失败:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

createTables().catch(console.error);
