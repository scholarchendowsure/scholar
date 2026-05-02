// 飞书个人账号绑定配置类型
export interface FeishuPersonalAccount {
  id: string;
  userId: string; // 系统用户ID
  feishuUserId?: string; // 飞书用户ID
  feishuName?: string; // 飞书昵称
  accessToken?: string; // 访问令牌
  refreshToken?: string; // 刷新令牌
  tokenExpiresAt?: number; // 令牌过期时间
  isBound: boolean; // 是否已绑定
  createdAt: number;
  updatedAt: number;
}

// 消息发送方式
export type PersonalSendMode = 'cli' | 'personal-app';

// 个人账号配置
export interface FeishuPersonalConfig {
  id: string;
  sendMode: PersonalSendMode;
  cliPath?: string; // lark-cli路径
  createdAt: number;
  updatedAt: number;
}
