import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const configDir = '/tmp/lark-cli-config';
    
    try {
      const result = await execAsync('/usr/bin/lark-cli auth status', {
        env: {
          ...process.env,
          LARK_CONFIG_DIR: configDir
        }
      });

      return NextResponse.json({
        success: true,
        status: result.stdout,
        isLoggedIn: result.stdout.includes('logged in')
      });
    } catch (error) {
      return NextResponse.json({
        success: true,
        status: '未登录',
        isLoggedIn: false
      });
    }
  } catch (error: any) {
    console.error('检查授权状态失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
