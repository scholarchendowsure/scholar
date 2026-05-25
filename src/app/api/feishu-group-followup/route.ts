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
 * 解析群跟进记录
 */
function parseGroupFollowupContent(content: string) {
  try {
    console.log("📝 原始content:", content);
    
    // 先尝试解析content是否是JSON
    let textToParse = content;
    try {
      const parsed = JSON.parse(content);
      console.log("📋 content是JSON格式:", JSON.stringify(parsed, null, 2));
      
      // 如果是数组格式（富文本）
      if (Array.isArray(parsed)) {
        // 遍历数组，提取所有text元素的内容
        const textParts: string[] = [];
        for (const item of parsed) {
          if (item.type === 'text' && item.text) {
            textParts.push(item.text);
          }
        }
        if (textParts.length > 0) {
          textToParse = textParts.join('');
        }
      } 
      // 如果是对象格式，有text字段
      else if (parsed.text) {
        textToParse = parsed.text;
      }
      
      console.log("📝 提取后的纯文本:", textToParse);
    } catch (e) {
      console.log("ℹ️ content不是JSON格式，直接使用");
    }
    
    // 提取用户ID
    const userIdMatch = textToParse.match(/用户ID[：:]\s*(\d+)/);
    const userId = userIdMatch?.[1];
    
    // 提取记录内容 - 更精确的匹配
    // 匹配"记录内容："之后的所有内容，直到遇到换行或结束
    const recordMatch = textToParse.match(/记录内容[：:]\s*([\s\S]*?)(?=\n|$)/);
    let recordContent = recordMatch?.[1]?.trim();
    
    // 清理可能的多余符号和JSON残留
    if (recordContent) {
      // 移除结尾可能多余的 }、]、" 等符号
      recordContent = recordContent.replace(/[}\]"'\s]+$/, '').trim();
      
      // 如果内容看起来像JSON，尝试进一步清理
      if (recordContent.startsWith('{') || recordContent.startsWith('[')) {
        try {
          const jsonParsed = JSON.parse(recordContent);
          if (jsonParsed.text) {
            recordContent = jsonParsed.text;
          }
        } catch {
          // 如果不是有效的JSON，保留原样
        }
      }
    }
    
    console.log("✅ 解析结果 - 用户ID:", userId, "记录内容:", recordContent);
    
    return {
      userId,
      recordContent
    };
  } catch (error) {
    console.error("❌ 解析群跟进记录失败:", error);
    return {
      userId: null,
      recordContent: null
    };
  }
}

/**
 * 提取消息中的图片和文件
 */
function extractMediaFromMessage(event: Record<string, unknown>) {
  try {
    const message = event.message as Record<string, unknown>;
    const content = message.content as string;
    const messageId = message.message_id as string;
    
    if (!content) {
      console.log("ℹ️ 消息内容为空，无媒体提取");
      return { images: [], files: [], messageId };
    }
    
    console.log("📋 开始提取媒体，原始content:", content);
    console.log("📋 消息ID:", messageId);
    
    let images: string[] = [];
    let files: string[] = [];
    
    try {
      const contentJson = JSON.parse(content);
      console.log("📋 解析后的contentJson:", JSON.stringify(contentJson, null, 2));
      
      if (Array.isArray(contentJson)) {
        for (const item of contentJson) {
          console.log("📋 检查元素:", item);
          if (item.tag === "img" && item.image_key) {
            images.push(item.image_key);
            console.log("✅ 找到图片，image_key:", item.image_key);
          } else if (item.tag === "file" && item.file_key) {
            files.push(item.file_key);
            console.log("✅ 找到文件，file_key:", item.file_key);
          }
        }
      }
    } catch (e) {
      console.log("ℹ️ 消息内容不是JSON格式，跳过媒体提取，错误:", e);
    }
    
    console.log("📷 提取完成 - 图片:", images.length, "个, 文件:", files.length, "个");
    console.log("📷 图片列表:", images);
    console.log("📷 文件列表:", files);
    
    return { images, files, messageId };
  } catch (error) {
    console.error("❌ 提取媒体失败:", error);
    return { images: [], files: [], messageId: "" };
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
async function saveFileToStorage(messageId: string, fileKey: string): Promise<{ key: string; url: string } | null> {
  try {
    console.log("📤 开始保存文件，messageId:", messageId, "fileKey:", fileKey);
    
    // 从飞书下载文件 - 使用message_id + file_key方式
    const { buffer, fileName } = await feishuService.downloadMessageResource(messageId, fileKey, "file");
    console.log("✅ 文件下载成功，文件大小:", buffer.length, "字节，文件名:", fileName);
    
    // 上传到对象存储
    const storageKey = await storage.uploadFile({
      fileContent: buffer,
      fileName: `feishu-files/${fileName}`,
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
    
    // 1. 解析消息内容
    const message = event.message as Record<string, unknown>;
    const content = message.content as string;
    const { userId, recordContent } = parseGroupFollowupContent(content);
    
    if (!userId) {
      console.log("❌ 未找到用户ID");
      return { success: false, error: "未找到用户ID" };
    }
    
    if (!recordContent) {
      console.log("❌ 未找到记录内容");
      return { success: false, error: "未找到记录内容" };
    }
    
    // 2. 获取发送者信息
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
        
        // 打印所有飞书用户的openId和姓名（用于调试）
        console.log("📊 飞书用户列表详情:");
        feishuUsers.forEach((user, index) => {
          console.log(`  ${index + 1}. openId: ${user.openId}, name: ${user.name}`);
        });
        
        // 查找openId匹配的用户
        const matchedUser = feishuUsers.find(u => u.openId === senderId);
        
        if (matchedUser) {
          followerName = matchedUser.name;
          console.log("✅ 找到匹配的飞书用户，使用姓名:", followerName);
        } else {
          console.log("❌ 未找到匹配的飞书用户，使用完整senderId:", followerName);
          console.log("💡 提示：请检查飞书用户表中是否有openId为", senderId, "的用户");
        }
      } catch (error) {
        console.log("❌ 获取飞书用户失败，使用完整senderId:", error);
        // 继续使用完整senderId
      }
    } else {
      followerName = "未知用户";
      console.log("❌ 没有senderId，使用默认值");
    }
    
    console.log("✅ 最终跟进人姓名:", followerName);
    
    // 3. 查找用户ID的所有案件
    console.log("🔍 查找用户ID的案件:", userId);
    const allCases = await caseStorage.getAll();
    const userCases = allCases.filter(c => c.userId === userId);
    
    console.log("📋 找到案件数量:", userCases.length);
    
    // 4. 获取chat_id用于回复消息
    const chatId = (event as any)?.chat_id || "";
    console.log("💬 群聊ID:", chatId);
    
    if (userCases.length === 0) {
      console.log("❌ 未找到对应用户ID的案件");
      if (chatId) {
        await sendErrorMessage(chatId, userId);
      }
      return { success: false, error: "未找到对应用户ID的案件" };
    }
    
    // 5. 提取图片和文件
    const { images, files, messageId } = extractMediaFromMessage(event);
    
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
    for (const fileKey of files) {
      const result = await saveFileToStorage(messageId, fileKey);
      if (result) {
        savedFiles.push({
          ...result,
          name: `文件_${Date.now()}`,
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
    if (chatId) {
      const successMessage = `✅ 跟进记录已保存成功！\n用户ID：${userId}\n保存到 ${successCount} 个案件`;
      await sendConfirmationMessage(chatId, successMessage);
    }
    
    return {
      success: true,
      userId,
      caseCount: userCases.length,
      successCount,
      followUp
    };
  } catch (error) {
    console.error("❌ 处理群跟进记录失败:", error);
    return { success: false, error: String(error) };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("📥 收到群跟进记录请求:", JSON.stringify(body, null, 2));
    
    const event = body.event;
    if (!event) {
      return NextResponse.json(
        { success: false, error: "缺少event参数" },
        { status: 400 }
      );
    }
    
    // 异步处理，避免超时
    processGroupFollowup(event);
    
    return NextResponse.json({
      success: true,
      message: "群跟进记录处理中"
    });
  } catch (error) {
    console.error("❌ 群跟进记录API错误:", error);
    return NextResponse.json(
      { success: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
