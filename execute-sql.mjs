import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
config({ path: path.join(__dirname, '.env.local') });

// 创建数据库连接池
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function executeSQLFile(filePath) {
  try {
    console.log(`📖 读取 SQL 文件: ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    console.log('🚀 连接数据库...');
    const client = await pool.connect();
    
    try {
      console.log('📝 执行 SQL...');
      const result = await client.query(sql);
      console.log('✅ SQL 执行成功');
      return result;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ SQL 执行失败:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 开始创建数据库表...');
    
    // 执行 SQL 文件
    await executeSQLFile(path.join(__dirname, 'create-all-tables.sql'));
    
    console.log('✅ 数据库表创建完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 创建数据库表失败:', error);
    process.exit(1);
  }
}

main();
