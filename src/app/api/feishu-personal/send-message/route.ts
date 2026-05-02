import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { receiveId, text } = await request.json();
    
    if (!receiveId || !text) {
      return NextResponse.json(
        { success: false, error: '接收人ID和消息内容不能为空' },
        { status: 400 }
      );
    }

    // 直接使用我们已确认可用的路径
    const cliPath = '/usr/bin/lark-cli';
    
    console.log(`[lark-cli] 准备发送消息给: ${receiveId}`);
    console.log(`[lark-cli] 消息内容: ${text}`);
      
    // 使用 lark-cli 发送消息
    // 命令格式: lark-cli im +messages-send --user-id ou_xxx --text "消息内容" --as user
      
    // 对text进行shell转义，避免包含引号、空格等导致的问题
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
      
  } catch (error: any) {
    console.error('发送消息失败:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '发送失败' },
      { status: 500 }
    );
  }
}
