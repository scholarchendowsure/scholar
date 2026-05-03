#!/usr/bin/env python3
import subprocess
import sys
from datetime import datetime

# 晨忻的Open ID
chenxin_open_id = "ou_a6c1929d297c616fbdff10da8472e263"

# 消息内容
current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
message_content = f"【测试消息】你好晨忻！这是一条来自高乐的测试消息，发送时间: {current_time}"

print(f"📤 准备发送消息给晨忻 (Open ID: {chenxin_open_id})")
print(f"📝 消息内容: {message_content}\n")

# 方式1: 使用 user-id 和 --as user
print("=" * 60)
print("方式1: 使用 --user-id 和 --as user")
print("=" * 60)
try:
    cmd1 = [
        "lark-cli", "im", "+messages-send",
        "--user-id", chenxin_open_id,
        "--text", message_content,
        "--as", "user"
    ]
    print(f"执行命令: {' '.join(cmd1)}")
    
    result1 = subprocess.run(cmd1, capture_output=True, text=True, timeout=30)
    print(f"\n✅ 执行完成")
    print(f"返回码: {result1.returncode}")
    if result1.stdout:
        print(f"输出:\n{result1.stdout}")
    if result1.stderr:
        print(f"错误:\n{result1.stderr}")
        
    if result1.returncode == 0:
        print("\n🎉 方式1成功！")
except Exception as e:
    print(f"❌ 方式1失败: {e}")

# 方式2: 不带 --as user
print("\n" + "=" * 60)
print("方式2: 不带 --as user")
print("=" * 60)
try:
    cmd2 = [
        "lark-cli", "im", "+messages-send",
        "--user-id", chenxin_open_id,
        "--text", message_content
    ]
    print(f"执行命令: {' '.join(cmd2)}")
    
    result2 = subprocess.run(cmd2, capture_output=True, text=True, timeout=30)
    print(f"\n✅ 执行完成")
    print(f"返回码: {result2.returncode}")
    if result2.stdout:
        print(f"输出:\n{result2.stdout}")
    if result2.stderr:
        print(f"错误:\n{result2.stderr}")
        
    if result2.returncode == 0:
        print("\n🎉 方式2成功！")
except Exception as e:
    print(f"❌ 方式2失败: {e}")

print("\n" + "=" * 60)
print("所有方式尝试完成")
print("=" * 60)
