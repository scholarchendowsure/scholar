import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(request: NextRequest) {
  try {
    const { host, port, user, password, mode = 'summary', databaseName, tableName } = await request.json();

    console.log('开始连接 MySQL 数据库，模式:', mode);

    // 创建数据库连接
    const connection = await mysql.createConnection({
      host,
      port: Number(port),
      user,
      password,
    });

    console.log('MySQL 数据库连接成功！');

    let result: any = {
      success: true,
      message: 'MySQL数据库连接成功',
      mode,
      data: {}
    };

    // 模式1：summary - 只获取数据库列表和当前时间
    if (mode === 'summary') {
      const [databases] = await connection.query('SHOW DATABASES');
      const dbList = (databases as any[]).map((db: any) => db.Database);
      const userDatabases = dbList.filter((db: string) => 
        !['information_schema', 'performance_schema', 'mysql', 'sys'].includes(db)
      );

      const [timeResult] = await connection.query('SELECT NOW() as `current_time`');
      const currentTime = (timeResult as any[])[0].current_time;

      result.data = {
        currentTime,
        totalDatabases: dbList.length,
        userDatabases,
        userDatabaseCount: userDatabases.length
      };
    }

    // 模式2：quick - 获取指定数据库的前5个表的统计
    else if (mode === 'quick' && databaseName) {
      await connection.query('USE `' + databaseName + '`');
      
      const [tables] = await connection.query('SHOW TABLES');
      const tableList = (tables as any[]).map((t: any) => Object.values(t)[0]);
      const first5Tables = tableList.slice(0, 5);
      
      const tablesInfo: any[] = [];
      for (const tableName of first5Tables) {
        try {
          const [countResult] = await connection.query('SELECT COUNT(*) as total FROM `' + tableName + '`');
          tablesInfo.push({
            name: tableName,
            totalRows: (countResult as any[])[0].total
          });
        } catch (e) {
          tablesInfo.push({
            name: tableName,
            error: '无法读取'
          });
        }
      }

      result.data = {
        databaseName,
        totalTables: tableList.length,
        quickTables: tablesInfo,
        hasMoreTables: tableList.length > 5
      };
    }

    // 模式3：full - 获取指定表的完整数据
    else if (mode === 'full' && databaseName && tableName) {
      await connection.query('USE `' + databaseName + '`');
      
      const [countResult] = await connection.query('SELECT COUNT(*) as total FROM `' + tableName + '`');
      const totalRows = (countResult as any[])[0].total;
      
      const [columns] = await connection.query('DESCRIBE `' + tableName + '`');
      
      let data = [] as any[];
      if (totalRows > 0) {
        const [queryResult] = await connection.query('SELECT * FROM `' + tableName + '`');
        data = queryResult as any[];
      }

      result.data = {
        databaseName,
        tableName,
        totalRows,
        columns,
        data
      };
    }

    // 关闭连接
    await connection.end();
    console.log('MySQL 连接已关闭');

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('MySQL 数据库连接失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'MySQL数据库连接失败'
    }, { status: 500 });
  }
}
