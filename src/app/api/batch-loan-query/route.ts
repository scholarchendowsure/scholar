import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

interface LoanQueryResult {
  loan_code: string;
  application_code: string | null;
  offer_ids: string[];
  offer_dataset: string | null;
  update_time: string | null;
  // 解析后的字段
  绑定店铺数量: string | null;
  未来应收在贷金额: string | null;
  未来应收: string | null;
  在贷金额: string | null;
  未来应收库存在贷金额: string | null;
  库存金额: string | null;
}

/**
 * 解析offer_dataset字段，提取所需信息
 */
function parseOfferDataset(dataset: string | null): Partial<LoanQueryResult> {
  if (!dataset) {
    return {
      绑定店铺数量: null,
      未来应收在贷金额: null,
      未来应收: null,
      在贷金额: null,
      未来应收库存在贷金额: null,
      库存金额: null,
    };
  }

  try {
    // 解析JSON数据
    const data = typeof dataset === 'string' ? JSON.parse(dataset) : dataset;
    
    return {
      绑定店铺数量: data.bind_shop_count?.toString() || data.bindShopCount?.toString() || null,
      未来应收在贷金额: data.future_receive_or_loan_amount?.toString() || data.futureReceiveOrLoanAmount?.toString() || null,
      未来应收: data.future_receive?.toString() || data.futureReceive?.toString() || null,
      在贷金额: data.loan_amount?.toString() || data.loanAmount?.toString() || null,
      未来应收库存在贷金额: data.future_receive_and_inventory_or_loan_amount?.toString() || data.futureReceiveAndInventoryOrLoanAmount?.toString() || null,
      库存金额: data.inventory_amount?.toString() || data.inventoryAmount?.toString() || null,
    };
  } catch (e) {
    console.error('解析offer_dataset失败:', e);
    return {
      绑定店铺数量: null,
      未来应收在贷金额: null,
      未来应收: null,
      在贷金额: null,
      未来应收库存在贷金额: null,
      库存金额: null,
    };
  }
}

export async function POST(request: NextRequest) {
  let connection: mysql.Connection | null = null;
  
  try {
    const { loanCodes } = await request.json();
    
    if (!loanCodes || !Array.isArray(loanCodes)) {
      return NextResponse.json({
        success: false,
        message: '缺少loanCodes参数'
      }, { status: 400 });
    }

    // 创建数据库连接
    connection = await mysql.createConnection({
      host: 'rr-uf62f73r85y150vi6do.mysql.rds.aliyuncs.com',
      port: 3306,
      user: 'scholar',
      password: 'q5tM&Z0xV7cHdZ0u',
    });

    const results: LoanQueryResult[] = [];

    // 遍历每个loan_code查询
    for (const loanCode of loanCodes) {
      const result: LoanQueryResult = {
        loan_code: loanCode,
        application_code: null,
        offer_ids: [],
        offer_dataset: null,
        update_time: null,
        绑定店铺数量: null,
        未来应收在贷金额: null,
        未来应收: null,
        在贷金额: null,
        未来应收库存在贷金额: null,
        库存金额: null,
      };

      try {
        // 第一步：在 dsb_seller_center.t_overdue_record 表中查找 application_code
        await connection.query('USE `dsb_seller_center`');
        const [overdueRecords] = await connection.execute(
          'SELECT application_code FROM t_overdue_record WHERE loan_code = ? LIMIT 1',
          [loanCode]
        );
        
        if (Array.isArray(overdueRecords) && overdueRecords.length > 0) {
          result.application_code = (overdueRecords[0] as any).application_code;
        }

        // 第二步：在 dsb_seller_center.ci_shop_offer 表中查找 offer_id
        if (result.application_code) {
          const [offerRecords] = await connection.execute(
            'SELECT offer_id FROM ci_shop_offer WHERE application_code = ?',
            [result.application_code]
          );
          
          if (Array.isArray(offerRecords) && offerRecords.length > 0) {
            result.offer_ids = offerRecords.map((record: any) => record.offer_id);
          }
        }

        // 第三步：在 dsb_amazon_loan.dsb_offer_history 表中查找 offer_dataset
        if (result.offer_ids.length > 0) {
          await connection.query('USE `dsb_amazon_loan`');
          
          let latestDataset: string | null = null;
          let latestTime: string | null = null;

          for (const offerId of result.offer_ids) {
            const [records] = await connection.execute(
              'SELECT latest_dataset, update_time FROM dsb_offer_history WHERE offerId = ?',
              [offerId]
            );
            
            if (Array.isArray(records)) {
              for (const record of records as any[]) {
                const updateTime = record.update_time;
                const dataset = record.latest_dataset;
                
                // 只取最新日期且非空的数据
                if (dataset && (!latestTime || updateTime > latestTime)) {
                  latestTime = updateTime;
                  latestDataset = dataset;
                }
              }
            }
          }

          result.offer_dataset = latestDataset;
          result.update_time = latestTime;

          // 解析offer_dataset
          if (latestDataset) {
            const parsed = parseOfferDataset(latestDataset);
            result.绑定店铺数量 = parsed.绑定店铺数量 ?? null;
            result.未来应收在贷金额 = parsed.未来应收在贷金额 ?? null;
            result.未来应收 = parsed.未来应收 ?? null;
            result.在贷金额 = parsed.在贷金额 ?? null;
            result.未来应收库存在贷金额 = parsed.未来应收库存在贷金额 ?? null;
            result.库存金额 = parsed.库存金额 ?? null;
          }
        }
      } catch (e) {
        console.error(`查询 ${loanCode} 失败:`, e);
      }

      results.push(result);
    }

    // 关闭连接
    await connection.end();

    return NextResponse.json({
      success: true,
      message: '查询成功',
      total: results.length,
      data: results
    });

  } catch (error: any) {
    console.error('批量查询失败:', error);
    
    if (connection) {
      try {
        await connection.end();
      } catch (e) {
        // 忽略
      }
    }
    
    return NextResponse.json({
      success: false,
      message: error.message || '查询失败'
    }, { status: 500 });
  }
}
