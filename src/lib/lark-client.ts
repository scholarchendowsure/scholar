import * as lark from "@larksuiteoapi/node-sdk";
import { getFeishuAppCredentials } from "@/storage/database/feishu-config-storage";

let cachedClient: lark.Client | null = null;
let cachedCredentials: { appId: string; appSecret: string } | null = null;

/**
 * 获取飞书 SDK Client 实例
 * 使用环境变量中的 AppID 和 AppSecret
 */
export async function getLarkClient(): Promise<lark.Client> {
  const { appId, appSecret } = await getFeishuAppCredentials();

  if (!appId || !appSecret) {
    throw new Error("飞书 AppID 或 AppSecret 未配置");
  }

  // 如果 credentials 变化，重新创建 client
  if (
    cachedClient &&
    cachedCredentials &&
    cachedCredentials.appId === appId &&
    cachedCredentials.appSecret === appSecret
  ) {
    return cachedClient;
  }

  cachedClient = new lark.Client({
    appId,
    appSecret,
    appType: lark.AppType.SelfBuild,
    domain: lark.Domain.Feishu,
  });
  cachedCredentials = { appId, appSecret };

  return cachedClient;
}

/**
 * 使用 SDK 的 AESCipher 解密飞书加密数据
 */
export function decryptFeishuPayload(encryptKey: string, encrypt: string): Record<string, unknown> {
  const cipher = new lark.AESCipher(encryptKey);
  const decrypted = cipher.decrypt(encrypt);
  return JSON.parse(decrypted);
}

/**
 * 使用 SDK 的 generateChallenge 生成 URL 验证响应
 */
export function generateChallengeResponse(
  challenge: string
): { challenge: string } {
  return { challenge };
}

/**
 * 验证飞书回调 Token
 */
export function verifyFeishuToken(
  body: Record<string, unknown>,
  expectedToken: string
): boolean {
  const token =
    (body.token as string) ||
    (body.header as Record<string, unknown>)?.token ||
    (body.event as Record<string, unknown>)?.token;
  return token === expectedToken;
}

/**
 * 发送飞书消息（使用SDK）
 * 通过 client.request() 发送，避免 SDK 缺少 TypeScript 类型定义的问题
 */
export async function sendMessageWithSDK(params: {
  receiveId: string;
  receiveIdType?: "open_id" | "user_id" | "union_id";
  msgType: string;
  content: string;
}): Promise<{ messageId?: string; error?: string }> {
  try {
    const client = await getLarkClient();
    const resp = await (client as any).request({
      method: "POST",
      url: "/open-apis/im/v1/messages",
      params: {
        receive_id_type: params.receiveIdType || "user_id",
      },
      data: {
        receive_id: params.receiveId,
        msg_type: params.msgType,
        content: params.content,
      },
    });

    if (resp.code !== 0) {
      return { error: resp.msg || `SDK Error: ${resp.code}` };
    }

    return { messageId: resp.data?.message_id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { error: `SDK Request Failed: ${msg}` };
  }
}
