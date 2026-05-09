import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(request: NextRequest) {
  let connection: mysql.Connection | null = null;
  
  try {
    const { loanCode } = await request.json();
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: 'rr-uf62f73r85y150vi6do.mysql.rds.aliyuncs.com',
      port: 3306,
      user: 'scholar',
      password: 'q5tM&Z0xV7cHdZ0u',
    });

    // 第一步：在 dsb_seller_center.t_overdue_record 表中查找 application_code
    await connection.query('USE `dsb_seller_center`');
    const [overdueRecords] = await connection.execute(
      'SELECT application_code FROM t_overdue_record WHERE loan_code = ? LIMIT 1',
      [loanCode]
    );
    
    if (!Array.isArray(overdueRecords) || overdueRecords.length === 0) {
      await connection.end();
      return NextResponse.json({
        success: false,
        message: '未找到对应的贷款记录'
      }, { status: 404 });
    }

    const applicationCode = (overdueRecords[0] as any).application_code;

    // 第二步：在 dsb_seller_center.ci_shop_offer 表中查找 offer_id
    const [offerRecords] = await connection.execute(
      'SELECT offer_id FROM ci_shop_offer WHERE application_code = ?',
      [applicationCode]
    );
    
    if (!Array.isArray(offerRecords) || offerRecords.length === 0) {
      await connection.end();
      return NextResponse.json({
        success: false,
        message: '未找到对应的 offer_id'
      }, { status: 404 });
    }

    const offerIds = offerRecords.map((record: any) => record.offer_id);

    // 第三步：在 dsb_amazon_loan.dsb_offer_history 表中查询
    await connection.query('USE `dsb_amazon_loan`');
    
    // 对每个 offerId 查询全部记录
    const allRecords: any[] = [];
    
    for (const offerId of offerIds) {
      const [records] = await connection.execute(
        'SELECT offerId, last_updated_on, latest_dataset ' +
        'FROM dsb_offer_history ' +
        'WHERE offerId = ? ' +
        'ORDER BY last_updated_on DESC',
        [offerId]
      );
      
      if (Array.isArray(records)) {
        (records as any[]).forEach(record => {
          allRecords.push(record);
        });
      }
    }

    // 关闭连接
    await connection.end();

    return NextResponse.json({
      success: true,
      message: '查询成功',
      data: {
        step1: {
          loanCode,
          applicationCode
        },
        step2: {
          applicationCode,
          offerIds,
          offerCount: offerIds.length
        },
        step3: {
          offerIds,
          totalRecords: allRecords.length,
          allRecords
        }
      }
    });
  } catch (error: any) {
    console.error('查询失败:', error);
    
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