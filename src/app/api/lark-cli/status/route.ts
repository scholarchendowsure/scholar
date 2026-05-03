import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    // 尝试获取lark-cli状态
    try {
      const { stdout } = await execAsync('lark-cli auth status --json 2>/dev/null || lark-cli auth status 2>/dev/null');
      
      console.log('lark-cli状态:', stdout);
      
      let isAuthenticated = false;
      let userInfo: any = null;
      
      // 尝试解析JSON
      try {
        const statusData = JSON.parse(stdout);
        isAuthenticated = statusData.authenticated || statusData.is_authenticated || false;
        userInfo = statusData.user || statusData.user_info || null;
      } catch {
        // 如果不是JSON，通过文本判断
        isAuthenticated = stdout.includes('authenticated') || 
                         stdout.includes('已登录') || 
                         stdout.includes('Logged in');
      }

      return NextResponse.json({
        success: true,
        isAuthenticated,
        userInfo,
        rawOutput: stdout
      });

    } catch (error) {
      console.log('无法获取lark-cli状态，可能未授权:', error);
      return NextResponse.json({
        success: true,
        isAuthenticated: false,
        userInfo: null
      });
    }

  } catch (error) {
    console.error('检查lark-cli状态失败:', error);
    return NextResponse.json(
      { success: false, error: '检查状态失败' },
      { status: 500 }
    );
  }
}
