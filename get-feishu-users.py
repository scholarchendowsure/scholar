
#!/usr/bin/env python3
import json
import base64
import requests
import os
from datetime import datetime

# 简单的加密/解密函数，和 feishu-api.ts 一致
def encrypt(text):
    key = 'feishu_secret_key_2024'
    result = []
    for i, char in enumerate(text):
        key_char = key[i % len(key)]
        char_code = ord(char) ^ ord(key_char)
        result.append(chr(char_code))
    return base64.b64encode(''.join(result).encode('utf-8')).decode('utf-8')

def decrypt(encrypted):
    try:
        key = 'feishu_secret_key_2024'
        text = base64.b64decode(encrypted).decode('utf-8')
        result = []
        for i, char in enumerate(text):
            key_char = key[i % len(key)]
            char_code = ord(char) ^ ord(key_char)
            result.append(chr(char_code))
        return ''.join(result)
    except Exception as e:
        print(f'解密失败: {e}')
        return ''

# 读取配置
config_path = 'public/data/feishu-config.json'
with open(config_path, 'r', encoding='utf-8') as f:
    config = json.load(f)

app_id = config.get('appId', '')
app_secret = ''
if config.get('appSecretEncrypted'):
    app_secret = decrypt(config['appSecretEncrypted'])

print('🚀 开始获取所有飞书用户...')
print(f'📝 App ID: {app_id[:8] if app_id else "未配置"}...')

if not app_id or not app_secret:
    print('❌ 请先配置飞书应用ID和密钥')
    exit(1)

FEISHU_API_BASE = 'https://open.feishu.cn/open-apis'

def get_tenant_access_token():
    print('🔐 开始获取飞书 tenant_access_token...')
    
    url = f'{FEISHU_API_BASE}/auth/v3/tenant_access_token/internal'
    headers = {'Content-Type': 'application/json'}
    data = {
        'app_id': app_id,
        'app_secret': app_secret
    }
    
    response = requests.post(url, headers=headers, json=data)
    result = response.json()
    
    print(f'📊 Token API 完整响应: {json.dumps(result, indent=2, ensure_ascii=False)}')
    
    if result.get('code') != 0:
        raise Exception(f'获取飞书token失败: code={result.get("code")}, msg={result.get("msg")}')
    
    print('✅ 飞书token获取成功')
    return result.get('tenant_access_token')

def get_feishu_users(access_token, page_size=50, page_token=None):
    print('👥 开始获取飞书用户列表...')
    
    url = f'{FEISHU_API_BASE}/contact/v3/users?page_size={page_size}'
    if page_token:
        url += f'&amp;page_token={page_token}'
    
    print(f'🌐 请求URL: {url}')
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get(url, headers=headers)
    print(f'📡 用户API响应状态: {response.status_code}')
    
    result = response.json()
    print(f'📊 用户API完整响应: {json.dumps(result, indent=2, ensure_ascii=False)}')
    
    if result.get('code') != 0:
        raise Exception(f'获取飞书用户列表失败: code={result.get("code")}, msg={result.get("msg")}')
    
    items = result.get('data', {}).get('items', [])
    print(f'📋 原始用户数据数量: {len(items)}')
    
    users = []
    for idx, item in enumerate(items):
        user = {
            'unionId': item.get('union_id', ''),
            'userId': item.get('user_id') or item.get('open_id', ''),
            'name': item.get('name', '未知用户'),
            'enName': item.get('en_name'),
            'email': item.get('email'),
            'mobile': item.get('mobile'),
            'avatarUrl': (item.get('avatar', {}).get('avatar_72') or 
                         item.get('avatar', {}).get('avatar_240')),
            'status': 'inactive' if (item.get('status', {}).get('is_frozen')) else 'active',
            'departmentIds': item.get('department_ids')
        }
        print(f'👤 处理用户 {idx + 1}: union_id={user["unionId"]}, user_id={user["userId"]}, name={user["name"]}')
        users.append(user)
    
    return {
        'users': users,
        'pageToken': result.get('data', {}).get('page_token'),
        'hasMore': result.get('data', {}).get('has_more', False)
    }

def get_all_feishu_users(access_token):
    print('🚀 开始获取所有飞书用户...')
    
    all_users = []
    page_token = None
    has_more = True
    page = 1
    
    while has_more:
        print(f'📄 正在获取第 {page} 页用户...')
        
        result = get_feishu_users(access_token, 50, page_token)
        all_users.extend(result['users'])
        
        page_token = result['pageToken']
        has_more = result['hasMore']
        page += 1
        
        print(f'📊 当前已获取 {len(all_users)} 个用户')
    
    print(f'🎉 完成！共获取 {len(all_users)} 个飞书用户')
    return all_users

def main():
    try:
        access_token = get_tenant_access_token()
        users = get_all_feishu_users(access_token)
        
        # 保存原始数据
        raw_data_path = 'public/feishu-users-raw.json'
        with open(raw_data_path, 'w', encoding='utf-8') as f:
            json.dump(users, f, indent=2, ensure_ascii=False)
        print(f'📄 原始数据已保存到: {raw_data_path}')
        
        # 生成简单的 HTML 报告
        html_path = 'public/feishu-users.html'
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        html = f'''
&lt;!DOCTYPE html&gt;
&lt;html lang="zh-CN"&gt;
&lt;head&gt;
    &lt;meta charset="UTF-8"&gt;
    &lt;meta name="viewport" content="width=device-width, initial-scale=1.0"&gt;
    &lt;title&gt;飞书用户报告&lt;/title&gt;
    &lt;style&gt;
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f5f5f5; }}
        .container {{ max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        h1 {{ color: #333; margin-bottom: 10px; }}
        .summary {{ display: flex; gap: 20px; margin: 20px 0; }}
        .stat {{ background: #f0f0f0; padding: 15px 25px; border-radius: 8px; text-align: center; }}
        .stat .num {{ font-size: 2rem; font-weight: bold; color: #667eea; }}
        .stat .label {{ color: #666; margin-top: 5px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #eee; }}
        th {{ background: #f8f8f8; font-weight: 600; }}
        tr:hover {{ background: #f9f9f9; }}
        .status-active {{ color: #155724; background: #d4edda; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; }}
        .status-inactive {{ color: #721c24; background: #f8d7da; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; }}
        .no-users {{ text-align: center; padding: 60px; color: #666; }}
        .raw-data {{ margin-top: 30px; background: #2d2d2d; color: #a5d6ff; padding: 20px; border-radius: 8px; overflow-x: auto; }}
        .raw-data pre {{ margin: 0; font-size: 0.85rem; line-height: 1.5; }}
    &lt;/style&gt;
&lt;/head&gt;
&lt;body&gt;
    &lt;div class="container"&gt;
        &lt;h1&gt;👥 飞书用户报告&lt;/h1&gt;
        &lt;p&gt;生成时间: {timestamp}&lt;/p&gt;
        
        &lt;div class="summary"&gt;
            &lt;div class="stat"&gt;
                &lt;div class="num"&gt;{len(users)}&lt;/div&gt;
                &lt;div class="label"&gt;总用户数&lt;/div&gt;
            &lt;/div&gt;
            &lt;div class="stat"&gt;
                &lt;div class="num"&gt;{len([u for u in users if u['status'] == 'active'])}&lt;/div&gt;
                &lt;div class="label"&gt;活跃用户&lt;/div&gt;
            &lt;/div&gt;
            &lt;div class="stat"&gt;
                &lt;div class="num"&gt;{len([u for u in users if u['status'] == 'inactive'])}&lt;/div&gt;
                &lt;div class="label"&gt;非活跃用户&lt;/div&gt;
            &lt;/div&gt;
        &lt;/div&gt;
'''
        
        if len(users) == 0:
            html += '''
        &lt;div class="no-users"&gt;
            &lt;h2&gt;未找到任何飞书用户&lt;/h2&gt;
            &lt;p&gt;可能的原因：&lt;/p&gt;
            &lt;ul style="text-align: left; max-width: 500px; margin: 20px auto;"&gt;
                &lt;li&gt;飞书应用权限不足（需要获取通讯录权限）&lt;/li&gt;
                &lt;li&gt;当前使用的是网页应用，而不是企业自建应用&lt;/li&gt;
                &lt;li&gt;企业通讯录中没有用户数据&lt;/li&gt;
                &lt;li&gt;App ID 或 App Secret 配置错误&lt;/li&gt;
            &lt;/ul&gt;
            &lt;p style="margin-top: 20px; font-weight: bold;"&gt;💡 建议：请使用企业自建应用的 App ID 和 App Secret，而不是网页应用的凭证！&lt;/p&gt;
        &lt;/div&gt;
            '''
        else:
            html += '''
        &lt;table&gt;
            &lt;thead&gt;
                &lt;tr&gt;
                    &lt;th&gt;姓名&lt;/th&gt;
                    &lt;th&gt;英文名&lt;/th&gt;
                    &lt;th&gt;Union ID&lt;/th&gt;
                    &lt;th&gt;User ID&lt;/th&gt;
                    &lt;th&gt;邮箱&lt;/th&gt;
                    &lt;th&gt;手机&lt;/th&gt;
                    &lt;th&gt;状态&lt;/th&gt;
                &lt;/tr&gt;
            &lt;/thead&gt;
            &lt;tbody&gt;
            '''
            
            for user in users:
                html += f'''
                &lt;tr&gt;
                    &lt;td&gt;{user.get('name', '-')}&lt;/td&gt;
                    &lt;td&gt;{user.get('enName', '-')}&lt;/td&gt;
                    &lt;td style="font-family: monospace; font-size: 0.85rem;"&gt;{user.get('unionId', '-')}&lt;/td&gt;
                    &lt;td style="font-family: monospace; font-size: 0.85rem;"&gt;{user.get('userId', '-')}&lt;/td&gt;
                    &lt;td&gt;{user.get('email', '-')}&lt;/td&gt;
                    &lt;td&gt;{user.get('mobile', '-')}&lt;/td&gt;
                    &lt;td&gt;&lt;span class="status-{user['status']}"&gt;{'活跃' if user['status'] == 'active' else '非活跃'}&lt;/span&gt;&lt;/td&gt;
                &lt;/tr&gt;
                '''
            
            html += '''
            &lt;/tbody&gt;
        &lt;/table&gt;
            '''
        
        html += f'''
        &lt;div class="raw-data"&gt;
            &lt;h3 style="color: white; margin-top: 0;"&gt;📄 原始数据 (JSON)&lt;/h3&gt;
            &lt;pre&gt;{json.dumps(users, indent=2, ensure_ascii=False)}&lt;/pre&gt;
        &lt;/div&gt;
    &lt;/div&gt;
&lt;/body&gt;
&lt;/html&gt;
        '''
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f'📄 HTML 报告已保存到: {html_path}')
        
        print('\n' + '=' * 60)
        print('✅ 任务完成！')
        print(f'📊 总用户数: {len(users)}')
        print('📄 查看报告: /feishu-users.html')
        print('📄 原始数据: /feishu-users-raw.json')
        print('=' * 60)
        
    except Exception as e:
        print(f'\n❌ 发生错误: {e}')
        
        error_log_path = 'public/feishu-error.log'
        with open(error_log_path, 'w', encoding='utf-8') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'error': str(e),
            }, f, indent=2, ensure_ascii=False)
        
        print(f'📄 错误日志已保存到: {error_log_path}')
        exit(1)

if __name__ == '__main__':
    main()
