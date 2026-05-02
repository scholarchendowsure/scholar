// Coze API 类型定义

export interface CozeApiConfig {
  id: string;
  apiKey: string;
  botId?: string;
  webhookUrl?: string;
  isEnabled: boolean;
  createdAt: number;
  updatedAt: number;
  enabled?: boolean;
}

export interface CozeMessageRequest {
  receiveId: string; // 飞书用户 open_id
  message: string; // 消息内容
  receiveIdType?: 'open_id' | 'user_id' | 'union_id'; // 接收人ID类型
  msgType?: 'text' | 'post' | 'image' | 'file' | 'card'; // 消息类型
}

export interface CozeMessageResponse {
  success: boolean;
  messageId?: string;
  data?: any;
  error?: string;
}

export interface CozeSendReminderRequest {
  caseId?: string; // 案件ID（可选）
  customerName?: string; // 客户姓名
  overdueAmount?: number; // 逾期金额
  overdueDays?: number; // 逾期天数
  receiveId: string; // 接收人 open_id
  reminderType?: 'overdue' | 'due' | 'followup'; // 提醒类型
  customMessage?: string; // 自定义消息（可选）
}

// Coze 聊天 API 类型
export interface CozeChatRequest {
  userId: string; // 用户ID（用于会话跟踪）
  userMessage: string; // 用户消息
  conversationId?: string | null; // 会话ID（可选）
  additionalMessages?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>; // 额外的历史消息
}

export interface CozeChatResponse {
  success: boolean;
  content: string; // Bot 的回复内容
  conversationId: string; // 会话ID
  error?: string;
  rawResponse?: any;
}
