export interface FollowupWebhookRecord {
  id: string;
  receivedAt: string;
  payload: any;
  processed?: boolean;
  processedAt?: string;
  processResult?: any;
}

export interface FollowupWebhookPayload {
  用户ID?: string;
  贷款单号?: string;
  记录人?: string;
  跟进类型?: string;
  联系人?: string;
  跟进结果?: string;
  记录内容?: string;
  文件信息?: any;
  // 支持挑战验证
  challenge?: string;
}
