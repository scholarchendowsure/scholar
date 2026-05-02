import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { feishuPersonalStorage } from '@/storage/database/feishu-personal-storage';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { receiveId, text, userId } = await request.json();
    
    if (!receiveId || !text) {
      return NextResponse.json(
        { success: false, error: '接收人ID和消息内容不能为空' },
        { status: 400 }
      );
    }

    // 获取配置
    const config = feishuPersonalStorage.getConfig();
    const cliPath = config.cliPath || 'lark';

    try {
      console.log(`[lark-cli] 准备发送消息给: ${receiveId}`);
      console.log(`[lark-cli] 消息内容: ${text}`);
      
      // 先尝试测试CLI是否可用
      let cliAvailable = false;
      try {
        await execAsync(`${cliPath} --version`);
        cliAvailable = true;
        console.log('[lark-cli] CLI可用');
      } catch (cliError) {
        console.log('[lark-cli] CLI不可用:', cliError);
      }
      
      if (!cliAvailable) {
        // CLI不可用，返回说明
        return NextResponse.json({
          success: false,
          error: 'lark-cli未安装或未配置',
          setupGuide: {
            step1: '通过 npm 安装 lark-cli: npm install -g @larksuite/cli',
            step2: '初始化配置: lark-cli config init',
            step3: '登录授权: lark-cli auth login --recommend',
            step4: '验证配置: lark-cli doctor',
            note: '完成以上步骤后，即可在系统中发送消息'
          },
          mockResult: {
            receiveId,
            text,
            sentAt: new Date().toISOString()
          }
        });
      }
      
      // 检查是否已登录授权
      let authStatus = null;
      try {
        const { stdout: authStdout } = await execAsync(`${cliPath} auth status`);
        authStatus = authStdout.trim();
        console.log('[lark-cli] 认证状态:', authStatus);
      } catch (authError) {
        console.log('[lark-cli] 检查认证状态失败:', authError);
      }
      
      if (!authStatus || !authStatus.includes('user')) {
        // 未登录，返回登录指引
        return NextResponse.json({
          success: false,
          error: '未登录飞书账号',
          setupGuide: {
            step1: '登录授权: lark-cli auth login --recommend',
            step2: '验证认证: lark-cli auth status',
            step3: '健康检查: lark-cli doctor',
            note: '请在服务器终端执行以上命令完成个人账号登录授权'
          },
          mockResult: {
            receiveId,
            text,
            sentAt: new Date().toISOString()
          }
        });
      }
      
      // CLI可用且已登录，尝试发送消息
      // 使用 lark-cli 的简单参数发送消息
      // 命令格式: lark-cli im +messages-send --user-id ou_xxx --text "消息内容" --as user
      
      // 构造命令，text需要特殊处理，避免shell转义问题
      // 使用JSON格式的参数会更安全
      
      // 方案1：使用简单的 --text 参数（推荐）
      // 需要对text进行shell转义，避免包含引号、空格等导致的问题
      const escapedText = text.replace(/'/g, "'\\''");
      const command = `${cliPath} im +messages-send --user-id "${receiveId}" --text '${escapedText}' --as user`;
      
      console.log('[lark-cli] 执行命令:', command);
      
      const { stdout, stderr } = await execAsync(command);
      
      console.log('[lark-cli] 命令输出:', stdout);
      if (stderr) {
        console.log('[lark-cli] 命令错误:', stderr);
      }
      
      return NextResponse.json({
        success: true,
        message: '消息发送成功',
        result: stdout,
        sentAt: new Date().toISOString()
      });
      
    } catch (execError: any) {
      console.error('执行lark-cli失败:', execError);
      return NextResponse.json({
        success: false,
        error: '执行lark-cli失败',
        details: execError?.message,
        stderr: execError?.stderr
      });
    }
  } catch (error) {
    console.error('发送消息失败:', error);
    return NextResponse.json(
      { success: false, error: '发送失败' },
      { status: 500 }
    );
  }
}
