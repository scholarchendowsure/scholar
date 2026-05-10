import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * 飞书卡片回调接口（支持加密）
 *
 * 配置步骤：
 * 1. 飞书开放平台 → 机器人设置 → 事件订阅
 * 2. 配置请求地址：https://<your-domain>/api/feishu/card-callback
 * 3. 添加事件类型：card.action.trigger
 *
 * 加密配置：
 * - Encrypt Key: e9d9f6674ceb517ea5aaf882aabf1a19
 * - Verification Token: fFMKuWHMRQmyT2C2bHN61fAxcBhthsq8
 */

const ENCRYPT_KEY = 'e9d9f6674ceb517ea5aaf882aabf1a19';
const VERIFICATION_TOKEN = 'fFMKuWHMRQmyT2C2bHN61fAxcBhthsq8';

/**
 * 解密飞书加密数据（AES-256-CBC）
 */
function decryptFeishu(encrypt: string): any {
  try {
    const key = Buffer.from(ENCRYPT_KEY);
    const iv = key.slice(0, 16);

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(Buffer.from(encrypt, 'base64'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    const jsonStr = decrypted.toString('utf-8');
    console.log('🔓 解密结果:', jsonStr);
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('❌ 解密失败:', e);
    return null;
  }
}

/**
 * 处理 URL 验证
 */
function handleUrlVerification(body: any): NextResponse {
  // body 已在外部解密，直接取 challenge
  const challenge = body?.challenge ?? body?.event?.challenge ?? '';

  console.log('🔐 URL 验证, challenge:', challenge);

  return new NextResponse(JSON.stringify({ challenge }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

export async function POST(request: NextRequest) {
  let body: any;

  try {
    body = await request.json();
  } catch (e) {
    console.error('❌ 解析请求体失败:', e);
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  console.log('🎯 收到飞书原始请求:', JSON.stringify(body));

  // ========== 1. 解密处理（如果配置了 Encrypt Key）==========
  if (body?.encrypt) {
    console.log('🔒 检测到加密数据，开始解密...');
    const decrypted = decryptFeishu(body.encrypt);
    if (!decrypted) {
      return NextResponse.json(
        { error: 'Decryption failed' },
        { status: 400 }
      );
    }
    body = decrypted;
    console.log('🔓 解密后数据:', JSON.stringify(body));
  }

  // ========== 2. URL 验证（飞书配置回调时发送）==========
  if (
    body?.type === 'url_verification' ||
    body?.event?.type === 'url_verification' ||
    body?.header?.event_type === 'url_verification'
  ) {
    return handleUrlVerification(body);
  }

  // ========== 3. 验证 Token ==========
  const token =
    body?.token ??
    body?.header?.token ??
    body?.event?.token ?? '';

  if (token && token !== VERIFICATION_TOKEN) {
    console.warn('⚠️ Token 验证失败');
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }

  // ========== 4. 卡片交互回调 ==========
  const eventType =
    body?.header?.event_type ||
    body?.event?.type ||
    '';

  const action =
    body?.action ||
    body?.event?.action ||
    {};

  const value = action?.value || {};

  console.log('🎮 事件类型:', eventType);
  console.log('🎮 卡片交互:', JSON.stringify(value));

  // 处理跟进提交
  if (value?.action === 'submit_followup') {
    const loanNo = value?.loan_no;
    const followupMethod = value?.followup_method || '未选择';
    const followupResult = value?.followup_result || '未选择';

    console.log('📝 提交跟进:', { loanNo, followupMethod, followupResult });

    try {
      const domain =
        process.env.COZE_PROJECT_DOMAIN_DEFAULT?.replace(/\/$/, '') || '';

      const caseRes = await fetch(
        `${domain}/api/cases?loanNo=${loanNo}`,
        { method: 'GET' }
      );
      const caseData = await caseRes.json();

      if (caseData?.success && caseData?.data?.length > 0) {
        const foundCase = caseData.data[0];
        await fetch(`${domain}/api/cases/${foundCase.id}/followups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: followupMethod,
            content: `飞书卡片提交 - 跟进方式：${followupMethod}，跟进结果：${followupResult}`,
            result: followupResult,
            type: 'text',
            sender: '飞书卡片提交',
          }),
        });
        console.log('✅ 跟进记录保存成功');
      }
    } catch (e) {
      console.error('❌ 保存跟进记录失败:', e);
    }

    return NextResponse.json({
      toast: { type: 'success', content: '跟进记录已提交' },
    });
  }

  // 默认响应
  return NextResponse.json({
    toast: { type: 'info', content: '操作已收到' },
  });
}
