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
    return tokenCache.accessToken;
  }

  console.log('🔐 获取飞书 tenant_access_token');

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
  
  if (data.code !== 0) {
    throw new Error(`获取飞书token失败: ${data.msg}`);
  }

  // 缓存token，提前10分钟过期
  tokenCache = {
    accessToken: data.tenant_access_token,
    expireTime: Date.now() + (data.expire - 600) * 1000,
  };

  console.log('✅ 飞书token获取成功');
  return data.tenant_access_token;
}

/**
 * 获取企业用户列表
 */
export async function getFeishuUsers(
  appId: string, 
  appSecret: string,
  pageSize: number = 100,
  pageToken?: string
): Promise<{ users: FeishuUser[]; pageToken?: string; hasMore: boolean }> {
  const accessToken = await getTenantAccessToken(appId, appSecret);

  console.log('👥 获取飞书用户列表');

  let url = `${FEISHU_API_BASE}/contact/v3/users?page_size=${pageSize}`;
  if (pageToken) {
    url += `&page_token=${pageToken}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(`获取飞书用户列表失败: ${data.msg}`);
  }

  const users: FeishuUser[] = (data.data?.items || []).map((item: any) => ({
    unionId: item.union_id,
    userId: item.user_id || item.open_id,
    name: item.name,
    enName: item.en_name,
    email: item.email,
    mobile: item.mobile,
    avatarUrl: item.avatar?.avatar_72 || item.avatar?.avatar_240,
    status: item.status?.is_frozen ? 'inactive' : 'active',
    departmentIds: item.department_ids,
  }));

  console.log(`✅ 成功获取 ${users.length} 个飞书用户`);

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
  const allUsers: FeishuUser[] = [];
  let pageToken: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await getFeishuUsers(appId, appSecret, 100, pageToken);
    allUsers.push(...result.users);
    pageToken = result.pageToken;
    hasMore = result.hasMore;
  }

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
  const users = await getAllFeishuUsers(appId, appSecret);

  for (const user of users) {
    if (query.userId && (user.userId === query.userId || user.unionId === query.userId)) {
      return user;
    }
    if (query.mobile && user.mobile === query.mobile) {
      return user;
    }
    if (query.name && user.name.includes(query.name)) {
      return user;
    }
  }

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

  console.log(`📤 发送飞书私聊消息给: ${receiveId}`);

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
    }),
  });

  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(`发送飞书消息失败: ${data.msg}`);
  }

  console.log('✅ 飞书私聊消息发送成功');

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
}
