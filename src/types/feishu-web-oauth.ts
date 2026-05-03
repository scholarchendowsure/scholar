// 飞书网页应用OAuth授权相关类型定义

export interface FeishuWebOAuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
  tokenType: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  userEmail?: string;
  createdAt: number;
  refreshTokenExpiresAt?: number;
}

// 存储的完整数据
export interface FeishuWebOAuthTokenData extends FeishuWebOAuthToken {
  // 扩展字段
}
