import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const db = drizzle(pool);

async function cleanupDatabase() {
  console.log('🧹 开始清理数据库...');

  try {
    // 删除表（按依赖关系顺序）
    await pool.query('DROP TABLE IF EXISTS case_files CASCADE');
    console.log('✅ 已删除 case_files 表');

    await pool.query('DROP TABLE IF EXISTS case_history CASCADE');
    console.log('✅ 已删除 case_history 表');

    await pool.query('DROP TABLE IF EXISTS followups CASCADE');
    console.log('✅ 已删除 followups 表');

    await pool.query('DROP TABLE IF EXISTS cases CASCADE');
    console.log('✅ 已删除 cases 表');

    console.log('🎉 数据库清理完成！');
  } catch (error) {
    console.error('❌ 数据库清理失败:', error);
  } finally {
    await pool.end();
  }
}

cleanupDatabase();