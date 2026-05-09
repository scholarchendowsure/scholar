import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(request: NextRequest) {
  try {
    const { host, port, user, password } = await request.json();

    // 创建数据库连接
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
    });

    console.log('✅ MySQL 数据库连接成功');

    // 测试查询
    const [rows] = await connection.execute('SELECT NOW() as now');

    console.log('✅ 数据库查询成功:', rows);

    // 关闭连接
    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'MySQL数据库连接成功',
      data: rows
    });
  } catch (error: any) {
    console.error('❌ MySQL 数据库连接失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'MySQL数据库连接失败'
    }, { status: 500 });
  }
}
