import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { userId, message } = await request.json();

    if (!userId || !message) {
      return NextResponse.json(
        { success: false, error: '请提供用户ID和消息内容' },
        { status: 400 }
      );
    }

    console.log('🚀 使用 lark-cli 发送消息给:', userId);
    console.log('📝 消息内容:', message.substring(0, 100));
    
    // 尝试多种方式发送消息
    
    // 方式1: 使用 lark-cli im +messages-send
    try {
      console.log('📤 方式1: 尝试使用 lark-cli im +messages-send...');
      const command1 = `lark-cli im +messages-send --user-id ${userId} --text "${message.replace(/"/g, '\\"')}" --as user 2>&1`;
      console.log('🔧 执行命令:', command1.substring(0, 100));
      
      const { stdout: stdout1, stderr: stderr1 } = await execAsync(command1);
      console.log('✅ 方式1成功!');
      console.log('📤 输出:', stdout1);
      
      if (stderr1 && !stderr1.includes('warning')) {
        console.log('⚠️ 方式1有警告:', stderr1);
      }
      
      return NextResponse.json({
        success: true,
        message: '消息发送成功',
        output: stdout1
      });
    } catch (error1) {
      console.log('❌ 方式1失败:', error1);
    }
    
    // 方式2: 尝试不带 --as user
    try {
      console.log('📤 方式2: 尝试不带 --as user...');
      const command2 = `lark-cli im +messages-send --user-id ${userId} --text "${message.replace(/"/g, '\\"')}" 2>&1`;
      
      const { stdout: stdout2, stderr: stderr2 } = await execAsync(command2);
      console.log('✅ 方式2成功!');
      
      return NextResponse.json({
        success: true,
        message: '消息发送成功',
        output: stdout2
      });
    } catch (error2) {
      console.log('❌ 方式2失败:', error2);
    }
    
    // 方式3: 尝试使用 chat-id
    try {
      console.log('📤 方式3: 尝试使用 chat-id...');
      const command3 = `lark-cli im +messages-send --chat-id ${userId} --text "${message.replace(/"/g, '\\"')}" 2>&1`;
      
      const { stdout: stdout3, stderr: stderr3 } = await execAsync(command3);
      console.log('✅ 方式3成功!');
      
      return NextResponse.json({
        success: true,
        message: '消息发送成功',
        output: stdout3
      });
    } catch (error3) {
      console.log('❌ 方式3失败:', error3);
    }
    
    // 所有方式都失败
    return NextResponse.json({
      success: false,
      error: '发送消息失败，请确保lark-cli已正确授权'
    }, { status: 500 });

  } catch (error) {
    console.error('发送飞书消息失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '发送失败' },
      { status: 500 }
    );
  }
}
