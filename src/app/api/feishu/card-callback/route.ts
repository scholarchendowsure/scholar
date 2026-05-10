import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import * as lark from "@larksuiteoapi/node-sdk";

/**
 * 飞书卡片回调接口（使用官方SDK）
 *
 * 配置步骤：
 * 1. 飞书开放平台 → 机器人设置 → 事件订阅
 * 2. 配置请求地址：https://<your-domain>/api/feishu/card-callback
 * 3. 添加事件类型：card.action.trigger
 * 4. 添加事件类型：im.message.receive_v1
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
 * SDK 方式解密飞书加密数据
 */
function decryptWithSDK(encrypt: string): Record<string, unknown> | null {
  try {
    const decrypted = sdkAESCipher.decrypt(encrypt);
    console.log("🔓 SDK 解密结果:", decrypted);
    return JSON.parse(decrypted);
  } catch (e) {
    console.error("❌ SDK 解密失败:", e);
    return null;
  }
}

/**
 * Fallback 方式解密（兼容旧加密格式）
 */
function decryptFallback(encrypt: string): Record<string, unknown> | null {
  try {
    const key = Buffer.from(ENCRYPT_KEY);
    const iv = key.slice(0, 16);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(Buffer.from(encrypt, "base64"));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    const jsonStr = decrypted.toString("utf-8");
    console.log("🔓 Fallback 解密结果:", jsonStr);
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("❌ Fallback 解密失败:", e);
    return null;
  }
}

/**
 * 解密：优先 SDK 方式，失败则 fallback
 */
function decryptPayload(encrypt: string): Record<string, unknown> | null {
  const sdkResult = decryptWithSDK(encrypt);
  if (sdkResult) return sdkResult;
  return decryptFallback(encrypt);
}

/**
 * 合并解密数据到 body
 */
function mergeDecryptedBody(body: Record<string, unknown>): Record<string, unknown> {
  if (typeof body.encrypt === "string") {
    const decrypted = decryptPayload(body.encrypt);
    if (decrypted) {
      Object.assign(body, decrypted);
    }
  }
  return body;
}

/**
 * 提取 challenge（支持多种格式）
 */
function extractChallenge(body: Record<string, unknown>): string {
  if (typeof body.challenge === "string") return body.challenge;
  const event = body.event as Record<string, unknown> | undefined;
  if (typeof event?.challenge === "string") return event.challenge;
  return "";
}

/**
 * 提取 event_type（支持多种格式）
 */
function extractEventType(body: Record<string, unknown>): string {
  if (typeof body.type === "string") return body.type;
  const header = body.header as Record<string, unknown> | undefined;
  if (typeof header?.event_type === "string") return header.event_type;
  const event = body.event as Record<string, unknown> | undefined;
  if (typeof event?.type === "string") return event.type;
  return "";
}

/**
 * 验证 Token
 */
function verifyToken(body: Record<string, unknown>): boolean {
  const token =
    (body.token as string) ||
    (body.header as Record<string, unknown>)?.token ||
    (body.event as Record<string, unknown>)?.token;
  return token === VERIFICATION_TOKEN;
}

/**
 * 处理 URL 验证（使用 SDK generateChallenge）
 */
function handleUrlVerification(body: Record<string, unknown>): Response {
  const challenge = extractChallenge(body);
  if (!challenge) {
    return new NextResponse(
      JSON.stringify({ error: "Missing challenge" }),
      { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  // 使用 SDK 的 generateChallenge 生成响应
  const challengeRes = lark.generateChallenge(body, {
    encryptKey: ENCRYPT_KEY,
  });

  console.log("✅ URL 验证通过，返回 challenge:", challenge);
  return NextResponse.json(challengeRes, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/**
 * 处理卡片按钮点击回调
 */
async function handleCardCallback(body: Record<string, unknown>): Promise<Response> {
  const action = body.action as Record<string, unknown> | undefined;
  const openMessageId = (action?.open_message_id as string) || "";
  const openId = (action?.open_id as string) || "";
  const tag = (action?.tag as string) || "";
  const value = (action?.value as Record<string, unknown>) || {};

  // 提取用户选择的值
  const formValue = (action?.form_value as Record<string, unknown>) || {};

  console.log("🎴 卡片回调:", {
    tag,
    value,
    formValue,
    openId,
    openMessageId,
  });

  // 如果是提交跟进记录
  if (tag === "callback" && value.action === "submit_followup") {
    const caseId = (value.caseId as string) || "";
    const followupMethod = (formValue.followup_method as string) || "其他";
    const followupTarget = (formValue.followup_target as string) || "借款人";
    const contactStatus = (formValue.contact_status as string) || "接通";
    const repaymentWillingness = (formValue.repayment_willingness as string) || "暂无";
    const followupResult = (formValue.followup_result as string) || "暂无结果";

    console.log("📝 跟进记录:", {
      caseId,
      followupMethod,
      followupTarget,
      contactStatus,
      repaymentWillingness,
      followupResult,
    });

    // TODO: 调用案件存储接口保存跟进记录
    // const { addFollowup } = require("../../../../storage/database/case-storage");
    // await addFollowup(caseId, {
    //   type: followupMethod,
    //   content: `跟进对象：${followupTarget}\n联系状态：${contactStatus}\n还款意愿：${repaymentWillingness}\n跟进结果：${followupResult}`,
    //   createdBy: openId,
    // });

    // 返回更新后的卡片内容（显示提交成功）
    const successCard = {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: "plain_text", content: "跟进已提交" },
        template: "green",
      },
      elements: [
        {
          tag: "div",
          text: {
            tag: "plain_text",
            content: `案件编号：${caseId || "未知"}\n跟进方式：${followupMethod}\n跟进结果：${followupResult}\n提交时间：${new Date().toLocaleString("zh-CN")}`,
          },
        },
      ],
    };

    return new NextResponse(
      JSON.stringify({
        toast: { type: "success", content: "跟进记录已提交" },
        card: successCard,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  // 返回默认响应
  return new NextResponse(
    JSON.stringify({
      toast: { type: "info", content: "操作已收到" },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return new NextResponse(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    console.log("📨 飞书回调收到请求:", JSON.stringify(body, null, 2));

    // 解密（如果加密）
    body = mergeDecryptedBody(body);

    // Token 验证
    if (!verifyToken(body)) {
      console.warn("⚠️ Token 验证失败");
      return new NextResponse(
        JSON.stringify({ error: "Token verification failed" }),
        { status: 403, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // 判断事件类型
    const eventType = extractEventType(body);
    console.log("📋 事件类型:", eventType);

    // URL 验证
    if (eventType === "url_verification") {
      return handleUrlVerification(body);
    }

    // 卡片回调
    if (eventType === "card.action.trigger") {
      return handleCardCallback(body);
    }

    // 其他事件类型
    console.log("ℹ️ 未处理的事件类型:", eventType);
    return new NextResponse(
      JSON.stringify({ message: "OK" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("❌ 处理回调失败:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}
