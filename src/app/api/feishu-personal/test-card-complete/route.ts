import { NextRequest, NextResponse } from 'next/server';
import { sendFeishuPrivateCard } from '@/lib/feishu-api';

/**
 * 测试完整的案件跟进卡片（带标题、颜色和按钮）
 * POST /api/feishu-personal/test-card-complete
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const openId = body.openId || 'ou_f8bf0f553338438d89338033cc255a5e'; // 高乐的open_id

    const appId = process.env.FEISHU_APP_ID || 'cli_a9652497d7389bd6';
    const appSecret = process.env.FEISHU_APP_SECRET || 'YHs5IxuDt5xXy4NT5dx0NgIVoC0aE2dO';

    console.log('========== 测试完整卡片发送 ==========');
    console.log('📤 发送对象:', openId);

    // 案件基础信息字段
    const fields = [
      { label: '📋 产品名称', value: '通用版跨商宝-默放保理' },
      { label: '💰 资金方', value: '默放' },
      { label: '⚠️ 风险等级', value: '🔴 高风险' },
      { label: '👤 接收人', value: '高乐' },
      { label: '🆔 用户ID', value: '54802' },
      { label: '🔢 贷款单号', value: 'DSL17197963748533374' },
      { label: '💵 待还金额', value: '¥30,637.24' },
      { label: '📅 到期日', value: '2025/1/1' },
    ];

    // 表单下拉选择
    const selects = [
      { name: 'follow_method', label: '跟进方式', placeholder: '请选择跟进方式' },
      { name: 'follow_target', label: '跟进对象', placeholder: '请选择跟进对象' },
      { name: 'contact_status', label: '联系状态', placeholder: '请选择联系状态' },
      { name: 'follow_result', label: '跟进结果', placeholder: '请选择跟进结果' },
    ];

    // 操作按钮
    const buttons: { text: string; type?: 'primary' | 'default' | 'danger'; value?: Record<string, any> }[] = [
      { text: '✅ 确认提交', type: 'primary', value: { action: 'submit' } },
      { text: '📞 电话跟进', type: 'default', value: { action: 'phone' } },
      { text: '📱 短信提醒', type: 'default', value: { action: 'sms' } },
    ];

    // 发送卡片（不使用表单下拉，使用按钮交互）
    const result = await sendFeishuPrivateCard(
      appId,
      appSecret,
      openId,
      '案件跟进提醒 - 待处理',
      fields,
      buttons,
      'blue',
      'open_id'
    );

    console.log('✅ 卡片发送成功:', result);

    return NextResponse.json({
      success: true,
      message: '卡片发送成功',
      data: result,
    });
  } catch (error: any) {
    console.error('❌ 发送失败:', error);
    return NextResponse.json(
      { error: error.message || '发送失败' },
      { status: 500 }
    );
  }
}
