#!/bin/bash
# ============================================
# Docker 一键部署脚本（最简单的方案）
# ============================================

set -e

echo "============================================"
echo "  贷后案件管理系统 - Docker 一键部署"
echo "============================================"
echo ""

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then
    echo "请使用 root 用户运行: sudo su -"
    exit 1
fi

# 安装 Docker
if ! command -v docker &> /dev/null; then
    echo "[1/4] 安装 Docker..."
    apt update
    apt install -y docker.io docker-compose
    systemctl start docker
    systemctl enable docker
else
    echo "[1/4] Docker 已安装"
fi

# 创建应用目录
APP_DIR="/opt/loan-system"
echo "[2/4] 创建目录: $APP_DIR"
mkdir -p $APP_DIR

# 复制文件
echo "[3/4] 请将项目代码复制到: $APP_DIR"
echo ""
echo "方法1: Git"
echo "  cd $APP_DIR && git clone <您的仓库地址> ."
echo ""
echo "方法2: SCP (在另一台机器执行)"
echo "  scp -r ./* root@101.96.214.104:$APP_DIR/"
echo ""
echo "方法3: 上传文件后继续"
read -p "按 Enter 继续..."

# 启动 Docker
echo "[4/4] 启动服务..."
cd $APP_DIR

# 如果没有 Dockerfile，创建
if [ ! -f "Dockerfile" ]; then
    cp $APP_DIR/Dockerfile . 2>/dev/null || echo "请确保 Dockerfile 存在"
fi

# 启动服务
docker-compose up -d --build

echo ""
echo "============================================"
echo "  部署完成!"
echo "============================================"
echo ""
echo "访问地址: http://101.96.214.104:5000"
echo ""
echo "常用命令:"
echo "  docker-compose logs -f    - 查看日志"
echo "  docker-compose restart   - 重启服务"
echo "  docker-compose down       - 停止服务"
echo "  docker-compose up -d      - 启动服务"
echo ""
