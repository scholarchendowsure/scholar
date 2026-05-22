import { NextRequest, NextResponse } from 'next/server';
import { getTenantAccessToken } from '@/lib/feishu-api';
import { getFeishuAppCredentials } from '@/storage/database/feishu-config-storage';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { 
      openId, 
      productName, 
      funder, 
      riskLevel, 
      receiver, 
      userId, 
      loanNo, 
      overdueAmount, 
      dueDate 
    } = await request.json();

    if (!openId) {
      return NextResponse.json({ error: '缺少openId参数' }, { status: 400 });
    }

    // 获取企业自建应用凭证
    const credentials = await getFeishuAppCredentials();
    if (!credentials?.appId) {
      return NextResponse.json({ 
        success: false, 
        error: '请先配置飞书自建应用App ID和App Secret' 
      }, { status: 400 });
    }

    // 获取tenant_access_token
    const tenantAccessToken = await getTenantAccessToken(credentials.appId, credentials.appSecret || '');

    console.log('接收到的参数:', { 
      openId, productName, funder, riskLevel, receiver, userId, loanNo, overdueAmount, dueDate 
    });

    // 构建飞书卡片JSON 2.0结构
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
                                    content: `产品名称：${productName || '-'}
资金方：${funder || '-'}
风险等级：${riskLevel || '-'}
接收人：${receiver || '-'}
用户ID：${userId || '-'}
贷款单号：${loanNo || '-'}
待还金额：¥${overdueAmount || '-'}
到期日：${dueDate || '-'}`,
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
                  {
                    text: {
                      tag: "plain_text",
                      content: "线上"
                    },
                    value: "phone"
                  },
                  {
                    text: {
                      tag: "plain_text",
                      content: "线下"
                    },
                    value: "wechat"
                  },
                  {
                    text: {
                      tag: "plain_text",
                      content: "其他"
                    },
                    value: "email"
                  },
                  {
                    text: {
                      tag: "plain_text",
                      content: "未跟进"
                    },
                    value: "meeting"
                  }
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
                  {
                    text: {
                      tag: "plain_text",
                      content: "法人"
                    },
                    value: "self"
                  },
                  {
                    text: {
                      tag: "plain_text",
                      content: "实控人"
                    },
                    value: "family"
                  },
                  {
                    text: {
                      tag: "plain_text",
                      content: "其他"
                    },
                    value: "agent"
                  }
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
                  {
                    text: {
                      tag: "plain_text",
                      content: "已联系"
                    },
                    value: "contacted"
                  },
                  {
                    text: {
                      tag: "plain_text",
                      content: "未联系"
                    },
                    value: "uncontacted"
                  },
                  {
                    text: {
                      tag: "plain_text",
                      content: "无法联系"
                    },
                    value: "unreachable"
                  }
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
                  {
                    text: {
                      tag: "plain_text",
                      content: "正常还款"
                    },
                    value: "repaid"
                  },
                  {
                    text: {
                      tag: "plain_text",
                      content: "预警上升"
                    },
                    value: "promised"
                  },
                  {
                    text: {
                      tag: "plain_text",
                      content: "逾期承诺"
                    },
                    value: "follow_up_again"
                  },
                  {
                    text: {
                      tag: "plain_text",
                      content: "其他"
                    },
                    value: "refused"
                  }
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
                    value: ""
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
      receive_id: openId,
      msg_type: "interactive",
      content: JSON.stringify(card),
      uuid: Date.now().toString()
    };

    const response = await fetch(feishuUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tenantAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.code === 0) {
      return NextResponse.json({ 
        success: true, 
        message: '消息发送成功',
        msgId: result.data?.message_id,
        openId: openId
      });
    } else {
      return NextResponse.json({ 
        error: '发送失败', 
        details: result.msg || '未知错误' 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('发送飞书消息失败:', error);
    return NextResponse.json({ 
      error: '发送失败', 
      details: error.message 
    }, { status: 500 });
  }
}
