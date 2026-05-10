import { NextRequest, NextResponse } from 'next/server';

/**
 * 飞书卡片回调接口
 *
 * 配置步骤：
 * 1. 飞书开放平台 → 机器人设置 → 事件订阅
 * 2. 配置请求地址：https://<your-domain>/api/feishu/card-callback
 * 3. 添加事件类型：im.message.receive_v1
 * 4. 添加事件类型：card.action.trigger
 */

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

  console.log('🎯 收到飞书请求:', JSON.stringify(body));

  // ========== 1. URL 验证（飞书配置回调时发送）==========
  const isUrlVerification =
    body?.type === 'url_verification' ||
    body?.event?.type === 'url_verification' ||
    body?.header?.event_type === 'url_verification';

  if (isUrlVerification) {
    const challenge = body?.challenge ?? body?.event?.challenge ?? '';
    console.log('🔐 URL 验证, challenge:', challenge);

    // 必须原样返回 challenge，不能有其他字段
    return new NextResponse(JSON.stringify({ challenge }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  // ========== 2. 卡片交互回调 ==========
  if (body?.event?.type === 'interactive' || body?.action) {
    const action = body?.action || {};
    const value = action?.value || {};

    console.log('🎮 卡片交互:', value);

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

    return NextResponse.json({
      toast: { type: 'info', content: '操作已收到' },
    });
  }

  // 默认响应
  return NextResponse.json({
    toast: { type: 'info', content: '操作已收到' },
  });
}
