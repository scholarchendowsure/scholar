#!/bin/bash

# 数据库一键部署脚本
# 用于部署贷后系统到新数据库

set -e

echo "🚀 开始部署贷后系统数据库..."

# 检查环境变量是否存在
if [ -z "$DATABASE_URL" ]; then
    echo "❌ 错误: DATABASE_URL 环境变量未设置"
    exit 1
fi

echo "📋 数据库配置:"
echo "   DATABASE_URL: $DATABASE_URL"

# 步骤1: 生成数据库迁移
echo ""
echo "📦 步骤1: 生成数据库迁移..."
pnpm exec drizzle-kit generate

# 步骤2: 执行数据库迁移
echo ""
echo "🔧 步骤2: 执行数据库迁移..."
pnpm exec drizzle-kit migrate

# 步骤3: 验证数据库迁移
echo ""
echo "✅ 步骤3: 验证数据库迁移..."

# 创建临时验证脚本
cat > /tmp/verify-deployment.mjs << 'EOF'
import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

const { Pool } = pg;

async function verifyDeployment() {
  console.log('🔍 开始验证数据库部署...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();
  
  try {
    // 查看当前连接的数据库名
    const dbNameResult = await client.query('SELECT current_database();');
    console.log(`✅ 当前连接的数据库名: ${dbNameResult.rows[0].current_database}`);
    
    // 查看当前连接的用户
    const userResult = await client.query('SELECT current_user;');
    console.log(`✅ 当前连接的用户: ${userResult.rows[0].current_user}`);
    
    // 查看数据库中的表
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`✅ 数据库中的表 (${tablesResult.rows.length}个):`);
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    console.log('');
    console.log('🎉 数据库部署验证成功！');
    
  } catch (error) {
    console.error('❌ 数据库部署验证失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

verifyDeployment().catch(console.error);
EOF

# 执行验证脚本
node /tmp/verify-deployment.mjs

# 清理临时文件
rm -f /tmp/verify-deployment.mjs

echo ""
echo "============================================"
echo "🎉 数据库部署完成！"
echo "============================================"
echo ""
echo "现在你可以使用以下命令管理数据库："
echo ""
echo "  pnpm db:generate  - 生成新的迁移"
echo "  pnpm db:migrate   - 执行迁移"
echo "  pnpm db:studio    - 打开Drizzle Studio"
echo "  pnpm db:deploy    - 一键部署数据库"
echo ""
echo "============================================"
