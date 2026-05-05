# 贷后案件管理系统 - AGENTS.md

## 项目概述

金融贷后案件管理系统，用于管理贷后外访案件全生命周期，包括案件分配、跟进、结案、还款记录、风险评定、数据导入导出、汇丰贷款专项管理等功能模块。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **图表**: Recharts
- **状态管理**: React Context + useState

## 目录结构

```
/workspace/projects/
├── src/
│   ├── app/                      # 页面路由
│   │   ├── (main)/              # 主布局分组
│   │   │   ├── cases/           # 案件管理
│   │   │   ├── hsbc-panel/      # 汇丰贷款管理
│   │   │   ├── my-cases/        # 我的案件
│   │   │   └── ...
│   │   ├── api/                 # API 路由
│   │   │   ├── auth/            # 认证
│   │   │   ├── users/           # 用户管理
│   │   │   ├── cases/          # 案件管理
│   │   │   ├── hsbc/           # 汇丰贷款
│   │   │   └── mcp-services/   # MCP数据仓库
│   │   ├── login/               # 登录页
│   │   └── globals.css         # 全局样式
│   ├── components/
│   │   ├── ui/                 # shadcn/ui 组件
│   │   ├── sidebar.tsx         # 侧边栏
│   │   └── auth-provider.tsx   # 认证Provider
│   └── lib/
│       ├── utils.ts            # 工具函数
│       ├── constants.ts        # 常量配置
│       ├── auth.ts             # 认证辅助
│       └── db/                 # 数据库配置
├── public/                     # 静态资源
├── package.json
└── tsconfig.json
```

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发环境 (端口 5000)
pnpm dev

# 构建生产版本
pnpm build

# 启动生产环境
pnpm start
```

## 环境变量

- `DEPLOY_RUN_PORT`: 服务端口 (默认 5000)
- `COZE_PROJECT_DOMAIN_DEFAULT`: 访问域名

## API 端点

### 认证
- `POST /api/auth/login` - 用户登录

### 用户管理
- `GET /api/users` - 用户列表
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户

### 案件管理
- `GET /api/cases` - 案件列表
- `GET /api/cases/:id` - 案件详情
- `POST /api/cases` - 创建案件
- `PUT /api/cases/:id` - 更新案件
- `DELETE /api/cases/:id` - 删除案件
- `POST /api/cases/:id/followups` - 创建跟进记录
- `POST /api/cases/:id/close` - 结案操作
- `POST /api/cases/:id/risk-assessments` - 风险评定
- `GET /api/cases/statistics/dashboard` - 仪表盘统计

### 汇丰贷款
- `GET /api/hsbc` - 贷款列表
- `GET /api/hsbc/stats` - 仪表盘统计
- `GET /api/hsbc/batch-dates` - 批次日期列表
- `GET /api/hsbc/extension-merchants` - 展期商户列表

### MCP 数据仓库
- `GET /api/mcp-services` - 服务列表
- `POST /api/mcp-services` - 创建服务
- `PUT /api/mcp-services/:id` - 更新服务
- `DELETE /api/mcp-services/:id` - 删除服务

## 测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| zhangsan | admin123 | 外访员 |
| lisi | admin123 | 外访员 |
| wangwu | admin123 | 经理 |

## 设计规范

### 色彩系统
- 主色: 深蓝 `hsl(210, 95%, 40%)`
- 背景: 浅灰蓝 `hsl(215, 25%, 97%)`
- 卡片: 白色 `hsl(0, 0%, 100%)`
- 边框: `hsl(220, 20%, 88%)`

### 案件状态
- 待分配 (pending_assign): 黄色 warning
- 待外访 (pending_visit): 蓝色 info
- 跟进中 (following): 深蓝 primary
- 已结案 (closed): 绿色 success

## Mock 数据

系统使用 Mock 数据进行演示，无需数据库连接即可运行所有功能。

## 数据存储设计规范（CRITICAL）

### 🚫 禁止在JSON文件中存储base64文件数据

**核心原则**：文件（图片、文档等）的二进制数据**绝对不允许**以base64编码存储在JSON数据文件中。

| 存储方式 | 是否允许 | 说明 |
|---------|---------|------|
| base64存入JSON | ❌ **禁止** | 导致文件从KB膨胀到MB，拖慢所有API |
| 文件URL/路径引用 | ✅ **推荐** | 只存URL字符串，文件存对象存储 |
| `[stripped]`占位符 | ✅ **临时** | 已清理数据的占位，后续迁移到对象存储 |

**历史教训**：cases-v2.json因存储base64文件数据从81KB膨胀到80MB，导致案件管理页面加载需13秒。清理后恢复到81KB，加载时间降至12ms。

### 🛡️ 写入时自动防护

`caseStorage.ts` 中 `writeToFile()` 方法已内置 `stripLargeFieldsFromPartial()` 防护：
- 自动剥离 `files[].data` 中超过100字符的字符串
- 自动剥离 `followups[].fileInfo` 中的大字段
- 新增跟进记录时自动清理大字段
- 确保JSON文件不会被base64数据污染

### 📋 API数据分层返回

| API类型 | 返回数据 | 说明 |
|---------|---------|------|
| 列表API (`GET /api/cases`) | 轻量数据 | 自动剥离files.data和followups.fileInfo |
| 详情API (`GET /api/cases/:id`) | 轻量数据 | 默认剥离，加`?includeFiles=true`返回完整数据 |
| 文件下载API | 仅文件数据 | 单独返回文件二进制流 |

### 📦 内存缓存机制

所有Storage类必须实现内存缓存：
- `cachedCases` / `loansCache` 等内存变量
- 文件修改时间检查（`lastModifiedTime`）
- 文件未修改时直接返回缓存
- 写入后自动清除缓存

### 📊 API性能标准

| 指标 | 标准 | 当前 |
|------|------|------|
| 列表API响应时间 | < 100ms | ✅ 8-12ms |
| 详情API响应时间 | < 200ms | ✅ 15-30ms |
| 页面首屏加载 | < 2s | ✅ 200-400ms |
| 数据传输大小 | < 100KB/请求 | ✅ 5-10KB |

## 注意事项

1. 所有金额使用千分位格式化，¥ 前缀
2. 数据区使用等宽字体 `font-mono tabular-nums`
3. 日期本地化展示
4. 状态使用彩色标签
5. 操作成功使用 toast 提示
6. **文件上传必须存对象存储，禁止base64存JSON**
7. **列表API必须使用轻量数据，禁止返回大字段**
8. **新增Storage必须实现内存缓存**
