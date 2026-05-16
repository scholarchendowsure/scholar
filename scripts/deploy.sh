#!/bin/bash
set -e

# ============================================
# 贷后案件管理系统 - 一键部署脚本
# 服务器: 101.96.214.104
# ============================================

echo "============================================"
echo "  贷后案件管理系统 - 一键部署"
echo "============================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}错误: 请使用 root 用户运行此脚本${NC}"
    echo "运行: sudo su - 然后再运行此脚本"
    exit 1
fi

# 配置变量
APP_DIR="/opt/loan-system"
APP_USER="deploy"
APP_NAME="loan-system"
PORT=5000
DOMAIN="scholargl.cn"

# ============================================
# 第1步: 更新系统
# ============================================
echo -e "${GREEN}[1/8] 更新系统...${NC}"
apt update -y
apt upgrade -y

# ============================================
# 第2步: 安装 Node.js 18
# ============================================
echo -e "${GREEN}[2/8] 安装 Node.js 18...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi
node --version
npm --version

# ============================================
# 第3步: 安装 pnpm
# ============================================
echo -e "${GREEN}[3/8] 安装 pnpm...${NC}"
npm install -g pnpm
pnpm --version

# ============================================
# 第4步: 安装 PostgreSQL
# ============================================
echo -e "${GREEN}[4/8] 安装 PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
fi

# 启动 PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# 创建数据库和用户
su - postgres -c "psql -c \"CREATE USER loanadmin WITH PASSWORD 'LoanAdmin2024!@#';\"" 2>/dev/null || true
su - postgres -c "psql -c \"CREATE DATABASE loandb OWNER loanadmin;\"" 2>/dev/null || true
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE loandb TO loanadmin;\"" 2>/dev/null || true

echo -e "${GREEN}PostgreSQL 安装完成!${NC}"
echo "  数据库: loandb"
echo "  用户名: loanadmin"
echo "  密码: LoanAdmin2024!@#"

# ============================================
# 第5步: 创建应用目录
# ============================================
echo -e "${GREEN}[5/8] 创建应用目录...${NC}"
mkdir -p $APP_DIR
cd $APP_DIR

# ============================================
# 第6步: 安装 PM2
# ============================================
echo -e "${GREEN}[6/8] 安装 PM2...${NC}"
npm install -g pm2
pm2 install pm2-logrotate

# ============================================
# 第7步: 配置环境变量
# ============================================
echo -e "${GREEN}[7/8] 配置环境变量...${NC}"
cat > $APP_DIR/.env << 'EOF'
# 数据库配置
DATABASE_URL=postgresql://loanadmin:LoanAdmin2024!@#@localhost:5432/loandb
DB_HOST=localhost
DB_PORT=5432
DB_USER=loanadmin
DB_PASSWORD=LoanAdmin2024!@#@localhost
DB_NAME=loandb

# 应用配置
PORT=5000
NODE_ENV=production

# 域名配置
COZE_PROJECT_DOMAIN_DEFAULT=https://scholargl.cn
EOF

# ============================================
# 第8步: 安装依赖并构建
# ============================================
echo -e "${GREEN}[8/8] 安装依赖并构建...${NC}"

# 检查代码是否已上传
if [ ! -f "$APP_DIR/package.json" ]; then
    echo -e "${YELLOW}警告: 目录为空，请先上传项目代码到 $APP_DIR${NC}"
    echo ""
    echo "请使用以下方式上传代码:"
    echo "  1. Git: git clone <您的代码仓库> $APP_DIR"
    echo "  2. SCP: scp -r ./projects/* root@101.96.214.104:$APP_DIR/"
    exit 1
fi

pnpm install
pnpm build

# 启动应用
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start pnpm --name "$APP_NAME" -- start

# 保存 PM2 配置
pm2 save
pm2 startup

echo ""
echo "============================================"
echo -e "${GREEN}  部署完成!${NC}"
echo "============================================"
echo ""
echo -e "访问地址: ${GREEN}http://101.96.214.104:5000${NC}"
echo ""
echo -e "${YELLOW}常用命令:${NC}"
echo "  pm2 status          - 查看运行状态"
echo "  pm2 logs loan-system - 查看日志"
echo "  pm2 restart loan-system - 重启应用"
echo ""
