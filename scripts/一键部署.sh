#!/bin/bash
# 一键部署脚本 - 火山云 ECS
# 服务器: 101.96.214.104

set -e

echo "======================================"
echo "   贷后案件管理系统 - 一键部署"
echo "   服务器: 101.96.214.104"
echo "======================================"

# 1. 安装 Docker
echo "[1/5] 安装 Docker..."
apt update
apt install -y docker.io docker-compose
systemctl start docker
systemctl enable docker
echo "✅ Docker 安装完成"

# 2. 创建目录
echo "[2/5] 创建目录..."
mkdir -p /opt/loan-system
echo "✅ 目录创建完成"

# 3. 提示上传代码
echo "[3/5] 请上传代码..."
echo ""
echo "📋 在本地电脑执行以下命令上传代码："
echo ""
echo "   scp -r /您的代码路径/* root@101.96.214.104:/opt/loan-system/"
echo ""
read -p "上传完成后按回车继续..."

# 4. 启动服务
echo "[4/5] 启动服务..."
cd /opt/loan-system
docker-compose up -d --build
echo "✅ 服务启动完成"

# 5. 验证
echo "[5/5] 验证服务..."
sleep 10
if curl -s localhost:5000 > /dev/null; then
    echo ""
    echo "======================================"
    echo "   🎉 部署成功！"
    echo "======================================"
    echo ""
    echo "📱 访问地址: http://101.96.214.104:5000"
    echo "📊 数据库: PostgreSQL 15"
    echo ""
    echo "📝 常用命令:"
    echo "   查看日志: docker-compose logs -f"
    echo "   重启服务: docker-compose restart"
    echo "   停止服务: docker-compose down"
    echo ""
else
    echo "❌ 服务可能未正常启动，请查看日志: docker-compose logs"
fi
