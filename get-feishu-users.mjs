
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 简单的加密/解密函数，和 feishu-api.ts 一致
function encrypt(text) {
  const key = 'feishu_secret_key_2024';
  let result = '';
  for (let i = 0; i &lt; text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result);
}

function decrypt(encrypted) {
  try {
    const key = 'feishu_secret_key_2024';
    const text = atob(encrypted);
    let result = '';
    for (let i = 0; i &lt; text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch {
    return '';
  }
}

// 读取配置
const configPath = path.join(__dirname, 'public', 'data', 'feishu-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const appId = config.appId;
const appSecret = config.appSecretEncrypted ? decrypt(config.appSecretEncrypted) : '';

console.log('🚀 开始获取所有飞书用户...');
console.log('📝 App ID:', appId ? appId.substring(0, 8) + '...' : '未配置');

if (!appId || !appSecret) {
  console.error('❌ 请先配置飞书应用ID和密钥');
  process.exit(1);
}

const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

async function getTenantAccessToken() {
  console.log('🔐 开始获取飞书 tenant_access_token...');
  
  const response = await fetch(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret,
    }),
  });

  const data = await response.json();
  console.log('📊 Token API 完整响应:', JSON.stringify(data, null, 2));
  
  if (data.code !== 0) {
    throw new Error(`获取飞书token失败: code=${data.code}, msg=${data.msg}`);
  }

  console.log('✅ 飞书token获取成功');
  return data.tenant_access_token;
}

async function getFeishuUsers(accessToken, pageSize = 50, pageToken) {
  console.log('👥 开始获取飞书用户列表...');
  
  let url = `${FEISHU_API_BASE}/contact/v3/users?page_size=${pageSize}`;
  if (pageToken) {
    url += `&amp;page_token=${pageToken}`;
  }

  console.log('🌐 请求URL:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  console.log('📡 用户API响应状态:', response.status);
  
  const data = await response.json();
  console.log('📊 用户API完整响应:', JSON.stringify(data, null, 2));
  
  if (data.code !== 0) {
    throw new Error(`获取飞书用户列表失败: code=${data.code}, msg=${data.msg}`);
  }

  const items = data.data?.items || [];
  console.log('📋 原始用户数据数量:', items.length);

  const users = items.map((item, index) =&gt; {
    console.log(`👤 处理用户 ${index + 1}:`, {
      union_id: item.union_id,
      user_id: item.user_id,
      open_id: item.open_id,
      name: item.name,
    });
    
    return {
      unionId: item.union_id || '',
      userId: item.user_id || item.open_id || '',
      name: item.name || '未知用户',
      enName: item.en_name,
      email: item.email,
      mobile: item.mobile,
      avatarUrl: item.avatar?.avatar_72 || item.avatar?.avatar_240,
      status: item.status?.is_frozen ? 'inactive' : 'active',
      departmentIds: item.department_ids,
    };
  });

  return {
    users,
    pageToken: data.data?.page_token,
    hasMore: data.data?.has_more || false,
  };
}

async function getAllFeishuUsers(accessToken) {
  console.log('🚀 开始获取所有飞书用户...');
  
  const allUsers = [];
  let pageToken;
  let hasMore = true;
  let page = 1;

  while (hasMore) {
    console.log(`📄 正在获取第 ${page} 页用户...`);
    
    const result = await getFeishuUsers(accessToken, 50, pageToken);
    allUsers.push(...result.users);
    
    pageToken = result.pageToken;
    hasMore = result.hasMore;
    page++;
    
    console.log(`📊 当前已获取 ${allUsers.length} 个用户`);
  }

  console.log(`🎉 完成！共获取 ${allUsers.length} 个飞书用户`);
  return allUsers;
}

async function main() {
  try {
    const accessToken = await getTenantAccessToken();
    const users = await getAllFeishuUsers(accessToken);

    // 保存原始数据
    const rawDataPath = path.join(__dirname, 'public', 'feishu-users-raw.json');
    fs.writeFileSync(rawDataPath, JSON.stringify(users, null, 2), 'utf-8');
    console.log(`📄 原始数据已保存到: ${rawDataPath}`);

    // 生成简单的 HTML 报告
    const htmlPath = path.join(__dirname, 'public', 'feishu-users.html');
    const timestamp = new Date().toLocaleString('zh-CN');
    
    let html = `
&lt;!DOCTYPE html&gt;
&lt;html lang="zh-CN"&gt;
&lt;head&gt;
    &lt;meta charset="UTF-8"&gt;
    &lt;meta name="viewport" content="width=device-width, initial-scale=1.0"&gt;
    &lt;title&gt;飞书用户报告&lt;/title&gt;
    &lt;style&gt;
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 10px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .stat { background: #f0f0f0; padding: 15px 25px; border-radius: 8px; text-align: center; }
        .stat .num { font-size: 2rem; font-weight: bold; color: #667eea; }
        .stat .label { color: #666; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f8f8; font-weight: 600; }
        tr:hover { background: #f9f9f9; }
        .status-active { color: #155724; background: #d4edda; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; }
        .status-inactive { color: #721c24; background: #f8d7da; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; }
        .no-users { text-align: center; padding: 60px; color: #666; }
        .raw-data { margin-top: 30px; background: #2d2d2d; color: #a5d6ff; padding: 20px; border-radius: 8px; overflow-x: auto; }
        .raw-data pre { margin: 0; font-size: 0.85rem; line-height: 1.5; }
    &lt;/style&gt;
&lt;/head&gt;
&lt;body&gt;
    &lt;div class="container"&gt;
        &lt;h1&gt;👥 飞书用户报告&lt;/h1&gt;
        &lt;p&gt;生成时间: ${timestamp}&lt;/p&gt;
        
        &lt;div class="summary"&gt;
            &lt;div class="stat"&gt;
                &lt;div class="num"&gt;${users.length}&lt;/div&gt;
                &lt;div class="label"&gt;总用户数&lt;/div&gt;
            &lt;/div&gt;
            &lt;div class="stat"&gt;
                &lt;div class="num"&gt;${users.filter(u =&gt; u.status === 'active').length}&lt;/div&gt;
                &lt;div class="label"&gt;活跃用户&lt;/div&gt;
            &lt;/div&gt;
            &lt;div class="stat"&gt;
                &lt;div class="num"&gt;${users.filter(u =&gt; u.status === 'inactive').length}&lt;/div&gt;
                &lt;div class="label"&gt;非活跃用户&lt;/div&gt;
            &lt;/div&gt;
        &lt;/div&gt;
`;

    if (users.length === 0) {
      html += `
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
      `;
    } else {
      html += `
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
      `;
      
      for (const user of users) {
        html += `
                &lt;tr&gt;
                    &lt;td&gt;${user.name || '-'}&lt;/td&gt;
                    &lt;td&gt;${user.enName || '-'}&lt;/td&gt;
                    &lt;td style="font-family: monospace; font-size: 0.85rem;"&gt;${user.unionId || '-'}&lt;/td&gt;
                    &lt;td style="font-family: monospace; font-size: 0.85rem;"&gt;${user.userId || '-'}&lt;/td&gt;
                    &lt;td&gt;${user.email || '-'}&lt;/td&gt;
                    &lt;td&gt;${user.mobile || '-'}&lt;/td&gt;
                    &lt;td&gt;&lt;span class="status-${user.status}"&gt;${user.status === 'active' ? '活跃' : '非活跃'}&lt;/span&gt;&lt;/td&gt;
                &lt;/tr&gt;
        `;
      }
      
      html += `
            &lt;/tbody&gt;
        &lt;/table&gt;
      `;
    }

    html += `
        &lt;div class="raw-data"&gt;
            &lt;h3 style="color: white; margin-top: 0;"&gt;📄 原始数据 (JSON)&lt;/h3&gt;
            &lt;pre&gt;${JSON.stringify(users, null, 2)}&lt;/pre&gt;
        &lt;/div&gt;
    &lt;/div&gt;
&lt;/body&gt;
&lt;/html&gt;
    `;

    fs.writeFileSync(htmlPath, html, 'utf-8');
    console.log(`📄 HTML 报告已保存到: ${htmlPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ 任务完成！');
    console.log('📊 总用户数:', users.length);
    console.log('📄 查看报告: /feishu-users.html');
    console.log('📄 原始数据: /feishu-users-raw.json');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ 发生错误:', error);
    
    const errorLogPath = path.join(__dirname, 'public', 'feishu-error.log');
    fs.writeFileSync(errorLogPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    }, null, 2), 'utf-8');
    
    console.log('📄 错误日志已保存到:', errorLogPath);
    process.exit(1);
  }
}

main();
