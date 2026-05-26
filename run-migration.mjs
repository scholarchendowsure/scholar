import pg from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env.local') });

const { Pool } = pg;

async function runMigration() {
  console.log('🚀 开始执行数据库迁移...');
  
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
    // 读取迁移文件
    const migrationFile = join(__dirname, 'migrations', '0000_happy_boomerang.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    console.log('📄 读取迁移文件成功');
    
    // 分割SQL语句
    const statements = sql.split('--> statement-breakpoint').filter(s => s.trim());
    
    console.log(`📝 执行 ${statements.length} 个SQL语句...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;
      
      console.log(`执行语句 ${i + 1}/${statements.length}...`);
      await client.query(statement);
      console.log(`✅ 语句 ${i + 1} 执行成功`);
    }
    
    console.log('🎉 数据库迁移执行成功！');
    
    // 验证表是否创建成功
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n📊 数据库中的表:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
