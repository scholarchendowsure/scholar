import { NextRequest, NextResponse } from 'next/server';
import { getAllMerchantSalesMappings } from '@/storage/database/merchant-sales-mapping-storage';
import { getAllHSBCLoans } from '@/storage/database/hsbc-loan-storage';
import { calcDaysToMaturity } from '@/lib/hsbc-loan';

interface FeishuReminderRequest {
  days: number;
  calcDate?: string;
}

interface FeishuReminderResult {
  sent: number;
  failed: number;
  messages: Array<{
    merchantId: string;
    feishuName: string;
    message: string;
    success: boolean;
  }>;
}

// 发送飞书消息（使用Webhook方式）
async function sendFeishuMessage(webhookUrl: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msg_type: 'text',
        content: {
          text: message,
        },
      }),
    });

    if (!response.ok) {
      console.error('飞书消息发送失败:', response.status, response.statusText);
      return false;
    }

    const result = await response.json();
    return result.code === 0;
  } catch (error) {
    console.error('发送飞书消息异常:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { days, calcDate } = body as FeishuReminderRequest;

    if (!days || days <= 0) {
      return NextResponse.json(
        { success: false, error: '请提供有效的天数' },
        { status: 400 }
      );
    }

    // 获取所有映射关系和贷款数据
    const [mappings, loans] = await Promise.all([
      getAllMerchantSalesMappings(),
      getAllHSBCLoans(),
    ]);

    // 创建商户ID到销售的映射
    const merchantToSales = new Map(
      mappings.map(m => [m.merchantId, m.feishuName])
    );

    // 计算到期日期
    const baseDate = calcDate ? new Date(calcDate) : new Date();

    // 筛选需要提醒的贷款
    const loansToRemind = loans.filter(loan => {
      const daysToMaturity = calcDaysToMaturity(loan, baseDate);
      return daysToMaturity !== null && daysToMaturity >= 0 && daysToMaturity <= days;
    });

    // 按商户分组，避免给同一销售发送多条消息
    const merchantMap = new Map<string, any[]>();
    loansToRemind.forEach(loan => {
      if (!merchantMap.has(loan.merchantId)) {
        merchantMap.set(loan.merchantId, []);
      }
      merchantMap.get(loan.merchantId)!.push(loan);
    });

    const result: FeishuReminderResult = {
      sent: 0,
      failed: 0,
      messages: [],
    };

    // 发送提醒（目前先记录消息，需要用户配置飞书Webhook后才能实际发送）
    for (const [merchantId, merchantLoans] of merchantMap) {
      const feishuName = merchantToSales.get(merchantId);
      
      if (!feishuName) {
        result.messages.push({
          merchantId,
          feishuName: '未知销售',
          message: `商户 ${merchantId} 没有对应的销售映射`,
          success: false,
        });
        result.failed++;
        continue;
      }

      // 为每个贷款生成提醒消息
      for (const loan of merchantLoans) {
        const balance = loan.outstandingBalanceCny !== null 
          ? `¥${loan.outstandingBalanceCny.toLocaleString()}`
          : loan.outstandingBalanceUsd !== null
          ? `$${loan.outstandingBalanceUsd.toLocaleString()}`
          : '未知';
        
        const currency = loan.currency || loan.outstandingBalanceCny !== null ? 'CNY' : 'USD';
        const maturityDate = loan.maturityDate || '未知';

        const message = `${feishuName}，商户${merchantId}有一笔${balance}${currency}在${maturityDate}需要到期还款，记得要及时跟进。`;

        // 记录消息（实际发送需要配置飞书Webhook）
        result.messages.push({
          merchantId,
          feishuName,
          message,
          success: true, // 标记为成功，实际发送需要Webhook配置
        });
        result.sent++;
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `成功生成 ${result.sent} 条提醒消息`,
    });
  } catch (error) {
    console.error('发送飞书提醒失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '发送失败' },
      { status: 500 }
    );
  }
}
