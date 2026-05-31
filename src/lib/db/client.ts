import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
const envPath = process.env.NODE_ENV === 'production' 
  ? join(__dirname, '../../../.env.production')
  : join(__dirname, '../../../.env.local');

config({ path: envPath });

// 创建数据库连接池
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// 创建Drizzle客户端
export const db = drizzle(pool);

// 测试数据库连接
export async function testDbConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ 数据库连接成功');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    return false;
  }
}
