// 飞书OAuth授权相关类型

export interface FeishuOAuthToken {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  refreshToken: string;
  refreshTokenExpiresAt?: number;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  createdAt: number;
}

export interface FeishuOAuthUserInfo {
  sub: string;
  name: string;
  picture?: string;
  email?: string;
  mobile?: string;
  en_name?: string;
}

export interface FeishuOAuthTokenData {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  refreshToken: string;
  refreshTokenExpiresAt?: number;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  createdAt: number;
}

export interface FeishuOAuthStatus {
  isAuthenticated: boolean;
  token?: FeishuOAuthToken;
  expiresIn?: number;
  isExpiringSoon?: boolean;
}
