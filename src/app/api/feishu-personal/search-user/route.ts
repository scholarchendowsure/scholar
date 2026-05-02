import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { error: '查询关键词不能为空' },
        { status: 400 }
      );
    }

    // 使用 lark-cli 搜索用户
    // lark-cli contact +search-user --query "姓名" --page-size 10
    const command = `/usr/bin/lark-cli contact +search-user --query "${query}" --page-size 10 2>&1`;
    
    console.log('执行命令:', command);
    
    const { stdout, stderr } = await execAsync(command);
    
    console.log('命令输出:', stdout);
    if (stderr) {
      console.error('命令错误输出:', stderr);
    }

    // 解析输出结果
    let users = [];
    
    try {
      // 尝试解析 JSON
      const result = JSON.parse(stdout);
      if (result.ok && result.data && result.data.users) {
        users = result.data.users;
      }
    } catch (e) {
      // 如果不是 JSON，尝试解析文本输出
      console.log('不是 JSON 格式，尝试解析文本');
    }

    return NextResponse.json({
      success: true,
      query,
      users,
      rawOutput: stdout
    });
  } catch (error: any) {
    console.error('搜索用户失败:', error);
    
    let errorMessage = '搜索用户失败';
    
    if (error.message && error.message.includes('need_user_authorization')) {
      errorMessage = '需要用户授权，请先在"个人账号绑定"中完成授权';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
