import { NextRequest, NextResponse } from "next/server";
import { FeishuService } from "@/lib/feishu-service";
import { caseStorage } from "@/storage/database/case-storage";
import { getFeishuUsers } from "@/storage/database/feishu-user-storage";
import { FollowUp } from "@/types/case";
import { v4 as uuidv4 } from "uuid";
import { S3Storage } from "coze-coding-dev-sdk";

const feishuService = new FeishuService();

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

/**
 * 统一解析飞书消息，提取文本、图片、文件和消息ID
 */
function parseFeishuMessage(event: Record<string, unknown>) {
  try {
    const message = event.message as Record<string, unknown>;
    const messageId = message.message_id as string;
    const messageType = message.message_type as string;
    const contentStr = message.content as string;
    
    console.log("📋 原始消息内容:", contentStr);
    console.log("📋 消息ID:", messageId);
    console.log("📋 消息类型:", messageType);
    
    let text = "";
    let images: string[] = [];
    let files: Array<{ fileKey: string; fileName: string }> = [];
    
    try {
      const content = JSON.parse(contentStr);
      console.log("📋 解析后的content:", JSON.stringify(content, null, 2));
      
      // 情况1：富文本（文字+图片）- 数组格式
      if (Array.isArray(content)) {
        for (const node of content) {
          if (node.tag === "text" && node.text) {
            text += node.text;
          }
          if (node.tag === "img" && node.image_key) {
            images.push(node.image_key);
            console.log("✅ 找到图片，image_key:", node.image_key);
          }
          if (node.tag === "file" && node.file_key) {
            files.push({
              fileKey: node.file_key,
              fileName: node.file_name || "文件"
            });
            console.log("✅ 找到文件，file_key:", node.file_key);
          }
        }
      }
      // 情况2：纯文本
      else if (messageType === "text" && content.text) {
        text = content.text;
      }
      // 情况3：纯图片
      else if (messageType === "image" && content.image_key) {
        images.push(content.image_key);
        console.log("✅ 找到纯图片，image_key:", content.image_key);
      }
      // 情况4：纯文件
      else if (messageType === "file" && content.file_key) {
        files.push({
          fileKey: content.file_key,
          fileName: content.file_name || "文件"
        });
        console.log("✅ 找到纯文件，file_key:", content.file_key);
      }
      
    } catch (e) {
      console.log("ℹ️ content不是JSON格式，直接使用作为文本");
      text = contentStr;
    }
    
    console.log("📝 提取完成 - 文本:", text);
    console.log("📝 提取完成 - 图片:", images.length, "个", images);
    console.log("📝 提取完成 - 文件:", files.length, "个", files);
    
    return { text, images, files, messageId };
  } catch (error) {
    console.error("❌ 解析飞书消息失败:", error);
    return { text: "", images: [], files: [], messageId: "" };
  }
}

/**
 * 从文本中提取用户ID和记录内容
 */
function extractUserAndRecord(text: string) {
  try {
    console.log("🔍 从文本中提取信息:", text);
    
    // 提取用户ID
    const userIdMatch = text.match(/用户ID[：:]\s*(\d+)/);
    const userId = userIdMatch?.[1];
    
    // 提取记录内容 - 匹配"记录内容："之后的所有内容，直到遇到结束
    const recordMatch = text.match(/记录内容[：:]\s*([\s\S]*)/);
    let recordContent = recordMatch?.[1]?.trim();
    
    // 清理可能的多余符号
    if (recordContent) {
      // 移除结尾可能多余的 }、]、" 等符号
      recordContent = recordContent.replace(/[}\]"'\s]+$/, '').trim();
    }
    
    console.log("✅ 提取结果 - 用户ID:", userId, "记录内容:", recordContent);
    
    return { userId, recordContent };
  } catch (error) {
    console.error("❌ 提取用户和记录信息失败:", error);
    return { userId: null, recordContent: null };
  }
}

/**
 * 保存图片到对象存储
 */
async function saveImageToStorage(messageId: string, imageKey: string): Promise<{ key: string; url: string } | null> {
  try {
    console.log("📤 开始保存图片，messageId:", messageId, "imageKey:", imageKey);
    
    // 从飞书下载图片 - 使用message_id + file_key方式
    const { buffer, fileName } = await feishuService.downloadMessageResource(messageId, imageKey, "image");
    console.log("✅ 图片下载成功，文件大小:", buffer.length, "字节，文件名:", fileName);
    
    // 上传到对象存储
    const storageKey = await storage.uploadFile({
      fileContent: buffer,
      fileName: `feishu-images/${fileName}`,
      contentType: "image/jpeg"
    });
    
    console.log("✅ 图片上传成功，storageKey:", storageKey);
    
    // 生成访问URL
    const url = await storage.generatePresignedUrl({
      key: storageKey,
      expireTime: 86400 * 365 // 1年有效期
    });
    
    console.log("✅ 图片URL生成成功");
    
    return { key: storageKey, url };
  } catch (error) {
    console.error("❌ 保存图片失败:", error);
    return null;
  }
}

/**
 * 保存文件到对象存储
 */
async function saveFileToStorage(messageId: string, fileKey: string, fileName: string): Promise<{ key: string; url: string } | null> {
  try {
    console.log("📤 开始保存文件，messageId:", messageId, "fileKey:", fileKey, "fileName:", fileName);
    
    // 从飞书下载文件 - 使用message_id + file_key方式
    const { buffer, fileName: downloadedFileName } = await feishuService.downloadMessageResource(messageId, fileKey, "file");
    console.log("✅ 文件下载成功，文件大小:", buffer.length, "字节，文件名:", downloadedFileName);
    
    // 上传到对象存储
    const storageKey = await storage.uploadFile({
      fileContent: buffer,
      fileName: `feishu-files/${downloadedFileName || fileName}`,
      contentType: "application/octet-stream"
    });
    
    console.log("✅ 文件上传成功，storageKey:", storageKey);
    
    // 生成访问URL
    const url = await storage.generatePresignedUrl({
      key: storageKey,
      expireTime: 86400 * 365 // 1年有效期
    });
    
    console.log("✅ 文件URL生成成功");
    
    return { key: storageKey, url };
  } catch (error) {
    console.error("❌ 保存文件失败:", error);
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
 * 发送错误消息到飞书群
 */
async function sendErrorMessage(chatId: string, userId: string) {
  const errorMessage = "目前该案件未录入案件库，存在贷后未介入情况，请联系管理员：高乐，核实具体情况";
  return sendConfirmationMessage(chatId, errorMessage);
}

/**
 * 处理群跟进记录
 */
async function processGroupFollowup(event: Record<string, unknown>) {
  try {
    console.log("🎯 开始处理群跟进记录");
    
    // 1. 统一解析消息
    const { text, images, files: fileInfos, messageId } = parseFeishuMessage(event);
    
    // 2. 从文本中提取用户ID和记录内容
    const { userId, recordContent } = extractUserAndRecord(text);
    
    if (!userId) {
      console.log("❌ 未找到用户ID");
      return { success: false, error: "未找到用户ID" };
    }
    
    if (!recordContent) {
      console.log("❌ 未找到记录内容");
      return { success: false, error: "未找到记录内容" };
    }
    
    // 3. 获取发送者信息
    console.log("📨 完整事件结构:", JSON.stringify(event, null, 2));
    
    const sender = event.sender as Record<string, unknown>;
    console.log("👤 发送者信息:", JSON.stringify(sender, null, 2));
    
    const senderId = (sender?.sender_id as any)?.open_id as string;
    console.log("👤 发送者Open ID:", senderId);
    
    // 根据senderId（openId）在飞书用户中查找匹配
    let followerName = senderId || "未知用户";
    
    if (senderId) {
      try {
        console.log("🔍 在飞书用户中查找匹配，openId:", senderId);
        
        // 获取所有飞书用户
        const feishuUsers = await getFeishuUsers();
        console.log("📋 飞书用户列表数量:", feishuUsers.length);
        
        // 查找openId匹配的用户
        const matchedUser = feishuUsers.find(u => u.openId === senderId);
        
        if (matchedUser) {
          followerName = matchedUser.name;
          console.log("✅ 找到匹配的飞书用户，使用姓名:", followerName);
        } else {
          console.log("❌ 未找到匹配的飞书用户，使用完整senderId:", followerName);
        }
      } catch (error) {
        console.log("❌ 获取飞书用户失败，使用完整senderId:", error);
      }
    }
    
    console.log("✅ 最终跟进人姓名:", followerName);
    
    // 4. 查找用户ID的所有案件
    console.log("🔍 查找用户ID的案件:", userId);
    const allCases = await caseStorage.getAll();
    const userCases = allCases.filter(c => c.userId === userId);
    
    console.log("📋 找到案件数量:", userCases.length);
    
    // 5. 获取chat_id用于回复消息
    const chatId = (event as any)?.chat_id || "";
    console.log("💬 群聊ID:", chatId);
    
    if (userCases.length === 0) {
      console.log("❌ 未找到对应用户ID的案件");
      if (chatId) {
        await sendErrorMessage(chatId, userId);
      }
      return { success: false, error: "未找到对应用户ID的案件" };
    }
    
    // 6. 保存图片和文件到对象存储
    const savedFiles: Array<{ key: string; url: string; name: string; type: 'image' | 'file' }> = [];
    
    // 保存图片
    for (const imageKey of images) {
      const result = await saveImageToStorage(messageId, imageKey);
      if (result) {
        savedFiles.push({
          ...result,
          name: `图片_${Date.now()}.jpg`,
          type: 'image'
        });
      }
    }
    
    // 保存文件
    for (const fileInfo of fileInfos) {
      const result = await saveFileToStorage(messageId, fileInfo.fileKey, fileInfo.fileName);
      if (result) {
        savedFiles.push({
          ...result,
          name: fileInfo.fileName || `文件_${Date.now()}`,
          type: 'file'
        });
      }
    }
    
    console.log("✅ 保存文件完成，共保存:", savedFiles.length, "个文件");
    
    // 7. 创建跟进记录
    const followUpId = uuidv4();
    const now = new Date().toISOString();
    
    const followUp: FollowUp = {
      id: followUpId,
      follower: followerName,
      followTime: now,
      followType: "other" as any,
      contact: "other" as any,
      followResult: "other" as any,
      followRecord: recordContent,
      fileInfo: savedFiles.map(f => ({
        id: uuidv4(),
        name: f.name,
        type: f.type === 'image' ? 'image' : 'document',
        url: f.url,
        uploadTime: now,
        uploadBy: followerName
      })),
      createdAt: now,
      createdBy: followerName
    };
    
    console.log("📝 创建跟进记录:", followUp);
    
    // 8. 保存到所有案件
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
      } catch (error) {
        console.error("❌ 更新案件失败:", error);
      }
    }
    
    console.log("✅ 成功更新案件数量:", successCount);
    
    // 9. 发送确认消息
    if (chatId) {
      const confirmMessage = `跟进记录已成功保存！\n用户ID: ${userId}\n跟进人: ${followerName}\n记录内容: ${recordContent}\n附件: ${savedFiles.length}个`;
      await sendConfirmationMessage(chatId, confirmMessage);
    }
    
    return { success: true, savedCount: successCount };
  } catch (error) {
    console.error("❌ 处理群跟进记录失败:", error);
    return { success: false, error: String(error) };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("📨 收到飞书群跟进请求:", JSON.stringify(body, null, 2));
    
    const event = body.event || body;
    const result = await processGroupFollowup(event);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ 处理飞书群跟进请求失败:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}