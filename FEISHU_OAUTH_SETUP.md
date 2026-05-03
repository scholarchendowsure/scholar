# 飞书OAuth配置指南

## 配置步骤

### 1. 在飞书开放平台创建应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 登录并进入 [开发者后台](https://open.feishu.cn/app)
3. 点击"创建企业自建应用"
4. 填写应用信息：
   - 应用名称：贷后案件管理系统
   - 应用描述：用于贷后案件管理的飞书集成
5. 点击"确定创建"

### 2. 获取应用凭证

1. 在应用详情页，找到"凭证与基础信息"
2. 复制以下信息：
   - **App ID** (App ID)
   - **App Secret** (App Secret)

### 3. 配置重定向URL

1. 在应用详情页，找到"安全设置"
2. 在"重定向URL"中添加：
   ```
   https://your-domain.com/api/feishu-oauth/callback
   ```
   （将 `your-domain.com` 替换为你实际的域名）

### 4. 配置环境变量

在你的项目中配置以下环境变量：

```bash
# 飞书应用凭证
FEISHU_APP_ID=your_app_id_here
FEISHU_APP_SECRET=your_app_secret_here
```

### 5. 添加权限

在应用详情页的"权限管理"中，添加以下权限：
- `contact:user.base:readonly` - 获取用户基本信息
- `im:message` - 发送消息（可选）

### 6. 发布应用

1. 完成配置后，点击"版本管理与发布"
2. 创建一个新版本并发布
3. 等待审核通过（或使用测试版进行测试）

## 本地开发测试

如果你在本地开发，可以使用以下临时配置：

```bash
# 临时用于测试的配置（实际使用时请替换）
FEISHU_APP_ID=cli_a1b2c3d4e5f6g7h8
FEISHU_APP_SECRET=abcdef1234567890abcdef1234567890
```

## 验证配置

配置完成后，访问飞书消息页面，点击"一键授权"按钮，应该能正常跳转到飞书授权页面。

## 常见问题

### Q: 提示"请先配置飞书应用ID"
A: 没有设置 `FEISHU_APP_ID` 环境变量，请按照上述步骤配置。

### Q: 授权后提示错误
A: 检查重定向URL是否正确配置，并且与环境变量中的域名一致。

### Q: Token很快过期
A: 系统会自动检查并提醒你刷新，点击"刷新授权"即可。
