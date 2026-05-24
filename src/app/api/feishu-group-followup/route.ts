import { NextRequest, NextResponse } from "next/server";
import { FeishuService } from "@/lib/feishu-service";
import { caseStorage } from "@/storage/database/case-storage";
import { FollowUp } from "@/types/case";
import { v4 as uuidv4 } from "uuid";

const feishuService = new FeishuService();

/**
 * 解析群跟进记录
 */
function parseGroupFollowupContent(content: string) {
  try {
    console.log("📝 解析内容:", content);
    
    // 提取用户ID
    const userIdMatch = content.match(/用户ID[：:]\s*(\d+)/);
    const userId = userIdMatch?.[1];
    
    // 提取记录内容
    const recordMatch = content.match(/记录内容[：:]\s*(.+?)(?=\n|$)/);
    const recordContent = recordMatch?.[1]?.trim();
    
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
    
    if (!content) {
      return { images: [], files: [] };
    }
    
    let images: string[] = [];
    let files: string[] = [];
    
    try {
      const contentJson = JSON.parse(content);
      if (Array.isArray(contentJson)) {
        for (const item of contentJson) {
          if (item.type === "image" && item.image_key) {
            images.push(item.image_key);
          } else if (item.type === "file" && item.file_key) {
            files.push(item.file_key);
          }
        }
      }
    } catch (e) {
      console.log("ℹ️ 消息内容不是JSON格式，跳过媒体提取");
    }
    
    console.log("📷 提取到图片:", images.length, "个, 文件:", files.length, "个");
    return { images, files };
  } catch (error) {
    console.error("❌ 提取媒体失败:", error);
    return { images: [], files: [] };
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
    
    // 先尝试从sender中直接获取姓名
    let followerName = "未知用户";
    
    // 尝试多种方式获取发送者姓名
    if (sender) {
      // 方式1: 直接从sender中获取
      const directName = (sender as any)?.name;
      if (directName) {
        followerName = directName;
        console.log("📛 直接从sender获取姓名:", followerName);
      }
      
      // 方式2: 尝试从sender_id中获取
      const senderIdObj = sender.sender_id as any;
      if (senderIdObj?.name) {
        followerName = senderIdObj.name;
        console.log("📛 从sender_id获取姓名:", followerName);
      }
      
      // 方式3: 尝试调用飞书API获取
      if (senderId && followerName === "未知用户") {
        try {
          const userInfo = await feishuService.getUserInfo(senderId);
          followerName = userInfo?.name || "未知用户";
          console.log("📛 从飞书API获取姓名:", followerName);
        } catch (error) {
          console.log("❌ 获取发送者信息失败:", error);
        }
      }
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
    const { images, files } = extractMediaFromMessage(event);
    
    // 6. 创建跟进记录
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
      fileInfo: [], // TODO: 后续实现文件下载
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
