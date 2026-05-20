import { NextRequest, NextResponse } from 'next/server';
import { sendFeishuPrivateCard } from '@/lib/feishu-api';

export async function POST(request: NextRequest) {
  try {
    // 测试数据 - 模拟一个案件
    const testCaseData = {
      productName: '通用版跨境宝·默放保理',
      funder: '默放',
      riskLevel: '高风险',
      userId: '54802',
      loanNo: 'DSL17197963748533374',
      overdueAmount: 30637.24,
      dueDate: '2025/1/1'
    };

    // 构建卡片字段
    const fields = [
      { label: '产品名称', value: testCaseData.productName },
      { label: '资金方', value: testCaseData.funder },
      { label: '风险等级', value: testCaseData.riskLevel },
      { label: '接收人', value: '高乐' },
      { label: '用户ID', value: testCaseData.userId },
      { label: '贷款单号', value: testCaseData.loanNo },
      { label: '待还金额', value: `¥${Number(testCaseData.overdueAmount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` },
      { label: '到期日', value: testCaseData.dueDate }
    ];

    // 构建按钮
    const buttons: any[] = [{
      text: '提交跟进记录',
      type: 'primary',
      value: {
        action: 'submit_followup',
        case_id: 'test-case-001',
        loan_no: testCaseData.loanNo,
      }
    }];

    // 高乐的飞书openId
    const gaoLeOpenId = 'ou_f8bf0f553338438d89338033cc255a5e';

    const appId = process.env.FEISHU_APP_ID || 'cli_a9652497d7389bd6';
    const appSecret = process.env.FEISHU_APP_SECRET || '';

    console.log('开始发送测试卡片给高乐...');

    // 发送卡片
    const result = await sendFeishuPrivateCard(
      appId,
      appSecret,
      gaoLeOpenId,
      '案件跟进提醒（测试）',
      fields,
      buttons,
      'blue',
      'open_id'
    );

    console.log('测试卡片发送成功:', result);

    return NextResponse.json({ 
      success: true, 
      message: '测试卡片已发送给高乐',
      msg_id: result.msgId,
      card_fields: fields
    });

  } catch (error) {
    console.error('发送测试卡片失败:', error);
    return NextResponse.json({ 
      error: '发送测试卡片失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}