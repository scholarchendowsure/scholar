// 验证码存储 - 基于内存的存储

// 验证码类型
interface Captcha {
  id: string;
  answer: string;
  expires: number;
}

// 内存存储
let captchas: Map<string, Captcha> = new Map();

export const captchaStorage = {
  /**
   * 保存验证码
   */
  saveCaptcha: (id: string, answer: string, ttl: number): void => {
    const expires = Date.now() + ttl;
    captchas.set(id, { id, answer, expires });
    
    // 清理过期的验证码
    const now = Date.now();
    for (const [key, value] of captchas.entries()) {
      if (value.expires < now) {
        captchas.delete(key);
      }
    }
  },

  /**
   * 获取验证码
   */
  getCaptcha: (id: string): Captcha | undefined => {
    const captcha = captchas.get(id);
    if (captcha && captcha.expires > Date.now()) {
      return captcha;
    }
    return undefined;
  },

  /**
   * 删除验证码
   */
  deleteCaptcha: (id: string): void => {
    captchas.delete(id);
  }
};
