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
 * 解密飞书加密数据
 */
function decryptPayload(encrypt: string): Record<string, unknown> | null {
  try {
    const decrypted = sdkAESCipher.decrypt(encrypt);
    console.log("🔓 SDK 解密成功:", decrypted.substring(0, 200));
    return JSON.parse(decrypted);
  } catch (e) {
    console.error("❌ SDK 解密失败:", e);
    return null;
  }
}

/**
 * 验证飞书请求签名
 * 参考：https://open.feishu.cn/document/ukTMukTMukTM/uYDNxYjL2QTM24iN0EjN/event-subscription-configure-/encrypt-key
 */
function verifySignature(
  rawBody: string,
  timestamp: string,
  nonce: string,
  signature: string
): boolean {
  if (!ENCRYPT_KEY) return true;
  if (!signature) {
    console.log("ℹ️ 无签名头，跳过签名验证");
    return true;
  }

  const content = timestamp + nonce + ENCRYPT_KEY + rawBody;
  const computed = crypto.createHash("sha256").update(content).digest("hex");

  console.log("🔐 签名验证:", {
    timestamp,
    nonce,
    signaturePrefix: signature.substring(0, 16) + "...",
    computedPrefix: computed.substring(0, 16) + "...",
    match: computed === signature,
  });

  return computed === signature;
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
 * 提取并规范化事件数据
 * 支持 schema 2.0 和老版本格式
 */
function normalizeEvent(body: Record<string, unknown>): {
  eventType: string;
  normalizedBody: Record<string, unknown>;
} {
  // schema 2.0 格式
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
  const eventType =
    (body.type as string) || (event.type as string) || "";
  return {
    eventType,
    normalizedBody: { ...body, ...event },
  };
}

/**
 * 处理 URL 验证
 */
function handleUrlVerification(body: Record<string, unknown>): Response {
  const challenge = extractChallenge(body);
  if (!challenge) {
    return new NextResponse(
      JSON.stringify({ error: "Missing challenge" }),
      { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  // 直接返回 challenge，不要包装在 isChallenge 中
  console.log("✅ URL 验证通过，返回 challenge:", challenge);
  return NextResponse.json(
    { challenge },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
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

  // 如果是提交跟进记录（按钮 tag 为 "button"）
  if (tag === "button" && value.action === "submit_followup") {
    const caseId = (value.case_id as string) || "";
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
    // 获取原始 body 字符串用于签名验证
    const rawBody = await request.text();
    let body: Record<string, unknown>;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return new NextResponse(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    console.log("📨 飞书回调收到请求体:", rawBody.substring(0, 500));

    // 获取签名相关头
    const timestamp = request.headers.get("x-lark-request-timestamp") || "";
    const nonce = request.headers.get("x-lark-request-nonce") || "";
    const signature = request.headers.get("x-lark-signature") || "";

    // 签名验证
    if (!verifySignature(rawBody, timestamp, nonce, signature)) {
      console.warn("⚠️ 签名验证失败");
      return new NextResponse(
        JSON.stringify({ error: "Signature verification failed" }),
        { status: 403, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // 解密（如果加密）
    if (typeof body.encrypt === "string") {
      const decrypted = decryptPayload(body.encrypt);
      if (decrypted) {
        Object.assign(body, decrypted);
        console.log("🔓 解密后数据:", JSON.stringify(decrypted).substring(0, 500));
      } else {
        return new NextResponse(
          JSON.stringify({ error: "Failed to decrypt request" }),
          { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
        );
      }
    }

    // 规范化事件数据
    const { eventType, normalizedBody } = normalizeEvent(body);
    console.log("📋 事件类型:", eventType);

    // URL 验证
    if (eventType === "url_verification" || body.type === "url_verification") {
      return handleUrlVerification(normalizedBody);
    }

    // 卡片回调
    if (eventType === "card.action.trigger") {
      return handleCardCallback(normalizedBody);
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
