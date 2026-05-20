import { NextRequest, NextResponse } from 'next/server';
import { sendFeishuPrivateCard, getFeishuCredentials } from '@/lib/feishu-api';

// 模拟案件数据（用于测试）
const testCaseData = {
  productName: '通用版跨境宝·默放保理',
  funder: '默放',
  riskLevel: '高风险',
  userId: '54802',
  loanNo: 'DSL17197963748533374',
  overdueAmount: 30637.24,
  dueDate: '2025/1/1'
};

export async function POST(request: NextRequest) {
  try {
    // 获取飞书凭证
    const credentials = await getFeishuCredentials();
    if (!credentials.appId || !credentials.appSecret) {
      return NextResponse.json(
        { error: '飞书凭证未配置' },
        { status: 400 }
      );
    }

    // 构建字段列表
    const fields = [
      { label: '产品名称', value: testCaseData.productName },
      { label: '资金方', value: testCaseData.funder },
      { label: '风险等级', value: testCaseData.riskLevel },
      { label: '接收人', value: '高乐' },
      { label: '用户ID', value: testCaseData.userId },
      { label: '到期日', value: testCaseData.dueDate },
      { label: '贷款单号', value: testCaseData.loanNo },
      { label: '待还金额', value: '¥' + testCaseData.overdueAmount.toLocaleString() }
    ];

    // 构建按钮
    const buttons = [{
      text: '提交跟进记录',
      type: 'primary',
      value: {
        action: 'submit_followup',
        case_id: 'test-case-001',
        loan_no: testCaseData.loanNo,
      }
    }];

    // 发送卡片给高乐
    const result = await sendFeishuPrivateCard(
      credentials.appId,
      credentials.appSecret,
      'ou_1b11c70e4241fcf370bc20903ddf6c2e',
      '案件跟进提醒',
      fields,
      buttons,
      'red',
      'open_id'
    );

    // 返回成功结果
    return NextResponse.json({
      success: true,
      message: '测试卡片已发送给高乐',
      msg_id: result.msgId,
      card_fields: fields,
      note: '字段映射已正确设置（案件详情页面）：\n1. 产品名称 = caseData.productName\n2. 资金方 = caseData.funder\n3. 风险等级 = caseData.riskLevel\n4. 接收人 = 跟进人名称\n5. 用户ID = caseData.userId\n6. 贷款单号 = caseData.loanNo\n7. 待还金额 = 逾期金额格式化\n8. 到期日 = caseData.dueDate\n\n关于两列布局：当前sendFeishuPrivateCard使用垂直单列，如需自定义布局请直接调用飞书API构建column_set。'
    });
  } catch (error) {
    console.error('发送测试卡片失败:', error);
    return NextResponse.json(
      { error: '发送失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
