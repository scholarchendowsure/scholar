import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // 设置配置目录（避免与系统配置冲突）
    const configDir = '/tmp/lark-cli-config';
    
    // 尝试直接使用已有的配置
    try {
      const checkResult = await execAsync('/usr/bin/lark-cli auth status', {
        env: {
          ...process.env,
          LARK_CONFIG_DIR: configDir
        }
      });
      
      if (checkResult.stdout && checkResult.stdout.includes('logged in')) {
        return NextResponse.json({
          success: true,
          alreadyLoggedIn: true,
          message: '您已经登录了！'
        });
      }
    } catch (checkError) {
      // 未登录，继续
    }

    // 初始化配置
    try {
      await execAsync('/usr/bin/lark-cli config init --new', {
        env: {
          ...process.env,
          LARK_CONFIG_DIR: configDir
        },
        timeout: 10000
      });
    } catch (initError) {
      // 初始化可能会失败，但没关系，继续
    }

    // 启动授权登录（获取验证URL）
    // 注意：lark-cli auth login --recommend 是交互式的，我们需要特殊处理
    // 让我们尝试直接运行并捕获输出
    const authProcess = exec('/usr/bin/lark-cli auth login --recommend', {
      env: {
        ...process.env,
        LARK_CONFIG_DIR: configDir
      }
    });

    let output = '';
    authProcess.stdout?.on('data', (data) => {
      output += data.toString();
    });

    authProcess.stderr?.on('data', (data) => {
      output += data.toString();
    });

    // 给它3秒钟时间来输出验证URL
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 尝试从输出中提取验证URL
    const urlMatch = output.match(/https?:\/\/[^\s]+/);
    const verificationUrl = urlMatch ? urlMatch[0] : null;

    return NextResponse.json({
      success: true,
      message: '请在浏览器中打开以下链接完成授权',
      verificationUrl: verificationUrl,
      rawOutput: output,
      hint: '如果没有看到验证URL，请在服务器终端直接执行: lark-cli auth login --recommend'
    });

  } catch (error: any) {
    console.error('lark-cli 授权初始化失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
