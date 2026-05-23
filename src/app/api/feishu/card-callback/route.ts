import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import * as lark from "@larksuiteoapi/node-sdk";
import { caseStorage } from '@/storage/database/case-storage';
import type { FollowUp } from '@/types/case';

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
 * 规范化事件数据（参考 SDK 的 parse 方法）
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
 * 飞书选项值映射到系统选项值
 */
function mapFeishuOptions(formValue: Record<string, unknown>) {
  // 跟进方式映射
  const followUpMethodMap: Record<string, string> = {
    'phone': 'online',
    'wechat': 'online',
    'email': 'online',
    'meeting': 'offline'
  };
  
  // 跟进对象映射
  const followUpObjectMap: Record<string, string> = {
    'self': 'legal_representative',
    'family': 'actual_controller',
    'agent': 'other'
  };
  
  // 跟进结果映射
  const followUpResultMap: Record<string, string> = {
    'repaid': 'normal_repayment',
    'promised': 'warning_rise',
    'follow_up_again': 'overdue_promise',
    'refused': 'other'
  };

  // 联系状态映射（显示文本）
  const contactStatusMap: Record<string, string> = {
    'contacted': '已联系',
    'uncontacted': '未联系',
    'unreachable': '无法联系'
  };

  const followUpRemark = (formValue.follow_up_remark as string) || '';
  const contactStatus = formValue.contact_status as string;
  const contactStatusText = contactStatusMap[contactStatus] || '';
  
  // 构造最终的记录内容：联系状态 + 输入框内容
  let finalFollowRecord = followUpRemark;
  if (contactStatusText) {
    finalFollowRecord = contactStatusText + (followUpRemark ? '：' + followUpRemark : '');
  }

  return {
    followType: followUpMethodMap[formValue.follow_up_method as string] || 'other',
    contact: followUpObjectMap[formValue.follow_up_object as string] || 'other',
    followResult: followUpResultMap[formValue.follow_up_result as string] || 'other',
    followRecord: finalFollowRecord
  };
}

/**
 * 处理卡片按钮点击回调
 */
async function handleCardCallback(body: Record<string, unknown>): Promise<Response> {
  console.log("🔍 handleCardCallback 收到的完整body:", JSON.stringify(body, null, 2));
  
  // 尝试从多个位置提取action
  let action = body.action as Record<string, unknown> | undefined;
  if (!action) {
    action = (body as any).event?.action;
  }
  if (!action) {
    action = (body as any).header?.action;
  }
  
  console.log("🎯 提取到的action:", action);
  
  if (!action) {
    console.error("❌ 无法找到action数据");
    return new NextResponse(
      JSON.stringify({
        toast: { type: "error", content: "无法找到action数据" },
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
  
  const openMessageId = (action?.open_message_id as string) || "";
  const openId = (action?.open_id as string) || "";
  const tag = (action?.tag as string) || "";
  
  // 提取按钮的value（包含case_id和operator信息）
  let value: Record<string, unknown> = {};
  try {
    const rawValue = action?.value as string;
    console.log("📝 原始value:", rawValue);
    if (rawValue && typeof rawValue === 'string') {
      // 尝试去除多余的转义
      let cleanValue = rawValue;
      if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
        cleanValue = cleanValue.slice(1, -1);
        cleanValue = cleanValue.replace(/\\"/g, '"');
      }
      value = JSON.parse(cleanValue);
    } else {
      value = (action?.value as Record<string, unknown>) || {};
    }
  } catch (e) {
    console.error("❌ 解析value失败:", e);
    value = (action?.value as Record<string, unknown>) || {};
  }

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
  if (tag === "button" || tag === "submit_button") {
    const caseId = (value.case_id as string) || "";
    const operatorIdFromValue = (value.operator_id as string) || "system";
    const operatorNameFromValue = (value.operator_name as string) || "系统";
    const followerNameFromValue = (value.follower_name as string) || operatorNameFromValue;

    if (!caseId) {
      console.error("❌ 缺少案件ID");
      return new NextResponse(
        JSON.stringify({
          toast: { type: "error", content: "缺少案件ID" },
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

    // 使用follower_name作为跟进人（贷后系统中选择的提醒接收人）
    const operatorId = operatorIdFromValue;
    const operatorName = followerNameFromValue;

    console.log(`👤 使用跟进人信息: ${operatorName} (ID: ${operatorId})`);

    // 映射飞书选项到系统选项
    const mappedData = mapFeishuOptions(formValue);

    console.log("📝 跟进记录数据:", {
      caseId,
      operatorId,
      operatorName,
      ...mappedData,
    });

    // 保存跟进记录到数据库 - 直接使用本地存储
    let saveSuccess = false;
    let syncedToSameUserCount = 0;
    let syncedToBitableCount = 0;
    let caseDataForSync: any = null;
    let followupRecordForSync: FollowUp | null = null;
    
    try {
      // 1. 获取当前案件
      const caseData = await caseStorage.getById(caseId);
      if (!caseData) {
        console.error("❌ 案件不存在:", caseId);
      } else {
        caseDataForSync = caseData;
        
        // 2. 构造跟进记录
        const followupRecord: FollowUp = {
          id: Date.now().toString(),
          follower: operatorName,
          followTime: new Date().toISOString(),
          followType: mappedData.followType as any,
          contact: mappedData.contact as any,
          followResult: mappedData.followResult as any,
          followRecord: mappedData.followRecord || '',
          fileInfo: undefined,
          createdAt: new Date().toISOString(),
          createdBy: operatorName,
        };
        
        followupRecordForSync = followupRecord;

        // 3. 添加跟进记录到当前案件
        const updatedFollowups = [...(caseData.followups || []), followupRecord];
        console.log(`[Feishu Callback] 添加跟进记录到案件 ${caseId}, 原有${caseData.followups?.length || 0}条, 新增后${updatedFollowups.length}条`);
        await caseStorage.update(caseId, { followups: updatedFollowups });
        
        // 4. 同步到相同用户ID的所有案件
        if (caseData.userId) {
          const relatedCases = await caseStorage.getByUserId(caseData.userId);
          const otherCases = relatedCases.filter(c => c.id !== caseId);
          
          for (const relatedCase of otherCases) {
            try {
              const relatedFollowups = [...(relatedCase.followups || []), followupRecord];
              await caseStorage.update(relatedCase.id, { followups: relatedFollowups });
              syncedToSameUserCount++;
              console.log(`✅ 已同步到案件 ${relatedCase.id}`);
            } catch (err) {
              console.error(`❌ 同步跟进记录到案件 ${relatedCase.id} 失败:`, err);
            }
          }
        }
        
        saveSuccess = true;
        console.log("✅ 跟进记录已保存到数据库");
      }
    } catch (error) {
      console.error("❌ 保存跟进记录出错:", error);
    }
    
    // 5. 同步到飞书多维表格
    if (saveSuccess && caseDataForSync && followupRecordForSync) {
      try {
        console.log("📋 开始同步到飞书多维表格...");
        const response = await fetch('http://localhost:5000/api/feishu-bitable/followup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            followup: followupRecordForSync,
            caseData: caseDataForSync
          }),
        });
        
        const result = await response.json();
        if (result.success) {
          syncedToBitableCount = result.successCount || 0;
          console.log(`✅ 已同步到 ${syncedToBitableCount} 个飞书多维表格`);
        } else {
          console.warn("⚠️ 同步到飞书多维表格失败:", result);
        }
      } catch (bitableError) {
        console.error("❌ 同步到飞书多维表格出错:", bitableError);
      }
    }

    // 返回更新后的卡片内容（显示提交成功）
    const syncMessages: string[] = [];
    if (syncedToSameUserCount > 0) {
      syncMessages.push(`已同步到 ${syncedToSameUserCount} 个相关案件`);
    }
    if (syncedToBitableCount > 0) {
      syncMessages.push(`已同步到 ${syncedToBitableCount} 个飞书多维表格`);
    }
    
    const successCard = {
      schema: "2.0",
      config: { wide_screen_mode: true },
      header: {
        title: { tag: "plain_text", content: saveSuccess ? "✅ 跟进已提交" : "⚠️ 提交失败" },
        template: saveSuccess ? "green" : "red",
      },
      body: {
        elements: [
          {
            tag: "div",
            text: {
              tag: "lark_md",
              content: `**案件编号：** ${caseId}\n\n**跟进方式：** ${mappedData.followType}\n\n**跟进对象：** ${mappedData.contact}\n\n**跟进结果：** ${mappedData.followResult}\n\n**跟进备注：** ${mappedData.followRecord || '无'}\n\n---\n\n**提交人：** ${operatorName}\n**提交时间：** ${new Date().toLocaleString("zh-CN")}${syncMessages.length > 0 ? `\n\n**同步信息：**\n${syncMessages.map(m => '- ' + m).join('\n')}` : ''}`,
            },
          },
        ],
      }
    };

    // 构造toast消息
    let toastContent = saveSuccess ? "跟进记录已提交" : "提交失败，请稍后重试";
    if (saveSuccess) {
      const toastSyncParts: string[] = [];
      if (syncedToSameUserCount > 0) {
        toastSyncParts.push(`同步到${syncedToSameUserCount}个案件`);
      }
      if (syncedToBitableCount > 0) {
        toastSyncParts.push(`同步到${syncedToBitableCount}个多维表格`);
      }
      if (toastSyncParts.length > 0) {
        toastContent = `跟进记录已提交，${toastSyncParts.join('、')}`;
      }
    }
    
    return new NextResponse(
      JSON.stringify({
        toast: { 
          type: saveSuccess ? "success" : "error", 
          content: toastContent
        },
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
    // 获取原始 body 字符串
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

    console.log("📨 飞书回调收到请求体(前500字符):", rawBody.substring(0, 500));

    // SDK 风格的签名验证：headers 从请求体中获取
    const headers = (body.headers as Record<string, string>) || {};
    const timestamp = headers["x-lark-request-timestamp"] || "";
    const nonce = headers["x-lark-request-nonce"] || "";
    const signature = headers["x-lark-signature"] || "";

    // 签名验证
    if (!verifySignatureSDK(rawBody, timestamp, nonce, signature)) {
      console.warn("⚠️ SDK 签名验证失败");
      return new NextResponse(
        JSON.stringify({ error: "Signature verification failed" }),
        { status: 403, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // 解密（如果加密）
    if (typeof body.encrypt === "string") {
      const decrypted = decryptWithSDK(body.encrypt);
      if (decrypted) {
        Object.assign(body, decrypted);
        console.log("🔓 解密后数据已合并");
      }
    }

    // 规范化事件数据
    const { eventType, normalizedBody } = normalizeEvent(body);
    console.log("📋 事件类型:", eventType);
    console.log("📦 完整normalizedBody:", JSON.stringify(normalizedBody, null, 2));

    // URL 验证
    if (eventType === "url_verification" || body.type === "url_verification") {
      return handleUrlVerification(normalizedBody);
    }

    // 先尝试提取action和tag，用于更宽松的匹配
    let actionForCheck: any = null;
    let tagForCheck: string | null = null;
    try {
      actionForCheck = body.action || (body as any).event?.action || (body as any).header?.action;
      tagForCheck = actionForCheck?.tag || null;
    } catch {}

    // 卡片回调 - 更宽松的匹配
    if (eventType === "card.action.trigger" || 
        (normalizedBody.header as any)?.event_type === "card.action.trigger" ||
        (body.header as any)?.event_type === "card.action.trigger" ||
        (normalizedBody.event as any)?.type === "card.action.trigger" ||
        (body.event as any)?.type === "card.action.trigger" ||
        (actionForCheck && (tagForCheck === "button" || tagForCheck === "submit_button"))) {
      console.log("🎯 检测到卡片回调事件，开始处理");
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
