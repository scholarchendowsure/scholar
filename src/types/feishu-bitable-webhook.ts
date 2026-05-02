export interface FeishuBitableWebhookRecord {
  id: string;
  receivedAt: string;
  payload: any;
  processed?: boolean;
  processedAt?: string;
  processResult?: any;
}

export interface FeishuBitableWebhookPayload {
  // 飞书多维表格webhook的标准格式
  challenge?: string;
  type?: string;
  token?: string;
  ts?: string;
  uuid?: string;
  data?: any;
  header?: any;
  event?: any;
}
