// Coze API 类型定义

export interface CozeApiConfig {
  id: string;
  apiKey: string;
  botId?: string;
  webhookUrl?: string;
  isEnabled: boolean;
  createdAt: number;
  updatedAt: number;
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
