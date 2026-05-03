import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { userId, content } = await request.json();
    
    if (!userId || !content) {
      return NextResponse.json({ 
        success: false, 
        error: '请提供用户ID和消息内容' 
      }, { status: 400 });
    }

    try {
      // 使用 lark-cli 发送消息
      const { stdout } = await execAsync(
        `lark-cli im+send-message --user-id "${userId}" --content "${content}" 2>&1`
      );
      
      return NextResponse.json({ 
        success: true, 
        message: '消息发送成功',
        data: stdout
      });
      
    } catch (execError: any) {
      console.error('lark-cli 执行错误:', execError);
      return NextResponse.json({ 
        success: false, 
        error: `发送失败: ${execError.message}` 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('发送消息错误:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}
