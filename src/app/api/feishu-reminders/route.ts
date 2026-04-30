import { NextRequest, NextResponse } from 'next/server';
import { getAllHSBCLoans } from '@/storage/database/hsbc-loan-storage';
import { getAllMerchantSalesMappings } from '@/storage/database/merchant-sales-mapping-storage';
import { getFeishuConfig } from '@/storage/database/feishu-config-storage';
import { sendFeishuWebhookMessage } from '@/lib/feishu-api';
import { formatCurrency } from '@/lib/constants';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const { days, batchDate } = await request.json();
    console.log('📋 收到飞书提醒请求:', { days, batchDate });

    // 获取飞书配置
    const config = await getFeishuConfig();
    
    if (!config.webhookUrl) {
      console.log('❌ 飞书 Webhook URL 未配置');
      return NextResponse.json({ 
        success: false, 
        message: '请先配置飞书 Webhook URL' 
      }, { status: 400 });
    }

    console.log('✅ 飞书配置加载成功');

    // 获取商户-销售映射
    const { mappings } = await getAllMerchantSalesMappings(1, 100000);
    console.log('📋 商户-销售映射数量:', mappings.length);

    if (mappings.length === 0) {
      console.log('❌ 没有商户-销售映射数据');
      return NextResponse.json({ 
        success: false, 
        message: '请先配置商户-销售映射关系' 
      }, { status: 400 });
    }

    const merchantToSales = new Map(
      mappings.map(m => [m.merchantId, m.salesFeishuName])
    );

    // 获取所有贷款
    const loans = await getAllHSBCLoans(batchDate);
    console.log('📋 贷款数据数量:', loans.length);

    // 计算日期范围
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + days);
    console.log('📋 目标日期:', format(targetDate, 'yyyy-MM-dd'));

    // 筛选需要提醒的贷款
    const loansToRemind = loans.filter(loan => {
      try {
        const maturityDate = new Date(loan.maturityDate);
        // 检查是否在指定天数内到期
        const diffTime = maturityDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= days;
      } catch {
        return false;
      }
    });
    console.log('📋 需要提醒的贷款数量:', loansToRemind.length);

    if (loansToRemind.length === 0) {
      console.log('✅ 没有需要提醒的贷款');
      return NextResponse.json({ 
        success: true, 
        sentCount: 0,
        message: `没有${days}天内到期的贷款需要提醒` 
      });
    }

    // 发送提醒消息
    let sentCount = 0;
    let failedCount = 0;

    for (const loan of loansToRemind) {
      const salesName = merchantToSales.get(loan.merchantId);
      
      if (!salesName) {
        console.log(`⚠️ 商户 ${loan.merchantId} 没有对应的销售，跳过`);
        continue;
      }

      // 构建消息
      const balance = loan.balance || loan.loanAmount;
      const message = `${salesName}，${loan.merchantId}有一笔${formatCurrency(balance)}${loan.loanCurrency || 'CNY'}在${format(new Date(loan.maturityDate), 'yyyy-MM-dd')}需要到期还款，记得要及时跟进`;
      
      console.log(`📤 发送消息给 ${salesName}:`, message);

      // 发送飞书消息
      const result = await sendFeishuWebhookMessage(config.webhookUrl, message);
      
      if (result.success) {
        sentCount++;
        console.log(`✅ 消息发送成功: ${salesName}`);
      } else {
        failedCount++;
        console.log(`❌ 消息发送失败: ${salesName}`);
      }
    }

    console.log(`📊 发送完成: 成功 ${sentCount} 条，失败 ${failedCount} 条`);

    return NextResponse.json({ 
      success: true, 
      sentCount,
      failedCount,
      message: `发送完成：成功 ${sentCount} 条，失败 ${failedCount} 条` 
    });

  } catch (error) {
    console.error('❌ 发送飞书提醒失败:', error);
    return NextResponse.json({ 
      success: false, 
      message: '发送飞书提醒失败，请稍后重试' 
    }, { status: 500 });
  }
}
