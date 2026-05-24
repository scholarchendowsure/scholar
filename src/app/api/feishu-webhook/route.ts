import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import * as lark from "@larksuiteoapi/node-sdk";
import { FeishuService } from "@/lib/feishu-service";
import { caseStorage } from "@/storage/database/case-storage";
import { getFeishuUsers } from "@/storage/database/feishu-user-storage";
import { FollowUp } from "@/types/case";
import { v4 as uuidv4 } from "uuid";

const feishuService = new FeishuService();

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
 * 先尝试JSON解析，再提取信息
 */
function parseEverything(content: string) {
  console.log("🔍 开始解析，原始content:", content);
  
  let userId: string | undefined;
  let recordContent = '';
  const imageKeys: string[] = [];
  
  // 首先尝试JSON解析content
  let parsedContent: any = null;
  try {
    parsedContent = JSON.parse(content);
    console.log("✅ content JSON解析成功");
  } catch (e) {
    console.log("ℹ️ content不是JSON，用原始字符串处理");
  }
  
  // 从content中提取所有text元素
  const allTexts: string[] = [];
  
  if (parsedContent && parsedContent.content) {
    // 从JSON结构中提取
    const contentArray = parsedContent.content;
    if (Array.isArray(contentArray)) {
      for (const line of contentArray) {
        if (Array.isArray(line)) {
          for (const element of line) {
            if (element.tag === 'text' && element.text) {
              allTexts.push(element.text);
            }
            if (element.tag === 'img' && element.image_key) {
              imageKeys.push(element.image_key);
            }
          }
        }
      }
    }
  } else {
    // 从原始字符串中提取
    // 先提取所有文本
    const textRegex = /"tag":"text","text":"([^"]+)"/g;
    let textMatch;
    while ((textMatch = textRegex.exec(content)) !== null) {
      if (textMatch[1]) {
        allTexts.push(textMatch[1]);
      }
    }
    
    // 再提取所有image_key
    const imageKeyRegex = /"image_key"\s*:\s*"([^"]+)"/g;
    let imageMatch;
    while ((imageMatch = imageKeyRegex.exec(content)) !== null) {
      if (imageMatch[1]) {
        imageKeys.push(imageMatch[1]);
      }
    }
  }
  
  console.log("📝 提取到的所有文本:", allTexts);
  
  // 从提取的文本中查找用户ID和记录内容
  const fullText = allTexts.join(' ');
  console.log("📋 合并后的文本:", fullText);
  
  // 提取用户ID
  const userIdMatch = fullText.match(/用户ID[：:]\s*(\d+)/);
  userId = userIdMatch?.[1];
  
  // 提取记录内容
  for (const text of allTexts) {
    if (text.includes('记录内容：')) {
      recordContent = text.replace('记录内容：', '').trim();
      break;
    }
  }
  
  console.log("✅ 最终解析结果:");
  console.log("  用户ID:", userId);
  console.log("  记录内容:", recordContent);
  console.log("  图片keys:", imageKeys);
  
  return { userId, recordContent, imageKeys };
}

/**
 * 下载并保存图片（base64）
 */
async function downloadAndSaveImage(imageKey: string): Promise<{ id: string; name: string; type: 'image'; url: string; data: string } | null> {
  try {
    console.log("📷 开始下载图片:", imageKey);
    
    // 从飞书下载图片
    const { buffer, fileName } = await feishuService.downloadImage(imageKey);
    console.log("✅ 图片下载成功，大小:", buffer.length, "字节");
    
    // 转换为base64
    const base64Data = buffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Data}`;
    
    const result = {
      id: uuidv4(),
      name: fileName || `图片_${Date.now()}.jpg`,
      type: 'image' as const,
      url: dataUrl,
      data: dataUrl
    };
    
    console.log("✅ 图片处理完成:", result.name);
    return result;
  } catch (error) {
    console.error("❌ 下载图片失败:", imageKey, error);
    return null;
  }
}

/**
 * 发送确认消息到飞书群
 */
async function sendConfirmationMessage(chatId: string, message: string) {
  try {
    const accessToken = await feishuService.getTenantAccessToken();
    
    const content = {
      text: message
    };
    
    const response = await fetch(
      `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          receive_id: chatId,
          msg_type: "text",
          content: JSON.stringify(content)
        })
      }
    );
    
    const result = await response.json();
    console.log("📤 发送确认消息结果:", result);
    return result;
  } catch (error) {
    console.error("❌ 发送确认消息失败:", error);
  }
}

/**
 * 处理群跟进记录（直接处理，不调用内部API）
 */
async function processGroupFollowupDirect(event: Record<string, unknown>) {
  try {
    console.log("🎯 开始处理群跟进记录");
    console.log("📋 完整事件:", JSON.stringify(event, null, 2));
    
    // 1. 获取message_id和content
    const message = event.message as Record<string, unknown>;
    const messageId = message.message_id as string;
    const content = message.content as string;
    console.log("🆔 Message ID:", messageId);
    
    if (!content) {
      console.log("❌ 没有content");
      return { success: false, error: "没有content" };
    }
    
    // 2. 解析所有信息 - 用最简单粗暴的方式直接从原始字符串提取
    console.log("📄 Message完整结构:", JSON.stringify(message, null, 2));
    console.log("🔍 开始解析content，原始长度:", content.length);
    console.log("🔍 content原始内容:", content);
    
    // 直接从原始字符串中提取用户ID
    const userIdMatch = content.match(/用户ID[：:]\s*(\d+)/);
    const userId = userIdMatch?.[1];
    console.log("🆔 提取到的用户ID:", userId);
    
    // 直接从原始字符串中提取记录内容
    let recordContent = '';
    const recordContentMatch = content.match(/记录内容[：:]([^"{}\[\]]+)/);
    if (recordContentMatch && recordContentMatch[1]) {
      recordContent = recordContentMatch[1].trim();
    }
    console.log("📝 提取到的记录内容:", recordContent);
    
    // 直接从原始字符串中提取所有image_key
    const imageKeys: string[] = [];
    const imageKeyRegex = /"image_key"\s*:\s*"([^"]+)"/g;
    let imageMatch;
    while ((imageMatch = imageKeyRegex.exec(content)) !== null) {
      if (imageMatch[1]) {
        imageKeys.push(imageMatch[1]);
        console.log("🖼️ 提取到图片key:", imageMatch[1]);
      }
    }
    
    console.log("✅ 最终解析结果:");
    console.log("  用户ID:", userId);
    console.log("  记录内容:", recordContent);
    console.log("  图片keys:", imageKeys);
    console.log("  图片数量:", imageKeys.length);
    
    if (!userId) {
      console.log("❌ 未找到用户ID");
      return { success: false, error: "未找到用户ID" };
    }
    
    if (!recordContent) {
      console.log("❌ 未找到记录内容");
      return { success: false, error: "未找到记录内容" };
    }
    
    // 3. 获取发送者信息
    const sender = event.sender as Record<string, unknown>;
    const senderId = (sender?.sender_id as any)?.open_id as string;
    console.log("👤 发送者Open ID:", senderId);
    
    // 获取跟进人姓名
    let followerName = senderId || "未知用户";
    if (senderId) {
      try {
        const feishuUsers = await getFeishuUsers();
        const matchedUser = feishuUsers.find(u => u.openId === senderId);
        if (matchedUser) {
          followerName = matchedUser.name;
          console.log("✅ 找到匹配的飞书用户:", followerName);
        }
      } catch (error) {
        console.log("❌ 获取飞书用户失败:", error);
      }
    }
    
    // 4. 查找案件
    const allCases = await caseStorage.getAll();
    const userCases = allCases.filter(c => c.userId === userId);
    console.log("📋 找到案件数量:", userCases.length);
    
    if (userCases.length === 0) {
      console.log("❌ 未找到对应用户ID的案件");
      const chatId = (event as any)?.chat_id || "";
      if (chatId) {
        const errorMessage = "目前该案件未录入案件库，存在贷后未介入情况，请联系管理员：高乐，核实具体情况";
        await sendConfirmationMessage(chatId, errorMessage);
      }
      return { success: false, error: "未找到对应用户ID的案件" };
    }
    
    // 5. 下载图片
    console.log("🖼️ 开始下载图片，共", imageKeys.length, "张");
    const savedFiles: any[] = [];
    
    for (const imageKey of imageKeys) {
      const result = await downloadAndSaveImage(imageKey);
      if (result) {
        savedFiles.push(result);
      }
    }
    
    console.log("✅ 图片下载完成，共保存:", savedFiles.length, "张");
    
    // 6. 创建跟进记录
    console.log("📝 创建跟进记录...");
    const now = new Date().toISOString();
    
    const followUp: FollowUp = {
      id: uuidv4(),
      follower: followerName,
      followTime: now,
      followType: "other" as any,
      contact: "other" as any,
      followResult: "other" as any,
      followRecord: recordContent,
      fileInfo: savedFiles.map(f => ({
        ...f,
        uploadTime: now,
        uploadBy: followerName
      })),
      createdAt: now,
      createdBy: followerName
    };
    
    console.log("✅ 跟进记录创建完成:");
    console.log("  跟进人:", followUp.follower);
    console.log("  记录内容:", followUp.followRecord);
    console.log("  文件数量:", followUp.fileInfo?.length || 0);
    if (followUp.fileInfo && followUp.fileInfo.length > 0) {
      console.log("  文件详情:");
      followUp.fileInfo.forEach((file, index) => {
        if (typeof file === 'object' && file !== null) {
          console.log(`    ${index + 1}. 名称: ${file.name}, 类型: ${file.type}, 有数据: ${!!file.data}`);
        }
      });
    }
    
    // 7. 保存到所有案件
    let successCount = 0;
    for (const userCase of userCases) {
      try {
        const existingFollowups = userCase.followups || [];
        const updatedCase = {
          ...userCase,
          followups: [...existingFollowups, followUp]
        };
        
        await caseStorage.update(updatedCase.id, updatedCase, { skipHistory: true });
        successCount++;
        console.log("✅ 跟进记录已保存到案件:", userCase.id);
      } catch (error) {
        console.error("❌ 保存跟进记录失败:", error);
      }
    }
    
    // 8. 发送确认消息
    const chatId = (event as any)?.chat_id || "";
    if (chatId) {
      const successMessage = `✅ 跟进记录已保存成功！\n用户ID：${userId}\n保存到 ${successCount} 个案件\n图片：${savedFiles.length} 张`;
      await sendConfirmationMessage(chatId, successMessage);
    }
    
    return { success: true, followUp, successCount };
  } catch (error) {
    console.error("❌ 处理群跟进记录失败:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * 处理@消息
 */
async function handleMentionMessage(event: Record<string, unknown>) {
  try {
    console.log("🎯 开始处理@消息");

    // 提取用户ID
    const message = event.message as Record<string, unknown>;
    const content = message?.content as string;
    
    let userId = null;
    if (content) {
      // 解析消息内容
      let parsedContent;
      try {
        parsedContent = JSON.parse(content);
      } catch {
        parsedContent = { text: content };
      }
      
      const text = parsedContent.text || parsedContent.elements?.[0]?.text?.content || "";
      console.log("📝 消息文本:", text);
      
      // 提取用户ID（纯数字，5-8位）
      const userIdMatch = text.match(/\b(\d{5,8})\b/);
      if (userIdMatch) {
        userId = userIdMatch[1];
        console.log("✅ 提取到用户ID:", userId);
      }
    }
    
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
    console.log("📦 ==================== 完整webhook消息开始 ====================");
    console.log("📦 完整rawBody:", rawBody);
    console.log("📦 ==================== 完整webhook消息结束 ====================");
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
        console.log("🤖 检测到@消息");
        console.log("📋 完整事件结构:", JSON.stringify(normalizedBody, null, 2));
        
        // 检查是否是群跟进记录格式
        const message = normalizedBody.message as Record<string, unknown>;
        const content = message.content as string;
        console.log("📝 消息内容:", content);
        
        const isGroupFollowup = content.includes('用户ID：') && content.includes('记录内容：');
        console.log("🔍 是否群跟进记录格式:", isGroupFollowup);
        
        if (isGroupFollowup) {
          console.log("🎯 检测到群跟进记录格式，开始直接处理...");
          console.log("✅ 测试1 - 这里能执行到！");
          console.log("✅ 测试2 - content长度:", content.length);
          
          // ==================== 直接在这里处理，不调用任何函数 ====================
          console.log("🚀 ========== 开始直接处理群跟进记录 ==========");
          
          // 1. 提取所有信息 - 直接从原始content中提取
          console.log("📝 原始content:", content);
          
          // 提取用户ID
          const userIdMatch = content.match(/用户ID[：:]\s*(\d+)/);
          const userId = userIdMatch?.[1];
          console.log("🆔 提取到的用户ID:", userId);
          
          // 提取记录内容
          let recordContent = '';
          const recordKeyword = '记录内容：';
          const recordIndex = content.indexOf(recordKeyword);
          if (recordIndex !== -1) {
            const afterRecord = content.substring(recordIndex + recordKeyword.length);
            const endIndex = afterRecord.search(/[{}\[\]"']/);
            recordContent = (endIndex === -1 ? afterRecord : afterRecord.substring(0, endIndex)).trim();
          }
          console.log("📝 提取到的记录内容:", recordContent);
          
          // 提取所有image_key
          const imageKeys: string[] = [];
          const imageKeyRegex = /"image_key"\s*:\s*"([^"]+)"/g;
          let imageMatch;
          while ((imageMatch = imageKeyRegex.exec(content)) !== null) {
            if (imageMatch[1]) {
              imageKeys.push(imageMatch[1]);
              console.log("🖼️ 提取到图片key:", imageMatch[1]);
            }
          }
          
          console.log("✅ 提取结果汇总:");
          console.log("  用户ID:", userId);
          console.log("  记录内容:", recordContent);
          console.log("  图片keys:", imageKeys);
          console.log("  图片数量:", imageKeys.length);
          
          if (!userId) {
            console.log("❌ 未找到用户ID");
          } else if (!recordContent) {
            console.log("❌ 未找到记录内容");
          } else {
            console.log("✅ 信息提取成功，继续处理...");
            
            // 2. 获取发送者信息
            const sender = normalizedBody.sender as Record<string, unknown>;
            const senderId = (sender?.sender_id as any)?.open_id as string;
            console.log("👤 发送者Open ID:", senderId);
            
            // 获取跟进人姓名
            let followerName = senderId || "未知用户";
            if (senderId) {
              try {
                const feishuUsers = await getFeishuUsers();
                const matchedUser = feishuUsers.find(u => u.openId === senderId);
                if (matchedUser) {
                  followerName = matchedUser.name;
                  console.log("✅ 找到匹配的飞书用户:", followerName);
                }
              } catch (error) {
                console.log("❌ 获取飞书用户失败:", error);
              }
            }
            
            // 3. 查找案件
            const allCases = await caseStorage.getAll();
            const userCases = allCases.filter(c => c.userId === userId);
            console.log("📋 找到案件数量:", userCases.length);
            
            if (userCases.length === 0) {
              console.log("❌ 未找到对应用户ID的案件");
              const chatId = (normalizedBody as any)?.chat_id || "";
              if (chatId) {
                const errorMessage = "目前该案件未录入案件库，存在贷后未介入情况，请联系管理员：高乐，核实具体情况";
                await sendConfirmationMessage(chatId, errorMessage);
              }
            } else {
              // 4. 下载图片
              console.log("🖼️ 开始下载图片，共", imageKeys.length, "张");
              const savedFiles: any[] = [];
              
              for (const imageKey of imageKeys) {
                try {
                  console.log("📷 开始下载图片:", imageKey);
                  const { buffer, fileName } = await feishuService.downloadImage(imageKey);
                  console.log("✅ 图片下载成功，大小:", buffer.length, "字节");
                  
                  const base64Data = buffer.toString('base64');
                  const dataUrl = `data:image/jpeg;base64,${base64Data}`;
                  
                  savedFiles.push({
                    id: uuidv4(),
                    name: fileName || `图片_${Date.now()}.jpg`,
                    type: 'image' as const,
                    url: dataUrl,
                    data: dataUrl
                  });
                  console.log("✅ 图片处理完成");
                } catch (error) {
                  console.error("❌ 下载图片失败:", imageKey, error);
                }
              }
              
              console.log("✅ 图片下载完成，共保存:", savedFiles.length, "张");
              
              // 5. 创建跟进记录
              console.log("📝 创建跟进记录...");
              const now = new Date().toISOString();
              
              const followUp: FollowUp = {
                id: uuidv4(),
                follower: followerName,
                followTime: now,
                followType: "other" as any,
                contact: "other" as any,
                followResult: "other" as any,
                followRecord: recordContent,
                fileInfo: savedFiles.map(f => ({
                  ...f,
                  uploadTime: now,
                  uploadBy: followerName
                })),
                createdAt: now,
                createdBy: followerName
              };
              
              console.log("✅ 跟进记录创建完成:");
              console.log("  跟进人:", followUp.follower);
              console.log("  记录内容:", followUp.followRecord);
              console.log("  文件数量:", followUp.fileInfo?.length || 0);
              
              // 6. 保存到所有案件
              let successCount = 0;
              for (const userCase of userCases) {
                try {
                  const existingFollowups = userCase.followups || [];
                  const updatedCase = {
                    ...userCase,
                    followups: [...existingFollowups, followUp]
                  };
                  
                  await caseStorage.update(updatedCase.id, updatedCase, { skipHistory: true });
                  successCount++;
                  console.log("✅ 跟进记录已保存到案件:", userCase.id);
                } catch (error) {
                  console.error("❌ 保存跟进记录失败:", error);
                }
              }
              
              // 7. 发送确认消息
              const chatId = (normalizedBody as any)?.chat_id || "";
              if (chatId) {
                const successMessage = `✅ 跟进记录已保存成功！\n用户ID：${userId}\n保存到 ${successCount} 个案件\n图片：${savedFiles.length} 张`;
                await sendConfirmationMessage(chatId, successMessage);
              }
            }
          }
          
          console.log("🏁 ========== 群跟进记录处理完成 ==========");
          // ==================== 直接处理结束 ====================
          
        } else {
          console.log("💬 普通@消息，开始处理...");
          // 异步处理普通@消息，避免超时
          handleMentionMessage(normalizedBody);
        }
      } else {
        console.log("❌ 不是@消息，跳过处理");
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
