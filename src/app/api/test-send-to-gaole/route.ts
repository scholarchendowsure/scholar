import { NextRequest, NextResponse } from "next/server";
import { getLarkClient } from "@/lib/lark-client";

export async function POST(request: NextRequest) {
  try {
    const client = await getLarkClient();

    // 模拟一个真实的案件数据
    const testData = {
      openId: "ou_f8bf0f553338438d89338033cc255a5e",
      productName: "通用版跨商宝-默放保理",
      funder: "默放",
      riskLevel: "高风险",
      userId: "54802",
      loanNo: "DSL17197963748533374",
      overdueAmount: "30,637.24",
      dueDate: "2024/12/3",
      receiverName: "高乐",
    };

    // 构建简单的卡片，确保数据能正确显示
    const cardContent = {
      config: {
        wide_screen_mode: true,
      },
      header: {
        title: {
          tag: "plain_text",
          content: "案件跟进提醒 (测试)",
        },
        template: "blue",
      },
      elements: [
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**产品名称：** ${testData.productName}`,
          },
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**资金方：** ${testData.funder}`,
          },
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**风险等级：** ${testData.riskLevel}`,
          },
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**接收人：** ${testData.receiverName}`,
          },
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**用户ID：** ${testData.userId}`,
          },
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**贷款单号：** ${testData.loanNo}`,
          },
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**待还金额：** ${testData.overdueAmount}元`,
          },
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**到期日：** ${testData.dueDate}`,
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
                "请你在飞书卡片搭建工具中设置好表单容器、下拉选择框和提交按钮后，把卡片的JSON结构发给我，我来按照你的结构实现。\n\n" +
                "或者你可以告诉我：\n" +
                "1. 你在飞书卡片搭建工具中创建的卡片的Template ID\n" +
                "2. 或者直接把卡片的完整JSON复制给我",
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
        receive_id: testData.openId,
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
      message: "测试消息已发送给高乐",
      openId: testData.openId,
      data: response.data,
      msgId: response.data?.message_id,
    });
  } catch (error: any) {
    console.error("发送飞书消息失败:", error);
    return NextResponse.json(
      {
        error: "发送失败",
        details: error?.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}
