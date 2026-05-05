import { NextRequest, NextResponse } from 'next/server';

/**
 * lark-cli 授权 API
 * 
 * 【已注释】：避免使用 child_process 触发沙箱资源限制
 * 如需恢复，请取消下方注释
 */
export async function POST(request: NextRequest) {
  /*
  try {
    console.log('启动lark-cli授权流程');

    // 执行 lark-cli auth login
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const { stdout, stderr } = await execAsync('lark-cli auth login --no-wait --recommend --json');

    console.log('lark-cli授权输出:', stdout);
    if (stderr) {
      console.error('lark-cli授权错误:', stderr);
    }

    // 尝试解析输出
    let authResult = null;
    try {
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{')) {
          authResult = JSON.parse(line);
          break;
        }
      }
    } catch (e) {
      console.log('无法解析JSON输出，使用默认成功响应');
    }

    return NextResponse.json({
      success: true,
      message: '已启动授权流程，请在浏览器中完成授权',
      result: authResult
    });

  } catch (error) {
    console.error('lark-cli授权失败:', error);
    
    // 如果lark-cli命令不存在，提供友好提示
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { 
          success: false, 
          error: '未找到lark-cli命令，请先安装lark-cli',
          hint: '访问 https://github.com/larksuite/lark-cli 安装'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: '启动授权失败' },
      { status: 500 }
    );
  }
  */

  // 临时返回：避免触发 child_process
  console.log('lark-cli 授权 API 已临时禁用（避免沙箱资源限制）');
  return NextResponse.json(
    { 
      success: false, 
      error: 'lark-cli 功能临时禁用' 
    },
    { status: 503 }
  );
}
