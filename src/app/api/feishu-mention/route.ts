import { NextRequest, NextResponse } from 'next/server';
import { caseStorage } from '@/storage/database/case-storage';
import { getTenantAccessToken } from '@/lib/feishu-api';
import { getFeishuAppCredentials } from '@/storage/database/feishu-config-storage';

interface MentionRequest {
  userId: string;
  senderOpenId: string;
  event?: Record<string, unknown>;
}

/**
 * 格式化金额
 */
function formatMoney(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '-';
  return `¥${num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * 构建案件选择卡片
 */
function buildCaseSelectionCard(cases: any[], userId: string, senderOpenId: string) {
  const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';

  const caseElements = cases.map((caseItem, index) => {
    const caseDetailUrl = `${domain}/shared-cases/${caseItem.id}`;
    const riskLevel = caseItem.riskLevel || '-';
    const overdueAmount = formatMoney(caseItem.overdueAmount);
    const status = caseItem.status || '-';
    const customerName = caseItem.borrowerName || '-';

    const statusColors: Record<string, string> = {
      'pending_assign': 'orange',
      'pending_visit': 'blue',
      'following': 'blue',
      'closed': 'green',
    };

    return {
      tag: "column_set",
      flex_mode: "stretch",
      horizontal_spacing: "8px",
      margin: "8px 0px 8px 0px",
      columns: [
        {
          tag: "column",
          width: "weighted",
          weight: 1,
          vertical_align: "top",
          elements: [
            {
              tag: "markdown",
              content: `**案件 ${index + 1}**\n👤 ${customerName}\n📊 风险等级: ${riskLevel}\n💰 逾期金额: ${overdueAmount}\n📋 状态: ${status}`,
              text_size: "normal_v2",
              text_align: "left"
            }
          ]
        },
        {
          tag: "column",
          width: "weighted",
          weight: 1,
          vertical_align: "top",
          elements: [
            {
              tag: "button",
              text: {
                tag: "plain_text",
                content: "查看详情"
              },
              type: "default",
              width: "fill",
              margin: "4px 0px 4px 0px",
              behaviors: [
                {
                  type: "open_url",
                  default_url: caseDetailUrl,
                  pc_url: caseDetailUrl,
                  android_url: caseDetailUrl,
                  ios_url: caseDetailUrl
                }
              ]
            },
            {
              tag: "button",
              text: {
                tag: "plain_text",
                content: "发送提醒"
              },
              type: "primary",
              width: "fill",
              margin: "4px 0px 4px 0px",
              behaviors: [
                {
                  type: "callback",
                  value: JSON.stringify({
                    action: "send_reminder",
                    caseId: caseItem.id,
                    senderOpenId: senderOpenId,
                    userId: userId
                  })
                }
              ]
            }
          ]
        }
      ]
    };
  });

  return {
    schema: "2.0",
    config: {
      update_multi: true
    },
    header: {
      title: {
        tag: "plain_text",
        content: `📋 用户ID ${userId} 的案件列表`
      },
      subtitle: {
        tag: "plain_text",
        content: `共找到 ${cases.length} 个案件`
      },
      template: "blue",
      icon: {
        tag: "standard_icon",
        token: "document_outlined"
      }
    },
    body: {
      direction: "vertical",
      elements: [
        {
          tag: "markdown",
          content: `请选择要操作的案件：`,
          text_size: "normal_v2",
          text_align: "left",
          margin: "0px 0px 12px 0px"
        },
        ...caseElements
      ]
    }
  };
}

/**
 * 发送案件选择卡片
 */
async function sendCaseSelectionCard(
  cases: any[],
  userId: string,
  senderOpenId: string,
  tenantAccessToken: string
) {
  const card = buildCaseSelectionCard(cases, userId, senderOpenId);

  const feishuUrl = `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id`;

  const payload = {
    receive_id: senderOpenId,
    msg_type: "interactive",
    content: JSON.stringify(card)
  };

  console.log("📤 发送案件选择卡片给:", senderOpenId);

  const response = await fetch(feishuUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tenantAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  console.log("📊 飞书API响应:", JSON.stringify(result, null, 2));

  if (result.code !== 0) {
    throw new Error(`发送卡片失败: code=${result.code}, msg=${result.msg}`);
  }

  return result.data;
}

/**
 * 发送案件跟进提醒卡片
 */
async function sendFollowUpReminderCard(
  caseItem: any,
  senderOpenId: string,
  tenantAccessToken: string
) {
  const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
  const caseDetailUrl = `${domain}/shared-cases/${caseItem.id}`;

  // 获取飞书应用凭证
  const credentials = await getFeishuAppCredentials();

  // 构建回调数据
  const callbackDataObj = {
    case_id: caseItem.id,
    operator_id: senderOpenId,
    operator_name: '飞书用户',
    follower_name: '飞书用户'
  };
  const callbackData = JSON.stringify(callbackDataObj);

  // 构建卡片JSON（复用现有的跟进提醒卡片结构）
  const card = {
    schema: "2.0",
    config: {
      update_multi: true,
      style: {
        text_size: {
          normal_v2: {
            default: "normal",
            pc: "normal",
            mobile: "heading"
          }
        }
      }
    },
    body: {
      direction: "vertical",
      elements: [
        {
          tag: "column_set",
          flex_mode: "stretch",
          horizontal_spacing: "12px",
          horizontal_align: "left",
          columns: [
            {
              tag: "column",
              width: "weighted",
              elements: [
                {
                  tag: "column_set",
                  horizontal_spacing: "8px",
                  horizontal_align: "left",
                  columns: [
                    {
                      tag: "column",
                      width: "weighted",
                      elements: [
                        {
                          tag: "column_set",
                          horizontal_align: "left",
                          columns: [
                            {
                              tag: "column",
                              width: "weighted",
                              elements: [
                                {
                                  tag: "markdown",
                                  content: `产品名称：${caseItem.productName || '-'}\n资金方：${caseItem.funder || '-'}\n风险等级：${caseItem.riskLevel || '-'}\n借款人姓名：${caseItem.borrowerName || '-'}\n用户ID：${caseItem.userId || '-'}\n贷款单号：${caseItem.loanNo || '-'}\n逾期金额：${formatMoney(caseItem.overdueAmount)}\n到期日：${caseItem.dueDate || '-'}\n\n[查看案件详情](${caseDetailUrl})`,
                                  text_align: "left",
                                  text_size: "normal_v2",
                                  margin: "0px 0px 0px 0px"
                                }
                              ],
                              vertical_spacing: "8px",
                              horizontal_align: "left",
                              vertical_align: "top",
                              weight: 1
                            }
                          ]
                        }
                      ],
                      vertical_spacing: "8px",
                      horizontal_align: "left",
                      vertical_align: "top",
                      weight: 1
                    }
                  ],
                  margin: "0px 0px 0px 0px"
                }
              ],
              vertical_spacing: "8px",
              horizontal_align: "left",
              vertical_align: "top",
              weight: 2
            }
          ],
          margin: "0px 0px 0px 0px"
        },
        {
          tag: "hr",
          margin: "0px 0px 0px 0px"
        },
        {
          tag: "form",
          elements: [
            {
              tag: "select_static",
              placeholder: {
                tag: "plain_text",
                content: "请选择跟进方式"
              },
              options: [
                { text: { tag: "plain_text", content: "线上" }, value: "phone" },
                { text: { tag: "plain_text", content: "线下" }, value: "wechat" },
                { text: { tag: "plain_text", content: "其他" }, value: "email" },
                { text: { tag: "plain_text", content: "未跟进" }, value: "meeting" }
              ],
              type: "default",
              width: "default",
              required: true,
              name: "follow_up_method",
              margin: "0px 0px 0px 0px"
            },
            {
              tag: "select_static",
              placeholder: {
                tag: "plain_text",
                content: "请选择跟进对象"
              },
              options: [
                { text: { tag: "plain_text", content: "法人" }, value: "self" },
                { text: { tag: "plain_text", content: "实控人" }, value: "family" },
                { text: { tag: "plain_text", content: "其他" }, value: "agent" }
              ],
              type: "default",
              width: "default",
              required: true,
              name: "follow_up_object",
              margin: "0px 0px 0px 0px"
            },
            {
              tag: "select_static",
              placeholder: {
                tag: "plain_text",
                content: "请选择联系状态"
              },
              options: [
                { text: { tag: "plain_text", content: "已联系" }, value: "contacted" },
                { text: { tag: "plain_text", content: "未联系" }, value: "uncontacted" },
                { text: { tag: "plain_text", content: "无法联系" }, value: "unreachable" }
              ],
              type: "default",
              width: "default",
              required: true,
              name: "contact_status",
              margin: "0px 0px 0px 0px"
            },
            {
              tag: "select_static",
              placeholder: {
                tag: "plain_text",
                content: "请选择跟进结果"
              },
              options: [
                { text: { tag: "plain_text", content: "正常还款" }, value: "repaid" },
                { text: { tag: "plain_text", content: "预警上升" }, value: "promised" },
                { text: { tag: "plain_text", content: "逾期承诺" }, value: "follow_up_again" },
                { text: { tag: "plain_text", content: "其他" }, value: "refused" }
              ],
              type: "default",
              width: "default",
              required: true,
              name: "follow_up_result",
              margin: "0px 0px 0px 0px"
            },
            {
              tag: "input",
              placeholder: {
                tag: "plain_text",
                content: "请输入跟进备注"
              },
              default_value: "",
              max_length: 1000,
              width: "fill",
              required: true,
              name: "follow_up_remark",
              margin: "0px 0px 0px 0px"
            },
            {
              tag: "button",
              text: {
                tag: "plain_text",
                content: "提交跟进记录"
              },
              type: "primary_filled",
              width: "fill",
              behaviors: [
                {
                  type: "callback",
                  value: callbackData
                }
              ],
              form_action_type: "submit",
              name: "submit_button",
              margin: "4px 0px 4px 0px"
            }
          ],
          direction: "horizontal",
          horizontal_spacing: "8px",
          vertical_spacing: "12px",
          horizontal_align: "left",
          vertical_align: "top",
          padding: "0px 0px 0px 0px",
          margin: "0px 0px 0px 0px",
          name: "repayment_form"
        }
      ]
    },
    header: {
      title: {
        tag: "plain_text",
        content: "案件跟进提醒"
      },
      subtitle: {
        tag: "plain_text",
        content: ""
      },
      template: "blue",
      icon: {
        tag: "standard_icon",
        token: "payment_outlined"
      },
      padding: "12px 8px 12px 8px"
    }
  };

  // 构建飞书API请求
  const feishuUrl = `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id`;

  const payload = {
    receive_id: senderOpenId,
    msg_type: "interactive",
    content: JSON.stringify(card)
  };

  console.log("📤 发送跟进提醒卡片给:", senderOpenId);

  const response = await fetch(feishuUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tenantAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  console.log("📊 飞书API响应:", JSON.stringify(result, null, 2));

  if (result.code !== 0) {
    throw new Error(`发送卡片失败: code=${result.code}, msg=${result.msg}`);
  }

  return result.data;
}

/**
 * 发送文本消息
 */
async function sendTextMessage(
  text: string,
  senderOpenId: string,
  tenantAccessToken: string
) {
  const feishuUrl = `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id`;

  const payload = {
    receive_id: senderOpenId,
    msg_type: "text",
    content: JSON.stringify({ text })
  };

  console.log("📤 发送文本消息给:", senderOpenId);

  const response = await fetch(feishuUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tenantAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  console.log("📊 飞书API响应:", JSON.stringify(result, null, 2));

  if (result.code !== 0) {
    throw new Error(`发送消息失败: code=${result.code}, msg=${result.msg}`);
  }

  return result.data;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, senderOpenId, event } = await request.json() as MentionRequest;

    console.log("🎯 收到@消息处理请求:", { userId, senderOpenId });

    if (!userId || !senderOpenId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 获取飞书应用凭证
    const credentials = await getFeishuAppCredentials();
    if (!credentials?.appId) {
      return NextResponse.json(
        { success: false, error: '请先配置飞书自建应用App ID和App Secret' },
        { status: 400 }
      );
    }

    // 获取tenant_access_token
    const tenantAccessToken = await getTenantAccessToken(credentials.appId, credentials.appSecret || '');

    // 查询该用户ID的案件
    const allCases = await caseStorage.getAll();
    const userCases = allCases.filter((c: any) => c.userId === userId);

    console.log(`🔍 查询到用户ID ${userId} 的案件数量:`, userCases.length);

    if (userCases.length === 0) {
      // 没有找到案件，发送提示消息
      await sendTextMessage(
        `未找到用户ID ${userId} 的任何案件，请确认用户ID是否正确。`,
        senderOpenId,
        tenantAccessToken
      );

      return NextResponse.json({
        success: true,
        message: '已发送未找到案件提示',
        caseCount: 0
      });
    }

    // 发送案件选择卡片
    await sendCaseSelectionCard(userCases, userId, senderOpenId, tenantAccessToken);

    return NextResponse.json({
      success: true,
      message: '已发送案件选择卡片',
      caseCount: userCases.length,
      cases: userCases.map((c: any) => ({ id: c.id, customerName: c.borrowerName }))
    });

  } catch (error) {
    console.error('❌ 处理@消息失败:', error);
    return NextResponse.json(
      { success: false, error: '处理失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
