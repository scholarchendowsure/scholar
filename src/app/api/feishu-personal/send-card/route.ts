import { NextRequest, NextResponse } from "next/server";
import { getLarkClient } from "@/lib/lark-client";

export async function POST(request: NextRequest) {
  try {
    const {
      openId,
      productName,
      funder,
      riskLevel,
      userId,
      loanNo,
      overdueAmount,
      dueDate,
      receiverName,
    } = await request.json();

    if (!openId) {
      return NextResponse.json(
        { error: "openId参数缺失" },
        { status: 400 }
      );
    }

    const client = await getLarkClient();

    // 构建飞书卡片 - 使用稳定的JSON 1.0结构
    const cardContent = {
      config: {
        wide_screen_mode: true,
      },
      header: {
        title: {
          tag: "plain_text",
          content: "案件跟进提醒",
        },
        template: "blue",
      },
      elements: [
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**产品名称：** ${productName || "-"}`,
          },
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**资金方：** ${funder || "-"}`,
          },
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**风险等级：** ${riskLevel || "-"}`,
          },
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**接收人：** ${receiverName || "-"}`,
          },
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**用户ID：** ${userId || "-"}`,
          },
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**贷款单号：** ${loanNo || "-"}`,
          },
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**待还金额：** ${overdueAmount || "-"}元`,
          },
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**到期日：** ${dueDate || "-"}`,
          },
        },
        {
          tag: "hr",
        },
        {
          tag: "note",
          elements: [
            {
              tag: "plain_text",
              content:
                "请在下方回复中填写跟进记录：\n\n" +
                "**跟进类型：** 线上/线下/其他\n" +
                "**联系人：** 法人/实控人/其他\n" +
                "**跟进结果：** 正常还款/预警上升/逾期承诺/其他\n" +
                "**跟进记录：** (请在此回复中填写跟进记录内容)",
            },
          ],
        },
      ],
    };

    const response = await client.im.message.create({
      params: {
        receive_id_type: "open_id",
      },
      data: {
        receive_id: openId,
        msg_type: "interactive",
        content: JSON.stringify(cardContent),
      },
    });

    if (response.code) {
      return NextResponse.json(
        { error: "飞书API错误: " + response.msg, code: response.code },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "消息发送成功",
      data: response.data,
    });
  } catch (error) {
    console.error("发送飞书消息失败:", error);
    return NextResponse.json(
      {
        error: "发送失败",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
