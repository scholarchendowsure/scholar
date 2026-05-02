import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { cliPath = 'lark' } = await request.json();
    
    // 测试lark-cli是否可用
    try {
      const { stdout, stderr } = await execAsync(`${cliPath} --version`);
      return NextResponse.json({
        success: true,
        version: stdout.trim(),
        message: 'lark-cli可用'
      });
    } catch (error: any) {
      // 如果--version失败，尝试help
      try {
        const { stdout, stderr } = await execAsync(`${cliPath} --help`);
        return NextResponse.json({
          success: true,
          message: 'lark-cli可用（无法获取版本，但help命令成功）'
        });
      } catch (helpError: any) {
        return NextResponse.json({
          success: false,
          error: 'lark-cli不可用',
          details: error?.message || helpError?.message
        });
      }
    }
  } catch (error) {
    console.error('测试lark-cli失败:', error);
    return NextResponse.json(
      { success: false, error: '测试失败' },
      { status: 500 }
    );
  }
}
