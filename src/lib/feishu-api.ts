// 飞书企业应用API服务
// 完整实现飞书自建企业应用功能

const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

// 简单的加密/解密函数（生产环境应该使用更安全的方案）
function encrypt(text: string): string {
  const key = 'feishu_secret_key_2024';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result);
}

function decrypt(encrypted: string): string {
  try {
    const key = 'feishu_secret_key_2024';
    const text = atob(encrypted);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch {
    return encrypted;
  }
}

// Token缓存
interface TokenCache {
  accessToken: string;
  expireTime: number;
}

let tokenCache: TokenCache | null = null;

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  webhookUrl?: string;
}

export interface FeishuUser {
  unionId: string;
  userId: string;
  name: string;
  enName?: string;
  email?: string;
  mobile?: string;
  avatarUrl?: string;
  status: 'active' | 'inactive';
  departmentIds?: string[];
}

export interface FeishuMessage {
  msgId: string;
  chatId?: string;
  receiveId?: string;
}

/**
 * 获取 tenant_access_token
 */
export async function getTenantAccessToken(appId: string, appSecret: string): Promise<string> {
  // 检查缓存
  if (tokenCache && Date.now() < tokenCache.expireTime) {
    console.log('🔐 使用缓存的飞书 token');
    return tokenCache.accessToken;
  }

  console.log('🔐 开始获取飞书 tenant_access_token');
  console.log('📝 App ID:', appId.substring(0, 8) + '...');

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

  console.log('📡 Token API 响应状态:', response.status);
  
  const data = await response.json();
  console.log('📊 Token API 响应数据:', JSON.stringify(data, null, 2));
  
  if (data.code !== 0) {
    throw new Error(`获取飞书token失败: code=${data.code}, msg=${data.msg}`);
  }

  // 缓存token，提前10分钟过期
  tokenCache = {
    accessToken: data.tenant_access_token,
    expireTime: Date.now() + (data.expire - 600) * 1000,
  };

  console.log('✅ 飞书token获取成功，有效期:', data.expire, '秒');
  return data.tenant_access_token;
}

/**
 * 获取企业用户列表
 */
export async function getFeishuUsers(
  appId: string, 
  appSecret: string,
  pageSize: number = 50,
  pageToken?: string
): Promise<{ users: FeishuUser[]; pageToken?: string; hasMore: boolean }> {
  const accessToken = await getTenantAccessToken(appId, appSecret);

  console.log('👥 开始获取飞书用户列表');
  console.log('📄 分页参数:', { pageSize, pageToken });

  let url = `${FEISHU_API_BASE}/contact/v3/users?page_size=${pageSize}`;
  if (pageToken) {
    url += `&page_token=${pageToken}`;
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

  const users: FeishuUser[] = items.map((item: any, index: number) => {
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

  console.log(`✅ 成功解析 ${users.length} 个飞书用户`);
  console.log('📄 分页信息:', {
    pageToken: data.data?.page_token,
    hasMore: data.data?.has_more,
  });

  return {
    users,
    pageToken: data.data?.page_token,
    hasMore: data.data?.has_more || false,
  };
}

/**
 * 获取所有飞书用户（自动分页）
 */
export async function getAllFeishuUsers(appId: string, appSecret: string): Promise<FeishuUser[]> {
  console.log('🚀 开始获取所有飞书用户...');
  
  const allUsers: FeishuUser[] = [];
  let pageToken: string | undefined;
  let hasMore = true;
  let page = 1;

  while (hasMore) {
    console.log(`📄 正在获取第 ${page} 页用户...`);
    
    const result = await getFeishuUsers(appId, appSecret, 50, pageToken);
    allUsers.push(...result.users);
    
    pageToken = result.pageToken;
    hasMore = result.hasMore;
    page++;
    
    console.log(`📊 当前已获取 ${allUsers.length} 个用户`);
  }

  console.log(`🎉 完成！共获取 ${allUsers.length} 个飞书用户`);
  
  // 打印用户列表概览
  console.log('📋 用户列表概览:');
  allUsers.forEach((user, index) => {
    console.log(`  ${index + 1}. ${user.name} (ID: ${user.userId})`);
  });

  return allUsers;
}

/**
 * 根据ID/手机号/姓名查找飞书用户
 */
export async function findFeishuUser(
  appId: string,
  appSecret: string,
  query: { userId?: string; mobile?: string; name?: string }
): Promise<FeishuUser | null> {
  console.log('🔍 开始查找飞书用户，查询条件:', query);
  
  const users = await getAllFeishuUsers(appId, appSecret);

  for (const user of users) {
    if (query.userId && (user.userId === query.userId || user.unionId === query.userId)) {
      console.log('✅ 通过用户ID找到:', user.name);
      return user;
    }
    if (query.mobile && user.mobile === query.mobile) {
      console.log('✅ 通过手机号找到:', user.name);
      return user;
    }
    if (query.name && user.name.includes(query.name)) {
      console.log('✅ 通过姓名找到:', user.name);
      return user;
    }
  }

  console.log('❌ 未找到匹配的用户');
  return null;
}

/**
 * 发送私聊消息
 */
export async function sendFeishuPrivateMessage(
  appId: string,
  appSecret: string,
  receiveId: string,
  content: string
): Promise<FeishuMessage> {
  const accessToken = await getTenantAccessToken(appId, appSecret);

  console.log('📤 开始发送飞书私聊消息');
  console.log('👤 接收者ID:', receiveId);
  console.log('💬 消息内容:', content);

  const response = await fetch(`${FEISHU_API_BASE}/im/v1/messages?receive_id_type=user_id`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receive_id: receiveId,
      msg_type: 'text',
      content: JSON.stringify({ text: content }),
      uuid: Date.now().toString(),
    }),
  });

  console.log('📡 消息API响应状态:', response.status);
  
  const data = await response.json();
  console.log('📊 消息API完整响应:', JSON.stringify(data, null, 2));
  
  if (data.code !== 0) {
    throw new Error(`发送飞书消息失败: code=${data.code}, msg=${data.msg}`);
  }

  console.log('✅ 飞书私聊消息发送成功，消息ID:', data.data.message_id);

  return {
    msgId: data.data.message_id,
    receiveId,
  };
}

/**
 * 发送群聊Webhook消息（保持向后兼容）
 */
export async function sendFeishuWebhookMessage(
  webhookUrl: string,
  content: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('📤 发送飞书群聊Webhook消息');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msg_type: 'text',
        content: {
          text: content,
        },
      }),
    });

    const data = await response.json();

    if (data.code !== 0 && data.StatusCode !== 0) {
      console.error('❌ 飞书Webhook消息发送失败:', data);
      return {
        success: false,
        message: data.msg || data.error || '发送失败',
      };
    }

    console.log('✅ 飞书Webhook消息发送成功');
    return {
      success: true,
      message: '发送成功',
    };
  } catch (error) {
    console.error('❌ 飞书Webhook消息发送异常:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '发送失败',
    };
  }
}

/**
 * 加密App Secret
 */
export function encryptAppSecret(appSecret: string): string {
  return encrypt(appSecret);
}

/**
 * 解密App Secret
 */
export function decryptAppSecret(encryptedAppSecret: string): string {
  return decrypt(encryptedAppSecret);
}

/**
 * 清除token缓存
 */
export function clearTokenCache(): void {
  tokenCache = null;
  console.log('🧹 Token缓存已清除');
}
