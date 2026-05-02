// 飞书个人账号永久配置类型
export interface FeishuPersonalPermanentConfig {
  id: string;
  // 永久配置标记
  isPermanent: boolean;
  // lark-cli 配置目录路径
  larkCliConfigPath: string;
  // 当前授权用户信息
  currentUser: {
    userOpenId: string;
    userName: string;
  };
  // App 配置
  appConfig: {
    appId: string;
    brand: 'feishu' | 'lark';
    lang: string;
  };
  // 授权状态
  authStatus: {
    tokenStatus: 'valid' | 'expired';
    lastAuthTime: number;
  };
  // 功能启用状态
  enabled: boolean;
  // 创建时间
  createdAt: number;
  // 更新时间
  updatedAt: number;
}

// 永久配置默认值
export const DEFAULT_PERMANENT_CONFIG: Partial<FeishuPersonalPermanentConfig> = {
  isPermanent: true,
  larkCliConfigPath: '/root/.lark-cli',
  enabled: true,
};