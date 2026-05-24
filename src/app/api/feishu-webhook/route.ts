import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import * as lark from "@larksuiteoapi/node-sdk";

/**
 * 飞书事件订阅Webhook
 *
 * 配置步骤：
 * 1. 飞书开放平台 → 机器人设置 → 事件订阅
 * 2. 配置请求地址：https://<your-domain>/api/feishu-webhook
 * 3. 添加事件类型：im.message.receive_v1（接收消息）
 *
 * 加密配置：
 * - Encrypt Key: e9d9f6674ceb517ea5aaf882aabf1a19
 * - Verification Token: fFMKuWHMRQmyT2C2bHN61fAxcBhthsq8
 */

const ENCRYPT_KEY = "e9d9f6674ceb517ea5aaf882aabf1a19";
const VERIFICATION_TOKEN = "fFMKuWHMRQmyT2C2bHN61fAxcBhthsq8";

// SDK AES 解密实例
const sdkAESCipher = new lark.AESCipher(ENCRYPT_KEY);

/**
 * 使用 SDK 方式解密
 */
function decryptWithSDK(encrypt: string): Record<string, unknown> | null {
  try {
    const decrypted = sdkAESCipher.decrypt(encrypt);
    console.log("🔓 SDK 解密成功");
    return JSON.parse(decrypted);
  } catch (e) {
    console.error("❌ SDK 解密失败:", e);
    return null;
  }
}

/**
 * SDK 风格的签名验证
 * 签名内容：timestamp + nonce + encryptKey + rawBody
 */
function verifySignatureSDK(
  rawBody: string,
  timestamp: string,
  nonce: string,
  signature: string
): boolean {
  if (!signature) {
    console.log("ℹ️ 无签名头，跳过验证");
    return true;
  }

  // SDK 的签名计算方式
  const content = timestamp + nonce + ENCRYPT_KEY + rawBody;
  const computed = crypto.createHash("sha256").update(content).digest("hex");

  const match = computed === signature;
  console.log("🔐 SDK 签名验证:", {
    timestamp,
    nonce,
    signatureMatch: match,
  });

  return match;
}

/**
 * 提取 challenge
 */
function extractChallenge(body: Record<string, unknown>): string {
  if (typeof body.challenge === "string") return body.challenge;
  const event = body.event as Record<string, unknown> | undefined;
  if (typeof event?.challenge === "string") return event.challenge;
  return "";
}

/**
 * 规范化事件数据
 */
function normalizeEvent(body: Record<string, unknown>): {
  eventType: string;
  normalizedBody: Record<string, unknown>;
} {
  // schema 2.0 格式处理
  if (body.schema === "2.0") {
    const header = (body.header as Record<string, unknown>) || {};
    const event = (body.event as Record<string, unknown>) || {};
    return {
      eventType: (header.event_type as string) || "",
      normalizedBody: { ...body, ...header, ...event },
    };
  }

  // 老版本格式
  const event = (body.event as Record<string, unknown>) || {};
  const eventType = (body.type as string) || (event.type as string) || "";
  return {
    eventType,
    normalizedBody: { ...body, ...event },
  };
}

/**
 * 检查是否是@消息
 */
function isMentionMessage(event: Record<string, unknown>): boolean {
  try {
    const message = event.message as Record<string, unknown>;
    const mentions = message?.mentions as Array<unknown> | undefined;
    
    if (mentions && Array.isArray(mentions) && mentions.length > 0) {
      console.log("🎯 检测到@消息，mentions数量:", mentions.length);
      return true;
    }
    return false;
  } catch (e) {
    console.error("❌ 检查@消息失败:", e);
    return false;
  }
}

/**
 * 提取用户ID从消息内容中
 */
function extractUserIdFromMessage(event: Record<string, unknown>): string | null {
  try {
    const message = event.message as Record<string, unknown>;
    const content = message?.content as string;
    
    if (!content) {
      console.log("ℹ️ 消息内容为空");
      return null;
    }

    // 解析消息内容
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch {
      // 如果不是JSON格式，直接使用原始内容
      parsedContent = { text: content };
    }

    const text = parsedContent.text || parsedContent.elements?.[0]?.text?.content || "";
    console.log("📝 消息文本:", text);

    // 提取用户ID（纯数字，5-8位）
    const userIdMatch = text.match(/\b(\d{5,8})\b/);
    if (userIdMatch) {
      const userId = userIdMatch[1];
      console.log("✅ 提取到用户ID:", userId);
      return userId;
    }

    console.log("ℹ️ 未找到用户ID");
    return null;
  } catch (e) {
    console.error("❌ 提取用户ID失败:", e);
    return null;
  }
}

/**
 * 处理@消息
 */
async function handleMentionMessage(event: Record<string, unknown>) {
  try {
    console.log("🎯 开始处理@消息");

    // 提取用户ID
    const userId = extractUserIdFromMessage(event);
    if (!userId) {
      console.log("ℹ️ 未提取到用户ID，不处理");
      return;
    }

    // 提取发送者信息
    const sender = event.sender as Record<string, unknown>;
    const senderId = (sender?.sender_id as any)?.open_id as string;
    console.log("👤 发送者Open ID:", senderId);

    // 调用@消息处理API
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || "http://localhost:5000";
    const mentionApiUrl = `${domain}/api/feishu-mention`;

    console.log("🔗 调用@消息处理API:", mentionApiUrl);

    const response = await fetch(mentionApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
        senderOpenId: senderId,
        event: event,
      }),
    });

    const result = await response.json();
    console.log("✅ @消息处理完成:", result);
  } catch (error) {
    console.error("❌ 处理@消息失败:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 读取原始请求体
    const rawBody = await request.text();
    console.log("📥 收到飞书webhook请求，原始长度:", rawBody.length);

    // 获取头部信息
    const timestamp = request.headers.get("x-lark-request-timestamp") || "";
    const nonce = request.headers.get("x-lark-request-nonce") || "";
    const signature = request.headers.get("x-lark-signature") || "";

    // 验证签名
    if (!verifySignatureSDK(rawBody, timestamp, nonce, signature)) {
      return NextResponse.json(
        { success: false, error: "签名验证失败" },
        { status: 401 }
      );
    }

    // 解析请求体
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error("❌ JSON解析失败:", e);
      return NextResponse.json(
        { success: false, error: "JSON解析失败" },
        { status: 400 }
      );
    }

    console.log("📦 解析后的请求体:", JSON.stringify(body, null, 2));

    // 检查是否有加密字段
    if (body.encrypt) {
      console.log("🔐 检测到加密数据，开始解密");
      const decrypted = decryptWithSDK(body.encrypt as string);
      if (decrypted) {
        body = decrypted;
        console.log("✅ 解密后的请求体:", JSON.stringify(body, null, 2));
      }
    }

    // 处理URL验证
    const challenge = extractChallenge(body);
    if (challenge) {
      console.log("🔗 URL验证，返回challenge:", challenge);
      return NextResponse.json({ challenge });
    }

    // 规范化事件
    const { eventType, normalizedBody } = normalizeEvent(body);
    console.log("🎯 事件类型:", eventType);

    // 处理接收消息事件
    if (eventType === "im.message.receive_v1") {
      console.log("📨 收到消息事件");

      // 检查是否是@消息
      if (isMentionMessage(normalizedBody)) {
        // 异步处理@消息，避免超时
        handleMentionMessage(normalizedBody);
      }
    }

    // 立即返回成功响应给飞书
    return NextResponse.json({
      success: true,
      message: "事件接收成功",
    });
  } catch (error) {
    console.error("❌ 处理飞书webhook失败:", error);
    return NextResponse.json(
      { success: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
