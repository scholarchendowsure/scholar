import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(request: NextRequest) {
  let connection: mysql.Connection | null = null;
  
  try {
    const { loanCode } = await request.json();
    
    if (!loanCode) {
      return NextResponse.json({
        success: false,
        message: '缺少 loanCode 参数'
      }, { status: 400 });
    }

    console.log('开始综合查询，loanCode:', loanCode);

    // 创建数据库连接
    connection = await mysql.createConnection({
      host: 'rr-uf62f73r85y150vi6do.mysql.rds.aliyuncs.com',
      port: 3306,
      user: 'scholar',
      password: 'q5tM&Z0xV7cHdZ0u',
    });

    console.log('MySQL 数据库连接成功！');

    const result: any = {
      success: true,
      message: '查询成功',
      data: {}
    };

    // 第一步：查询 application_code
    console.log('第一步：查询 application_code');
    await connection.query('USE `dsb_seller_center`');
    const [overdueResult] = await connection.query(
      'SELECT application_code FROM t_overdue_record WHERE loan_code = ? LIMIT 1',
      [loanCode]
    );
    
    const overdueRows = overdueResult as any[];
    if (overdueRows.length === 0) {
      return NextResponse.json({
        success: false,
        message: `未找到 loanCode = ${loanCode} 的记录`
      }, { status: 404 });
    }
    
    const applicationCode = overdueRows[0].application_code;
    result.data.step1 = {
      loanCode,
      applicationCode
    };
    console.log('第一步完成，applicationCode:', applicationCode);

    // 第二步：查询所有 offer_id
    console.log('第二步：查询 offer_id 列表');
    const [offerResult] = await connection.query(
      'SELECT offer_id FROM ci_shop_offer WHERE application_code = ?',
      [applicationCode]
    );
    
    const offerRows = offerResult as any[];
    const offerIds = offerRows.map((row: any) => row.offer_id);
    result.data.step2 = {
      applicationCode,
      offerIds,
      offerCount: offerIds.length
    };
    console.log('第二步完成，找到', offerIds.length, '个 offer_id');

    if (offerIds.length === 0) {
      return NextResponse.json(result);
    }

    // 第三步：查询 dsb_offer_history 表，取最新的 latest_dataset
    console.log('第三步：查询 dsb_offer_history');
    await connection.query('USE `dsb_amazon_loan`');
    
    // 构建 IN 查询，字段名是 offerId（驼峰命名）
    const placeholders = offerIds.map(() => '?').join(',');
    const [historyResult] = await connection.query(
      `SELECT offerId, latest_dataset, last_updated_on 
       FROM dsb_offer_history 
       WHERE offerId IN (${placeholders})
       ORDER BY last_updated_on DESC`,
      offerIds
    );
    
    const historyRows = historyResult as any[];
    
    // 对每个 offerId 只保留最新的一条记录
    const latestByOffer: Record<string, any> = {};
    for (const row of historyRows) {
      if (!latestByOffer[row.offerId]) {
        latestByOffer[row.offerId] = row;
      }
    }
    
    const latestRecords = Object.values(latestByOffer);
    result.data.step3 = {
      offerIds,
      totalRecords: historyRows.length,
      latestRecords,
      latestCount: latestRecords.length
    };
    console.log('第三步完成，找到', latestRecords.length, '条最新记录');

    // 关闭连接
    await connection.end();
    console.log('MySQL 连接已关闭');

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('综合查询失败:', error);
    
    // 确保连接关闭
    if (connection) {
      try {
        await connection.end();
      } catch (e) {
        // 忽略关闭连接时的错误
      }
    }
    
    return NextResponse.json({
      success: false,
      message: error.message || '查询失败'
    }, { status: 500 });
  }
}