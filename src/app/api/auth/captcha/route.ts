import { NextResponse } from 'next/server';
import { captchaStorage } from '@/storage/database/captcha-storage';
import { addSecurityHeaders, createSecureJsonResponse, successResponse } from '@/lib/security';

// 生成随机验证码
function generateCaptcha(): { answer: string; image: string } {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let answer = '';
  for (let i = 0; i < 4; i++) {
    answer += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // 创建一个简单的Canvas来生成验证码图片
  // 实际项目中应使用更复杂的Canvas库
  const width = 120;
  const height = 40;
  
  // 生成一个简单的SVG验证码图片
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="20" y="28" font-family="Arial, sans-serif" font-size="24" fill="#333" font-weight="bold">${answer}</text>
      <line x1="0" y1="10" x2="${width}" y2="30" stroke="#999" stroke-width="1"/>
      <line x1="0" y1="30" x2="${width}" y2="10" stroke="#999" stroke-width="1"/>
    </svg>
  `;

  // 将SVG转换为base64
  const image = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

  return { answer, image };
}

// 获取验证码
export async function GET() {
  try {
    const { answer, image } = generateCaptcha();
    const id = crypto.randomUUID();
    
    // 存储验证码（5分钟有效期）
    captchaStorage.saveCaptcha(id, answer, 5 * 60 * 1000);

    const response = createSecureJsonResponse(successResponse({ id, image }));
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Generate captcha error:', error);
    const response = createSecureJsonResponse({ success: false, message: '生成验证码失败' }, { status: 500 });
    return addSecurityHeaders(response);
  }
}
