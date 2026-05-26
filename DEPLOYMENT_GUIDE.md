# 贷后案件管理系统 - 部署指南

## 📋 部署概要

- **目标服务器**: 101.96.214.104
- **数据库**: 火山引擎PostgreSQL (已配置)
- **部署方式**: Docker + Docker Compose
- **应用端口**: 5000

---

## 🚀 快速部署（推荐）

### 步骤1：SSH登录到你的服务器

```bash
ssh root@101.96.214.104
```

### 步骤2：在服务器上创建应用目录

```bash
mkdir -p /opt/loan-system
cd /opt/loan-system
```

### 步骤3：上传项目代码到服务器

**方法1：使用SCP（从本地电脑执行）**
```bash
# 在你的本地电脑上执行
scp -r /path/to/your/projects/* root@101.96.214.104:/opt/loan-system/
```

**方法2：使用Git（推荐）**
```bash
# 在服务器上执行
cd /opt/loan-system
git clone <你的代码仓库地址> .
```

### 步骤4：在服务器上运行一键部署脚本

```bash
cd /opt/loan-system
chmod +x scripts/docker-deploy.sh
./scripts/docker-deploy.sh
```

或者直接使用Docker Compose：

```bash
cd /opt/loan-system
docker-compose up -d --build
```

### 步骤5：验证部署

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 测试访问
curl http://localhost:5000
```

---

## 📝 详细部署步骤

### 1. 准备服务器环境

```bash
# SSH登录
ssh root@101.96.214.104

# 更新系统
apt update -y
apt upgrade -y

# 安装Docker（如果还没安装）
apt install -y docker.io docker-compose
systemctl start docker
systemctl enable docker

# 验证Docker安装
docker --version
docker-compose --version
```

### 2. 上传项目代码

```bash
# 创建应用目录
mkdir -p /opt/loan-system
cd /opt/loan-system

# 方法1：SCP上传（从本地电脑）
# 在本地电脑执行：
scp -r /path/to/your/projects/* root@101.96.214.104:/opt/loan-system/

# 方法2：Git克隆（推荐）
git clone <你的代码仓库地址> .
```

### 3. 配置环境变量

确认`.env.production`文件中的数据库配置：

```env
DB_HOST=101.96.214.104
DB_PORT=5432
DB_USER=coze
DB_PASSWORD=GWRXnGAWfTt75CY
DB_NAME=coze
DATABASE_URL=postgresql://coze:GWRXnGAWfTt75CY@101.96.214.104:5432/coze?sslmode=require
```

### 4. 启动服务

```bash
cd /opt/loan-system

# 构建并启动服务
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 5. 验证部署

```bash
# 测试本地访问
curl http://localhost:5000

# 浏览器访问
http://101.96.214.104:5000
```

---

## 🎯 使用已有的部署脚本

项目中已提供3个部署脚本：

### 脚本1：Docker部署（推荐）

```bash
cd /opt/loan-system
chmod +x scripts/docker-deploy.sh
./scripts/docker-deploy.sh
```

### 脚本2：传统部署（非Docker）

```bash
cd /opt/loan-system
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 脚本3：火山云ECS一键部署

```bash
cd /opt/loan-system
chmod +x scripts/一键部署.sh
./scripts/一键部署.sh
```

---

## 🔧 常用管理命令

### Docker Compose命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f app

# 重新构建并启动
docker-compose up -d --build
```

### PM2命令（如果使用非Docker部署）

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs loan-system

# 重启
pm2 restart loan-system

# 停止
pm2 stop loan-system

# 启动
pm2 start loan-system
```

---

## 📊 数据库连接验证

### 测试数据库连接

```bash
cd /opt/loan-system
pnpm db:test
```

### 使用psql连接

```bash
# 安装psql客户端
apt install -y postgresql-client

# 连接数据库
psql -h 101.96.214.104 -p 5432 -U coze -d coze
```

---

## 🔍 故障排查

### 问题1：端口被占用

```bash
# 查看端口占用
netstat -tulpn | grep 5000

# 或者
ss -tulpn | grep 5000

# 杀死占用端口的进程
kill -9 <PID>
```

### 问题2：Docker服务无法启动

```bash
# 查看Docker状态
systemctl status docker

# 重启Docker
systemctl restart docker

# 查看Docker日志
journalctl -u docker -f
```

### 问题3：数据库连接失败

```bash
# 测试数据库连接
pnpm db:test

# 检查防火墙
ufw status

# 如果需要，开放端口
ufw allow 5432
ufw allow 5000
```

### 问题4：查看应用日志

```bash
# Docker方式
docker-compose logs -f app

# PM2方式
pm2 logs loan-system

# 查看系统日志
tail -f /var/log/syslog
```

---

## 🌐 访问地址

- **本地访问**: http://localhost:5000
- **公网访问**: http://101.96.214.104:5000
- **域名访问**: https://scholargl.cn (如果已配置域名)

---

## 📝 部署检查清单

- [ ] SSH登录到服务器成功
- [ ] Docker已安装并运行
- [ ] 项目代码已上传到服务器
- [ ] 环境变量配置正确
- [ ] 数据库连接测试成功
- [ ] Docker Compose启动成功
- [ ] 服务状态正常（docker-compose ps）
- [ ] 本地访问测试成功（curl http://localhost:5000）
- [ ] 公网访问测试成功（http://101.96.214.104:5000）

---

## 🆘 需要帮助？

如果遇到问题，请：

1. 查看日志：`docker-compose logs -f`
2. 检查服务状态：`docker-compose ps`
3. 测试数据库连接：`pnpm db:test`
4. 确认防火墙设置：`ufw status`

---

**祝部署顺利！🎉**
