import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  host: process.env.DB_HOST || '101.96.214.104',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'coze',
  password: process.env.DB_PASSWORD || 'GWRXnGAWfTt75CY',
  database: process.env.DB_NAME || 'coze',
  ssl: { rejectUnauthorized: false }
});

async function executeSQL() {
  console.log('📊 开始执行SQL...');
  
  const client = await pool.connect();
  
  try {
    // 读取SQL文件
    const sqlPath = path.join(__dirname, 'create-cases-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // 分割SQL语句（按分号分割，但要注意字符串内的分号）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 发现 ${statements.length} 条SQL语句`);
    
    // 逐条执行
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await client.query(statement);
        console.log(`✅ 执行成功 (${i + 1}/${statements.length})`);
      } catch (err) {
        console.log(`⚠️  执行跳过 (${i + 1}/${statements.length}): ${err.message}`);
      }
    }
    
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
    
    console.log('\n🎉 SQL执行完成！');
    
  } catch (err) {
    console.error('❌ SQL执行失败:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

executeSQL().catch(console.error);
