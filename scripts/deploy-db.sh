#!/bin/bash

# 数据库一键部署脚本

set -e

echo "🚀 开始部署贷后系统数据库..."

# 从.env.local读取环境变量
if [ -f .env.local ]; then
    echo "📄 加载 .env.local 配置文件..."
    export $(grep -v '^#' .env.local | xargs)
else
    echo "❌ 错误: .env.local 文件不存在"
    exit 1
fi

# 检查DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ 错误: DATABASE_URL 环境变量未设置"
    echo "请检查 .env.local 文件中的配置"
    exit 1
fi

echo "✅ 数据库配置已加载"
echo "📊 连接到: $DB_HOST:$DB_PORT"
echo "🗄️  数据库: $DB_NAME"
echo "👤 用户: $DB_USER"
echo ""

# 步骤1: 测试数据库连接
echo "🔍 步骤1: 测试数据库连接..."
if ! node test-db-connection.mjs; then
    echo "❌ 数据库连接测试失败"
    exit 1
fi
echo "✅ 数据库连接成功"
echo ""

# 步骤2: 生成数据库迁移
echo "📝 步骤2: 生成数据库迁移..."
if ! pnpm db:generate; then
    echo "❌ 数据库迁移生成失败"
    exit 1
fi
echo "✅ 数据库迁移生成成功"
echo ""

# 步骤3: 执行数据库迁移
echo "🔧 步骤3: 执行数据库迁移..."
if ! node run-migration.mjs; then
    echo "❌ 数据库迁移执行失败"
    exit 1
fi
echo "✅ 数据库迁移执行成功"
echo ""

# 步骤4: 验证数据库部署
echo "✅ 步骤4: 验证数据库部署..."
if ! node test-db-connection.mjs; then
    echo "❌ 数据库部署验证失败"
    exit 1
fi
echo "✅ 数据库部署验证成功"
echo ""

echo ""
echo "🎉 ==============================================="
echo "🎉 数据库部署成功！"
echo "🎉 ==============================================="
echo ""
echo "📋 下一步操作："
echo "   1. 运行 'pnpm db:studio' 查看数据库"
echo "   2. 运行 'pnpm dev' 启动开发服务器"
echo "   3. 开始使用贷后系统！"
echo ""
echo "📚 详细文档请查看: DATABASE_DEPLOY.md"
echo ""
