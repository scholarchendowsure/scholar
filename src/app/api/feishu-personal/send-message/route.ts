
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { receiveId, text, userIdType = 'open_id', cliPath = 'lark' } = await request.json();
    
    if (!receiveId || !text) {
      return NextResponse.json({ 
        success: false, 
        error: '请提供接收人ID和消息内容' 
      }, { status: 400 });
    }

    try {
      console.log('📤 使用 lark-cli 发送消息');
      console.log('👤 接收人ID:', receiveId);
      console.log('📝 ID类型:', userIdType);
      console.log('💬 消息内容:', text.substring(0, 50) + (text.length &gt; 50 ? '...' : ''));
      
      // 使用 lark-cli 发送消息
      // 先尝试用 im message send 命令
      let command = '';
      
      // 尝试几种不同的方式发送消息
      const sendMethods = [
        // 方式1: 使用 im message send
        `${cliPath} im message send --user-id "${receiveId}" --text "${text.replace(/"/g, '\\"')}"`,
        // 方式2: 使用 im +send
        `${cliPath} im +send --user-id "${receiveId}" --text "${text.replace(/"/g, '\\"')}"`,
        // 方式3: 使用 api 直接调用
        `${cliPath} api POST /open-apis/im/v1/messages --params '{"receive_id_type":"${userIdType}"}' --data '{"receive_id":"${receiveId}","msg_type":"text","content":"{\\\"text\\\":\\\"${text.replace(/"/g, '\\\\\\"')}\\\"}"}'`
      ];
      
      let lastError: any = null;
      let successResult: any = null;
      
      for (let i = 0; i &lt; sendMethods.length; i++) {
        try {
          console.log(`🔄 尝试方式 ${i + 1}:`, sendMethods[i].substring(0, 100) + '...');
          
          const { stdout, stderr } = await execAsync(sendMethods[i]);
          
          console.log('✅ 方式', i + 1, '成功!');
          console.log('📡 stdout:', stdout);
          
          if (stderr) {
            console.warn('⚠️ stderr:', stderr);
          }
          
          successResult = { stdout, stderr };
          break;
        } catch (error: any) {
          console.warn('⚠️ 方式', i + 1, '失败:', error.message);
          lastError = error;
          
          // 如果是最后一个方式还失败，就抛出错误
          if (i === sendMethods.length - 1) {
            throw error;
          }
        }
      }
      
      if (!successResult) {
        throw lastError || new Error('所有发送方式都失败了');
      }
      
      return NextResponse.json({ 
        success: true, 
        message: '消息发送成功',
        data: successResult.stdout ? successResult.stdout.substring(0, 500) : null
      });
      
    } catch (cliError: any) {
      console.error('❌ lark-cli 执行失败:', cliError);
      const errorMsg = cliError.message || cliError.stderr || 'lark-cli 执行失败';
      
      // 给用户友好的提示
      let userFriendlyError = errorMsg;
      if (errorMsg.includes('not authorized') || errorMsg.includes('unauthorized')) {
        userFriendlyError = '请先完成 lark-cli 授权：在服务器终端执行 "lark-cli auth login --recommend"';
      } else if (errorMsg.includes('not found') || errorMsg.includes('command not found')) {
        userFriendlyError = 'lark-cli 未找到，请先安装 lark-cli';
      }
      
      return NextResponse.json({ 
        success: false, 
        error: `发送失败: ${userFriendlyError}` 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ 发送消息错误:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}
