# 数据库部署指南

## 📋 数据库配置

当前数据库配置（已配置在 `.env.local` 和 `.env.production`）：

```env
DB_HOST=101.96.214.104
DB_PORT=5432
DB_USER=coze
DB_PASSWORD=GWRXnGAWfTt75CY
DB_NAME=coze
DATABASE_URL=postgresql://coze:GWRXnGAWfTt75CY@101.96.214.104:5432/coze?sslmode=require
```

## 🚀 一键部署数据库

### 方法1：使用一键部署脚本（推荐）

```bash
pnpm db:deploy
```

这个脚本会自动执行以下步骤：
1. ✅ 检查数据库配置
2. ✅ 生成数据库迁移
3. ✅ 执行数据库迁移
4. ✅ 验证数据库部署

### 方法2：手动部署

#### 步骤1：生成数据库迁移

```bash
pnpm db:generate
```

#### 步骤2：执行数据库迁移

```bash
pnpm db:migrate
```

#### 步骤3：验证数据库连接

```bash
pnpm db:test
```

## 🛠️ 数据库管理命令

| 命令 | 说明 |
|------|------|
| `pnpm db:generate` | 生成新的数据库迁移 |
| `pnpm db:migrate` | 执行数据库迁移 |
| `pnpm db:studio` | 打开Drizzle Studio（可视化数据库管理） |
| `pnpm db:deploy` | 一键部署数据库 |
| `pnpm db:test` | 测试数据库连接 |

## 📊 数据库Schema

数据库Schema定义在：`src/storage/database/shared/schema.ts`

包含以下表：
- users - 用户表
- cases - 案件表
- followups - 跟进记录表
- hsbc_loans - 汇丰贷款表
- hsbc_loan_batches - 汇丰贷款批次表
- 等等...

## 🔧 常见问题

### Q: 数据库连接失败怎么办？

A: 检查以下几点：
1. 确认 `.env.local` 中的数据库配置正确
2. 确认数据库服务器可以访问
3. 确认用户名和密码正确
4. 确认用户有访问数据库的权限

### Q: 如何修改数据库配置？

A: 修改以下文件：
- 开发环境：`.env.local`
- 生产环境：`.env.production`

### Q: 如何查看数据库中的数据？

A: 使用 Drizzle Studio：
```bash
pnpm db:studio
```

## 📝 部署检查清单

- [ ] 数据库配置正确（.env.local 和 .env.production）
- [ ] 数据库可以连接（pnpm db:test）
- [ ] 数据库迁移已生成（pnpm db:generate）
- [ ] 数据库迁移已执行（pnpm db:migrate）
- [ ] 数据库表已创建
- [ ] 应用可以正常使用数据库

## 🎉 完成

部署完成后，你就可以使用新的数据库了！
