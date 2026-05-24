import { NextRequest, NextResponse } from 'next/server';
import { caseStorage } from '@/storage/database/case-storage';
import { getFeishuUsers } from '@/storage/database/feishu-user-storage';
import { FeishuService } from '@/lib/feishu-service';
import { FollowUp } from '@/types/case';
import { v4 as uuidv4 } from 'uuid';

const feishuService = new FeishuService();

/**
 * 直接用正则提取所有信息
 */
function parseEverything(content: string) {
  console.log("🔍 ========== parseEverything 开始 ==========");
  console.log("🔍 content长度:", content.length);
  console.log("🔍 content完整内容:", content);
  
  // 1. 提取用户ID
  const userIdMatch = content.match(/用户ID[：:]\s*(\d+)/);
  const userId = userIdMatch?.[1];
  console.log("✅ 用户ID提取结果:", userId);
  
  // 2. 提取记录内容
  let recordContent = '';
  const recordKeyword = '记录内容：';
  const recordIndex = content.indexOf(recordKeyword);
  if (recordIndex !== -1) {
    const afterRecord = content.substring(recordIndex + recordKeyword.length);
    // 截取到第一个 { 或 [ 或 " 之前
    const endIndex = afterRecord.search(/[{}\[\]"']/);
    recordContent = (endIndex === -1 ? afterRecord : afterRecord.substring(0, endIndex)).trim();
  }
  console.log("✅ 记录内容提取结果:", recordContent);
  
  // 3. 提取所有image_key - 用多种方式尝试
  const imageKeys: string[] = [];
  
  console.log("🔍 开始提取图片keys...");
  
  // 方式1: 标准格式 "image_key":"xxx"
  console.log("🔍 方式1: 寻找 \"image_key\":\"xxx\"");
  const imageKeyRegex1 = /"image_key"\s*:\s*"([^"]+)"/g;
  let match1;
  let count1 = 0;
  while ((match1 = imageKeyRegex1.exec(content)) !== null) {
    if (match1[1]) {
      imageKeys.push(match1[1]);
      count1++;
      console.log("✅ 方式1找到图片key:", match1[1]);
    }
  }
  console.log("🔍 方式1共找到:", count1, "个");
  
  // 方式2: img_v3_开头的
  console.log("🔍 方式2: 寻找 img_v3_ 开头的");
  const imageKeyRegex2 = /(img_v3_[0-9a-fA-F-]+)/g;
  let match2;
  let count2 = 0;
  while ((match2 = imageKeyRegex2.exec(content)) !== null) {
    if (match2[1] && !imageKeys.includes(match2[1])) {
      imageKeys.push(match2[1]);
      count2++;
      console.log("✅ 方式2找到图片key:", match2[1]);
    }
  }
  console.log("🔍 方式2共找到:", count2, "个");
  
  console.log("✅ ========== parseEverything 最终结果 ==========");
  console.log("  用户ID:", userId);
  console.log("  记录内容:", recordContent);
  console.log("  图片keys总数量:", imageKeys.length);
  console.log("  图片keys列表:", imageKeys);
  
  return { userId, recordContent, imageKeys };
}

/**
 * 下载并保存图片（base64）
 */
async function downloadAndSaveImage(imageKey: string): Promise<{ id: string; name: string; type: 'image'; url: string; data: string } | null> {
  try {
    console.log("📷 ========== 开始下载图片 ==========");
    console.log("📷 图片key:", imageKey);
    
    // 从飞书下载图片
    const { buffer, fileName } = await feishuService.downloadImage(imageKey);
    console.log("✅ 图片下载成功，大小:", buffer.length, "字节");
    console.log("✅ 文件名:", fileName);
    
    // 转换为base64
    const base64Data = buffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Data}`;
    console.log("✅ base64转换完成，长度:", base64Data.length);
    
    const result = {
      id: uuidv4(),
      name: fileName || `图片_${Date.now()}.jpg`,
      type: 'image' as const,
      url: dataUrl,
      data: dataUrl
    };
    
    console.log("✅ ========== 图片处理完成 ==========");
    console.log("✅ 文件名:", result.name);
    console.log("✅ 文件类型:", result.type);
    console.log("✅ 有数据:", !!result.data);
    
    return result;
  } catch (error) {
    console.error("❌ ========== 下载图片失败 ==========");
    console.error("❌ 图片key:", imageKey);
    console.error("❌ 错误:", error);
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
 * 处理群跟进记录
 */
async function processGroupFollowup(event: Record<string, unknown>) {
  try {
    console.log("🎯 ========== 开始处理群跟进记录 ==========");
    console.log("🎯 完整事件:", JSON.stringify(event, null, 2));
    
    // 1. 获取消息内容
    const message = (event as any)?.message || event;
    console.log("📝 提取到的message:", JSON.stringify(message, null, 2));
    
    const content = message.content as string;
    console.log("📝 提取到的content:", content);
    
    if (!content) {
      console.log("❌ 没有content");
      return { success: false, error: "没有content" };
    }
    
    console.log("📝 ========== 开始解析content ==========");
    
    // 2. 解析所有信息
    const { userId, recordContent, imageKeys } = parseEverything(content);
    
    console.log("📝 ========== 解析完成 ==========");
    console.log("📝 最终用户ID:", userId);
    console.log("📝 最终记录内容:", recordContent);
    console.log("📝 最终图片keys:", imageKeys);
    
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
    console.log("🖼️ ========== 开始下载图片 ==========");
    console.log("🖼️ 待下载图片数量:", imageKeys.length);
    const savedFiles: any[] = [];
    
    for (let i = 0; i < imageKeys.length; i++) {
      const imageKey = imageKeys[i];
      console.log(`🖼️ 正在下载第 ${i + 1}/${imageKeys.length} 张图片...`);
      const result = await downloadAndSaveImage(imageKey);
      if (result) {
        savedFiles.push(result);
        console.log(`✅ 第 ${i + 1}/${imageKeys.length} 张图片下载成功`);
      } else {
        console.log(`❌ 第 ${i + 1}/${imageKeys.length} 张图片下载失败`);
      }
    }
    
    console.log("✅ ========== 图片下载完成 ==========");
    console.log("✅ 成功保存图片数量:", savedFiles.length);
    console.log("✅ 保存的图片列表:", savedFiles.map(f => f.name));
    
    // 6. 创建跟进记录
    console.log("📝 ========== 创建跟进记录 ==========");
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
    
    console.log("✅ ========== 跟进记录创建完成 ==========");
    console.log("✅ 跟进人:", followUp.follower);
    console.log("✅ 记录内容:", followUp.followRecord);
    console.log("✅ 文件数量:", followUp.fileInfo?.length || 0);
    if (followUp.fileInfo && followUp.fileInfo.length > 0) {
      console.log("✅ 文件详情:");
      followUp.fileInfo.forEach((file, index) => {
        if (typeof file === 'object' && file !== null) {
          console.log(`    ${index + 1}. 名称: ${file.name}, 类型: ${file.type}, 有数据: ${!!file.data}`);
        }
      });
    }
    
    // 7. 保存到所有案件
    console.log("💾 ========== 保存跟进记录到案件 ==========");
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
    
    console.log("💾 ========== 保存完成 ==========");
    console.log("💾 成功保存到", successCount, "个案件");
    
    // 8. 发送确认消息
    const chatId = (event as any)?.chat_id || "";
    if (chatId) {
      const successMessage = `✅ 跟进记录已保存成功！\n用户ID：${userId}\n保存到 ${successCount} 个案件\n图片：${savedFiles.length} 张`;
      await sendConfirmationMessage(chatId, successMessage);
    }
    
    console.log("🏆 ========== 群跟进记录处理完成 ==========");
    return { success: true, followUp, successCount };
  } catch (error) {
    console.error("❌ ========== 处理群跟进记录失败 ==========");
    console.error("❌ 错误:", error);
    return { success: false, error: String(error) };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("📥 ========== 收到群跟进记录请求 ==========");
    console.log("📥 请求body:", JSON.stringify(body, null, 2));
    
    const event = body.event;
    if (!event) {
      console.log("❌ 缺少event参数");
      return NextResponse.json(
        { success: false, error: "缺少event参数" },
        { status: 400 }
      );
    }
    
    console.log("📥 ========== 开始异步处理 ==========");
    // 异步处理，避免超时
    processGroupFollowup(event);
    
    console.log("📥 ========== 返回响应 ==========");
    return NextResponse.json({ success: true, message: "已接收请求，正在处理中" });
  } catch (error) {
    console.error("❌ ========== 群跟进记录API错误 ==========");
    console.error("❌ 错误:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
