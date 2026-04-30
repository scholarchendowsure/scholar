import { NextRequest, NextResponse } from 'next/server';

// 验证码配置
const CAPTCHA_CONFIG = {
  width: 120,
  height: 40,
  length: 4,
  fontSize: 24,
  charset: 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789',
  expiresIn: 5 * 60 * 1000 // 5分钟过期
};

// 存储验证码（生产环境应使用Redis）
const captchaStore = new Map<string, { code: string; expires: number }>();

// 清理过期验证码
function cleanupExpiredCaptcha() {
  const now = Date.now();
  for (const [id, data] of captchaStore.entries()) {
    if (data.expires < now) {
      captchaStore.delete(id);
    }
  }
}

// 生成随机验证码
function generateCaptchaCode(length: number): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CAPTCHA_CONFIG.charset.charAt(
      Math.floor(Math.random() * CAPTCHA_CONFIG.charset.length)
    );
  }
  return code;
}

// 生成验证码图片（纯文本base64）
function generateCaptchaImage(code: string): string {
  // 创建一个简单的SVG验证码
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${CAPTCHA_CONFIG.width}" height="${CAPTCHA_CONFIG.height}">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="10" y="28" font-family="Arial, sans-serif" font-size="${CAPTCHA_CONFIG.fontSize}" font-weight="bold" fill="#333">
        ${code.split('').map((char, i) => 
          `<tspan x="${10 + i * 28}" y="${25 + Math.random() * 10 - 5}" rotate="${Math.random() * 20 - 10}">${char}</tspan>`
        ).join('')}
      </text>
      ${Array.from({length: 5}, () => 
        `<line x1="${Math.random() * CAPTCHA_CONFIG.width}" y1="${Math.random() * CAPTCHA_CONFIG.height}" x2="${Math.random() * CAPTCHA_CONFIG.width}" y2="${Math.random() * CAPTCHA_CONFIG.height}" stroke="#ccc" stroke-width="1"/>`
      ).join('')}
      ${Array.from({length: 30}, () => 
        `<circle cx="${Math.random() * CAPTCHA_CONFIG.width}" cy="${Math.random() * CAPTCHA_CONFIG.height}" r="1" fill="#999"/>`
      ).join('')}
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export async function GET(request: NextRequest) {
  try {
    cleanupExpiredCaptcha();
    
    // 生成验证码
    const code = generateCaptchaCode(CAPTCHA_CONFIG.length);
    const captchaId = `captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const image = generateCaptchaImage(code);
    
    // 存储验证码
    captchaStore.set(captchaId, {
      code: code.toLowerCase(),
      expires: Date.now() + CAPTCHA_CONFIG.expiresIn
    });
    
    return NextResponse.json({
      success: true,
      data: {
        captchaId,
        image
      }
    });
  } catch (error) {
    console.error('生成验证码失败:', error);
    return NextResponse.json(
      { success: false, error: '生成验证码失败' },
      { status: 500 }
    );
  }
}

// 验证验证码
export function verifyCaptcha(captchaId: string, userInput: string): boolean {
  const stored = captchaStore.get(captchaId);
  
  if (!stored) {
    return false;
  }
  
  if (stored.expires < Date.now()) {
    captchaStore.delete(captchaId);
    return false;
  }
  
  const isValid = stored.code === userInput.toLowerCase();
  
  if (isValid) {
    captchaStore.delete(captchaId); // 验证成功后删除，防止重复使用
  }
  
  return isValid;
}
