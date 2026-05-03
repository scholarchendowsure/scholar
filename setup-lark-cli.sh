
#!/bin/bash

echo "🚀 开始配置 lark-cli..."

# 创建临时文件来捕获输出
OUTPUT_FILE="/tmp/lark-cli-config-output.txt"

# 在后台运行 lark-cli config init --new
echo "⏳ 正在运行 lark-cli config init --new..."
lark-cli config init --new &gt; "$OUTPUT_FILE" 2&gt;&amp;1 &amp;
CLI_PID=$!

echo "📝 lark-cli PID: $CLI_PID"

# 等待一下让命令启动
sleep 3

# 查看输出
echo ""
echo "📄 lark-cli 输出："
echo "========================================"
cat "$OUTPUT_FILE"
echo "========================================"

# 如果输出中包含验证链接，显示给用户
if grep -q "http" "$OUTPUT_FILE"; then
    echo ""
    echo "🔗 找到验证链接！"
    echo "请在浏览器中打开上面显示的链接完成授权！"
else
    echo ""
    echo "⚠️  未找到验证链接，可能命令还在运行或失败了"
    echo "📋 进程状态："
    ps aux | grep lark-cli
fi

echo ""
echo "💡 授权完成后，运行：lark-cli auth status 来验证"
