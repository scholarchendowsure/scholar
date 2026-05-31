import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
const envPath = join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

// 创建数据库连接池
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'coze',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: {
    rejectUnauthorized: false
  }
});

async function executeSQLFile() {
  const client = await pool.connect();
  try {
    console.log('🚀 开始创建案件管理表...');
    
    const sqlPath = join(__dirname, 'create-cases-tables-v2.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // 分割SQL语句并执行
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await client.query(statement);
      }
    }
    
    console.log('✅ 案件管理表创建成功！');
    
    // 验证表是否创建成功
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('cases', 'followups', 'case_files', 'case_history')
      ORDER BY table_name
    `);
    
    console.log('📋 已创建的表：');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    console.log('🎉 案件管理表创建完成！');
    
  } catch (error) {
    console.error('❌ 创建表失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

executeSQLFile().catch(console.error);