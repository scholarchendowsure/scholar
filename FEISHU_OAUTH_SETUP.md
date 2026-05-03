# 飞书个人授权配置指南 (lark-cli)

## 重要提示

本系统使用的是 **lark-cli** 的个人用户授权模式**！

## 配置步骤

### 1. 安装 lark-cli

访问 [lark-cli GitHub 仓库下载安装：
- GitHub: https://github.com/larksuite/lark-cli

根据你的操作系统选择对应的安装方式：

**MacOS:**
```bash
# 使用 Homebrew 安装
brew install larksuite/tap/lark-cli

# 或者下载二进制安装
curl -fsSL https://github.com/larksuite.github.io/lark-cli/install.sh | bash
```

**Linux:**
```bash
# 下载二进制文件并安装
curl -fsSL https://github.com/larksuite.github.io/lark-cli/install.sh | bash
```

**Windows:**
```powershell
# 使用 PowerShell 安装
iex (iwr https://github.com/larksuite.github.io/lark-cli/install.ps1)
```

### 2. 验证安装

安装完成后，在终端运行：
```bash
lark-cli --version
```

如果显示版本号，说明安装成功！

### 3. 使用一键授权

1. 打开贷后系统的飞书消息页面
2. 找到"飞书个人授权 (lark-cli)"卡片
3. 点击"一键授权"按钮
4. 系统会自动调用 `lark-cli auth login --no-wait --recommend --json`
5. 在弹出的浏览器中完成授权
6. 授权成功后，lark-cli 会自动保存令牌

### 4. 手动授权（如果一键授权有问题）

你也可以手动在终端执行：
```bash
lark-cli auth login
```

按照提示完成授权流程。

## lark-cli 特性

### 自动刷新机制
lark-cli 内置自动刷新机制，授权成功后会自动维护令牌有效性：
- 每50分钟自动刷新用户态令牌
- 无需手动刷新操作
- 令牌永久保存到本地配置文件

### 令牌存储位置
- **MacOS/Linux: `~/.lark-cli/config.json`
- **Windows: `%APPDATA%\lark-cli\config.json`

### 检查授权状态
```bash
lark-cli auth status
```

### 解除授权
```bash
lark-cli auth logout
```

## 系统功能说明

### 卡片功能
- **一键授权**: 调用 `lark-cli auth login` 启动授权流程
- **检查状态**: 刷新并检查当前授权状态
- **解除授权**: 提示手动执行 `lark-cli auth logout`

### 自动检查
系统会每30秒自动检查一次授权状态，确保显示最新信息。

## 常见问题

### Q: 提示"未找到lark-cli命令"
A: 请先按照上述步骤安装 lark-cli。

### Q: 一键授权没有弹出浏览器
A: 可以手动在终端执行 `lark-cli auth login`。

### Q: 授权后还是显示未授权
A: 点击"检查状态"按钮刷新一下，或者等几秒钟系统自动检查。

### Q: 我需要配置环境变量吗？
A: 不需要！使用 lark-cli 模式不需要配置任何环境变量！
