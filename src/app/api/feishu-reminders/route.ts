import { NextRequest, NextResponse } from 'next/server';
import { getAllMerchantSalesMappings } from '@/storage/database/merchant-sales-mapping-storage';
import { getAllHSBCLoans } from '@/storage/database/hsbc-loan-storage';
import { getFeishuConfig } from '@/storage/database/feishu-config-storage';
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
    console.log('开始发送飞书消息...');
    console.log('Webhook URL:', webhookUrl ? webhookUrl.substring(0, 50) + '...' : '未配置');
    console.log('消息内容:', message);

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

    console.log('飞书API响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('飞书消息发送失败 - HTTP错误:', response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log('飞书API响应数据:', result);
    
    if (result.code === 0) {
      console.log('飞书消息发送成功！');
      return true;
    } else {
      console.error('飞书消息发送失败 - API错误:', result);
      return false;
    }
  } catch (error) {
    console.error('发送飞书消息异常:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  console.log('========== 飞书提醒发送开始 ==========');
  
  try {
    const body = await request.json();
    const { days, calcDate } = body as FeishuReminderRequest;

    console.log('请求参数:', { days, calcDate });

    if (!days || days <= 0) {
      console.error('参数错误：无效的天数');
      return NextResponse.json(
        { success: false, error: '请提供有效的天数' },
        { status: 400 }
      );
    }

    // 获取飞书配置
    console.log('正在获取飞书配置...');
    const feishuConfig = await getFeishuConfig();
    console.log('飞书配置:', feishuConfig ? { hasWebhook: !!feishuConfig.webhookUrl } : '未配置');

    if (!feishuConfig?.webhookUrl) {
      console.error('错误：未配置飞书 Webhook');
      return NextResponse.json(
        { success: false, error: '请先在飞书配置页面配置 Webhook URL' },
        { status: 400 }
      );
    }

    // 获取所有映射关系和贷款数据
    console.log('正在获取数据...');
    const [mappingsResult, loans] = await Promise.all([
      getAllMerchantSalesMappings(),
      getAllHSBCLoans(),
    ]);

    const mappings = mappingsResult.mappings;
    console.log('商户-销售映射数量:', mappings.length);
    console.log('贷款数据数量:', loans.length);

    // 创建商户ID到销售的映射
    const merchantToSales = new Map(
      mappings.map(m => [m.merchantId, m.salesFeishuName])
    );
    console.log('商户ID映射表构建完成，包含', merchantToSales.size, '个商户');

    // 计算到期日期
    const baseDate = calcDate ? new Date(calcDate) : new Date();
    console.log('计算基准日期:', baseDate.toISOString());

    // 筛选需要提醒的贷款
    const loansToRemind = loans.filter(loan => {
      const daysToMaturity = calcDaysToMaturity(loan, baseDate);
      const shouldRemind = daysToMaturity !== null && daysToMaturity >= 0 && daysToMaturity <= days;
      return shouldRemind;
    });
    console.log('筛选出需要提醒的贷款数量:', loansToRemind.length);

    // 按商户分组，避免给同一销售发送多条消息
    const merchantMap = new Map<string, any[]>();
    loansToRemind.forEach(loan => {
      if (!merchantMap.has(loan.merchantId)) {
        merchantMap.set(loan.merchantId, []);
      }
      merchantMap.get(loan.merchantId)!.push(loan);
    });
    console.log('按商户分组后，商户数量:', merchantMap.size);

    const result: FeishuReminderResult = {
      sent: 0,
      failed: 0,
      messages: [],
    };

    // 发送提醒
    console.log('开始发送飞书提醒消息...');
    for (const [merchantId, merchantLoans] of merchantMap) {
      const feishuName = merchantToSales.get(merchantId);
      
      console.log(`处理商户 ${merchantId}, 对应销售: ${feishuName || '未找到'}`);
      
      if (!feishuName) {
        result.messages.push({
          merchantId,
          feishuName: '未知销售',
          message: `商户 ${merchantId} 没有对应的销售映射`,
          success: false,
        });
        result.failed++;
        console.log(`商户 ${merchantId} 没有对应的销售映射，跳过`);
        continue;
      }

      // 为每个贷款生成提醒消息
      for (const loan of merchantLoans) {
        const balance = loan.balance !== undefined 
          ? `¥${loan.balance.toLocaleString()}`
          : '未知';
        
        const currency = loan.loanCurrency || 'CNY';
        const maturityDate = loan.maturityDate || '未知';

        const message = `${feishuName}，商户${merchantId}有一笔${balance}${currency}在${maturityDate}需要到期还款，记得要及时跟进。`;
        console.log(`生成提醒消息: ${message}`);

        // 发送飞书消息
        const sendSuccess = await sendFeishuMessage(feishuConfig.webhookUrl, message);
        
        result.messages.push({
          merchantId,
          feishuName,
          message,
          success: sendSuccess,
        });
        
        if (sendSuccess) {
          result.sent++;
          console.log(`消息发送成功: 商户 ${merchantId} -> ${feishuName}`);
        } else {
          result.failed++;
          console.error(`消息发送失败: 商户 ${merchantId} -> ${feishuName}`);
        }
      }
    }

    console.log('========== 飞书提醒发送完成 ==========');
    console.log('发送结果:', { sent: result.sent, failed: result.failed });

    return NextResponse.json({
      success: true,
      data: result,
      message: `成功发送 ${result.sent} 条提醒消息${result.failed > 0 ? `，${result.failed} 条发送失败` : ''}`,
    });
  } catch (error) {
    console.error('========== 飞书提醒发送异常 ==========');
    console.error('发送飞书提醒失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '发送失败' },
      { status: 500 }
    );
  }
}
