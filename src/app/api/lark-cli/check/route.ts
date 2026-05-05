import { NextRequest, NextResponse } from 'next/server';

/**
 * lark-cli 检查 API
 * 
 * 【已注释】：避免使用 child_process 触发沙箱资源限制
 * 如需恢复，请取消下方注释
 */
export async function GET(request: NextRequest) {
  /*
  try {
    // 检查 lark-cli 是否安装
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

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
  */

  // 临时返回：避免触发 child_process
  console.log('lark-cli 检查 API 已临时禁用（避免沙箱资源限制）');
  return NextResponse.json(
    { 
      success: false, 
      error: 'lark-cli 功能临时禁用' 
    },
    { status: 503 }
  );
}
