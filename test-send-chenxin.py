#!/usr/bin/env python3
import json
import requests
from datetime import datetime

# 读取OAuth配置
OAUTH_CONFIG_PATH = "/workspace/projects/public/data/feishu-web-oauth-token.json"

try:
    with open(OAUTH_CONFIG_PATH, 'r') as f:
        oauth_data = json.load(f)
    
    user_access_token = oauth_data.get('accessToken')
    
    if not user_access_token:
        print("❌ 未找到 access_token！")
        exit(1)
    
    print("✅ 成功读取到 OAuth token")
    print(f"🔑 Token: {user_access_token[:30]}...")
    
    # 晨忻的Open ID
    chenxin_open_id = "ou_a6c1929d297c616fbdff10da8472e263"
    
    # 消息内容
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    message_content = f"【测试消息】你好晨忻！这是一条来自高乐的测试消息，发送时间: {current_time}"
    
    print(f"\n📤 准备发送消息给晨忻 (Open ID: {chenxin_open_id})")
    print(f"📝 消息内容: {message_content}")
    
    # 发送消息API
    url = "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id"
    
    headers = {
        "Authorization": f"Bearer {user_access_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "receive_id": chenxin_open_id,
        "msg_type": "text",
        "content": json.dumps({
            "text": message_content
        }),
        "uuid": "test-message-12345"
    }
    
    print("\n🚀 正在调用飞书API...")
    
    response = requests.post(url, headers=headers, json=payload, timeout=30)
    
    print(f"\n📡 API响应状态码: {response.status_code}")
    print(f"📡 API响应内容: {response.text}")
    
    result = response.json()
    
    if result.get("code") == 0:
        print("\n✅ 消息发送成功！")
        print(f"📨 消息ID: {result.get('data', {}).get('message_id')}")
    else:
        print(f"\n❌ 消息发送失败: {result.get('msg')} (code: {result.get('code')})")
        
except FileNotFoundError:
    print(f"❌ 找不到OAuth配置文件: {OAUTH_CONFIG_PATH}")
except Exception as e:
    print(f"❌ 发送消息时出错: {e}")
    import traceback
    traceback.print_exc()
