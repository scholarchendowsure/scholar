
import requests
import json

# ========== 配置信息 ==========
COZE_API_TOKEN = "pat_NmsdYKYAZBz6IxJrzGqf7mxH91vqBKOp6QlJeUmrTXLcmSkt6jg4v4wjxP0bA5rF"
SCHOLAR_BOT_ID = "7633296224673759528"
CHENXIN_OPEN_ID = "ou_a6c1929d297c616fbdff10da8472e263"

# ========== 调用学者 API ==========
def call_coze_bot(instruction):
    url = "https://api.coze.cn/v3/chat"
    headers = {
        "Authorization": f"Bearer {COZE_API_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "bot_id": SCHOLAR_BOT_ID,
        "user_id": "loan_system_user",
        "additional_messages": [{
            "role": "user",
            "content": instruction
        }],
        "stream": False
    }
    
    print(f"📤 正在调用 Coze Bot...")
    print(f"🔗 URL: {url}")
    print(f"🤖 Bot ID: {SCHOLAR_BOT_ID}")
    print()
    
    response = requests.post(url, headers=headers, json=payload)
    return response


# ========== 主测试：给晨忻发消息 ==========
if __name__ == "__main__":
    print("=" * 70)
    print("🚀 贷后案件管理系统 - 飞书消息测试")
    print("=" * 70)
    print()
    
    # 构造给 bot 的指令
    instruction = f"""
【任务指令】请用 lark-cli 发送飞书消息

📋 收件人信息：
- Open ID: {CHENXIN_OPEN_ID}
- 姓名: 晨忻

📝 消息内容：
"晨忻你好！这是一条来自贷后案件管理系统的测试消息 🤖

测试信息：
- 系统：贷后案件管理系统
- 发送人：高乐
- 时间：2026-05-04

这是通过 Coze Bot 调用 lark-cli 发送的测试消息！"

🔧 执行要求：
1. 使用 lark-cli im +messages-send 命令
2. 用用户身份发送（--as user）
3. 发送完成后，请告诉我发送结果
"""
    
    # 调用 Coze Bot
    response = call_coze_bot(instruction)
    
    # 打印结果
    print(f"📥 API 响应状态码: {response.status_code}")
    print()
    
    try:
        result = response.json()
        
        print("📋 完整响应结果：")
        print("-" * 70)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print("-" * 70)
        
        # 提取 Bot 的回复
        if result.get("code") == 0:
            messages = result.get("data", {}).get("messages", [])
            print()
            print("💬 Bot 回复：")
            print("=" * 70)
            for msg in messages:
                if msg.get("role") == "assistant":
                    print(msg.get("content", ""))
                    print()
        else:
            print(f"❌ API 调用失败: {result.get('msg')}")
            print(f"   Error code: {result.get('code')}")
            
    except Exception as e:
        print(f"❌ 解析响应失败: {e}")
        print(f"   响应内容: {response.text}")
    
    print()
    print("=" * 70)
    print("✅ 测试完成")
    print("=" * 70)

