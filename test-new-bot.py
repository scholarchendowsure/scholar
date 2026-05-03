
import requests
import json

# ========== 配置信息 ==========
COZE_API_TOKEN = "pat_NmsdYKYAZBz6IxJrzGqf7mxH91vqBKOp6QlJeUmrTXLcmSkt6jg4v4wjxP0bA5rF"
NEW_BOT_ID = "7633302958972731688"
CHENXIN_OPEN_ID = "ou_a6c1929d297c616fbdff10da8472e263"

# ========== 调用新的 Bot ==========
def call_new_bot(instruction):
    url = "https://api.coze.cn/v3/chat"
    headers = {
        "Authorization": f"Bearer {COZE_API_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "bot_id": NEW_BOT_ID,
        "user_id": "loan_system_test",
        "additional_messages": [{
            "role": "user",
            "content": instruction
        }],
        "stream": False
    }
    
    print(f"📤 正在调用新的 Coze Bot...")
    print(f"🔗 URL: {url}")
    print(f"🤖 新 Bot ID: {NEW_BOT_ID}")
    print()
    
    response = requests.post(url, headers=headers, json=payload)
    return response


# ========== 主测试 ==========
if __name__ == "__main__":
    print("=" * 70)
    print("🚀 测试新的 Coze Bot")
    print("=" * 70)
    print()
    
    # 简单的测试指令
    instruction = f"""
请说一句问候语！然后告诉我你能做什么！
"""
    
    # 调用新的 Bot
    response = call_new_bot(instruction)
    
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

