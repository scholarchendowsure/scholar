import { NextResponse } from 'next/server';

/**
 * 飞书个人授权状态 API
 * 
 * 【已注释】：避免使用 child_process 触发沙箱资源限制
 * 如需恢复，请取消下方注释
 */
export async function GET() {
  /*
  try {
    const configDir = '/tmp/lark-cli-config';
    
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

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
  */

  // 临时返回：避免触发 child_process
  console.log('feishu-personal 授权状态 API 已临时禁用（避免沙箱资源限制）');
  return NextResponse.json(
    { 
      success: false, 
      error: 'feishu-personal 功能临时禁用' 
    },
    { status: 503 }
  );
}
