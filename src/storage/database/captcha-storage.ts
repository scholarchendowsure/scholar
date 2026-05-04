import fs from 'fs';
import path from 'path';

// 验证码类型
interface Captcha {
  id: string;
  answer: string;
  expires: number;
}

// 文件存储路径
const CAPTCHA_STORAGE_PATH = path.join(process.cwd(), 'public', 'data', 'captcha-storage.json');

// 内存缓存（提高性能）
let captchas: Map<string, Captcha> = new Map();

// 初始化：从文件加载
function initialize() {
  try {
    if (fs.existsSync(CAPTCHA_STORAGE_PATH)) {
      const data = fs.readFileSync(CAPTCHA_STORAGE_PATH, 'utf-8');
      const storedCaptchas = JSON.parse(data) as Record<string, Captcha>;
      
      captchas = new Map();
      const now = Date.now();
      for (const [id, captcha] of Object.entries(storedCaptchas)) {
        if (captcha.expires > now) {
          captchas.set(id, captcha);
        }
      }
    }
  } catch (error) {
    console.error('初始化验证码存储失败:', error);
  }
}

// 保存到文件
function saveToFile() {
  try {
    // 确保目录存在
    const dir = path.dirname(CAPTCHA_STORAGE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const data = Object.fromEntries(captchas.entries());
    fs.writeFileSync(CAPTCHA_STORAGE_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('保存验证码存储失败:', error);
  }
}

// 初始化一次
initialize();

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
    
    // 保存到文件
    saveToFile();
  },

  /**
   * 获取验证码
   */
  getCaptcha: (id: string): Captcha | undefined => {
    // 先尝试从内存获取
    let captcha = captchas.get(id);
    
    // 如果内存中没有，从文件重新加载（防止多进程/重启）
    if (!captcha) {
      initialize();
      captcha = captchas.get(id);
    }
    
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
    saveToFile();
  }
};
