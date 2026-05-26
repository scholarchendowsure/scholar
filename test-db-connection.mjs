import pg from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env.local') });

const { Pool } = pg;

async function testDbConnection() {
  console.log('🔍 开始测试数据库连接...');
  
  console.log('📋 数据库配置:');
  console.log('   - DB_HOST:', process.env.DB_HOST);
  console.log('   - DB_PORT:', process.env.DB_PORT);
  console.log('   - DB_USER:', process.env.DB_USER);
  console.log('   - DB_NAME:', process.env.DB_NAME);
  console.log('');
  
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  const client = await pool.connect();
  
  try {
    // 查看当前连接的数据库名
    const dbNameResult = await client.query('SELECT current_database();');
    console.log(`✅ 当前连接的数据库名: ${dbNameResult.rows[0].current_database}`);
    
    // 查看当前连接的用户
    const userResult = await client.query('SELECT current_user;');
    console.log(`✅ 当前连接的用户: ${userResult.rows[0].current_user}`);
    
    // 查看服务器版本
    const versionResult = await client.query('SELECT version();');
    console.log(`✅ PostgreSQL版本: ${versionResult.rows[0].version}`);
    
    // 查看数据库中的表
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`✅ 数据库中的表 (${tablesResult.rows.length}个):`);
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    console.log('');
    console.log('🎉 数据库连接测试成功！');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

testDbConnection().catch(console.error);
