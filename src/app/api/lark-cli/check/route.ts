import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    // 检查 lark-cli 是否安装
    try {
      const { stdout } = await execAsync('lark-cli --version 2>&1');
      
      return NextResponse.json({
        success: true,
        installed: true,
        version: stdout.trim()
      });
    } catch (error) {
      // lark-cli 未安装
      return NextResponse.json({
        success: true,
        installed: false,
        version: null
      });
    }

  } catch (error) {
    console.error('检查lark-cli失败:', error);
    return NextResponse.json(
      { success: false, error: '检查失败' },
      { status: 500 }
    );
  }
}
