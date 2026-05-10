import { NextRequest, NextResponse } from 'next/server';

/**
 * 飞书卡片回调接口
 * 处理用户在飞书卡片中的交互操作（如按钮点击、下拉选择等）
 *
 * 需要在飞书开放平台「机器人设置」->「事件订阅」中配置回调URL：
 * https://<your-domain>/api/feishu/card-callback
 * 并开启 interactive 事件类型
 */

// 处理飞书回调
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('🎯 收到飞书回调:', JSON.stringify(body, null, 2));

    // 1. 处理URL验证（首次配置回调时）- 支持两种格式
    const isUrlVerification =
      body.type === 'url_verification' ||
      body.schema === '2.0' && body.header?.event_type === 'url_verification';

    if (isUrlVerification) {
      // 格式1（老版本）
      const challenge = body.challenge || body.event?.challenge;
      console.log('🔐 URL验证请求, challenge:', challenge);
      return NextResponse.json({
        challenge: challenge,
      });
    }

    // 2. 处理交互事件
    if (body.type === 'event_callback' || body.event) {
      const event = body.event || body;

      // 处理interactive卡片交互
      if (event.type === 'interactive') {
        const action = event.action || {};
        const value = action.value || {};
        const openId = event.user_open_id || event.open_id;
        const messageId = event.open_message_id || event.message_id;

        console.log('🎮 交互事件:', {
          actionTag: action.tag,
          value: value,
          openId: openId,
          messageId: messageId,
        });

        // 处理跟进提交
        if (value.action === 'submit_followup') {
          const caseId = value.case_id;
          const loanNo = value.loan_no;
          const followupMethod = value.followup_method || '未选择';
          const followupResult = value.followup_result || '未选择';

          console.log('📝 提交跟进记录:', {
            caseId,
            loanNo,
            followupMethod,
            followupResult,
          });

          // 尝试保存跟进记录（异步）
          try {
            // 查找案件
            const caseResponse = await fetch(
              `${process.env.COZE_PROJECT_DOMAIN_DEFAULT || ''}/api/cases?loanNo=${loanNo}`,
              { method: 'GET' }
            );
            const caseData = await caseResponse.json();

            if (caseData.success && caseData.data && caseData.data.length > 0) {
              const foundCase = caseData.data[0];

              // 创建跟进记录
              await fetch(
                `${process.env.COZE_PROJECT_DOMAIN_DEFAULT || ''}/api/cases/${foundCase.id}/followups`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    method: followupMethod,
                    content: `飞书卡片提交 - 跟进方式：${followupMethod}，跟进结果：${followupResult}`,
                    result: followupResult,
                    type: 'text',
                    sender: '飞书卡片提交',
                  }),
                }
              );

              console.log('✅ 跟进记录保存成功');

              // 返回成功提示
              return NextResponse.json({
                toast: {
                  type: 'success',
                  content: '跟进记录已提交成功',
                },
              });
            } else {
              console.log('⚠️ 未找到对应案件');
            }
          } catch (saveError) {
            console.error('❌ 保存跟进记录失败:', saveError);
          }

          // 返回成功提示（即使保存失败也提示用户）
          return NextResponse.json({
            toast: {
              type: 'success',
              content: '跟进记录已提交',
            },
          });
        }

        // 其他交互事件
        return NextResponse.json({
          toast: {
            type: 'info',
            content: '操作已收到',
          },
        });
      }
    }

    // 默认响应
    return NextResponse.json({
      toast: {
        type: 'info',
        content: '操作已收到',
      },
    });
  } catch (error) {
    console.error('❌ 飞书卡片回调处理错误:', error);
    return NextResponse.json({
      toast: {
        type: 'error',
        content: '处理失败，请重试',
      },
    });
  }
}

// 处理GET请求（飞书健康检查）
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'feishu-card-callback' });
}
