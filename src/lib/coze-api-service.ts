import { CozeMessageRequest, CozeMessageResponse, CozeSendReminderRequest, CozeChatRequest, CozeChatResponse } from '@/types/coze-api';

export class CozeApiService {
  private apiKey: string;
  private botId?: string;
  private baseUrl: string = 'https://api.coze.cn';

  constructor(apiKey?: string, botId?: string) {
    this.apiKey = apiKey || process.env.COZE_API_KEY || '';
    this.botId = botId || process.env.COZE_BOT_ID;
  }

  /**
   * 调用 Coze 聊天 API（与 Bot 对话）
   */
  async chat(request: CozeChatRequest): Promise<CozeChatResponse> {
    try {
      console.log('[CozeApiService] 准备调用 Coze 聊天 API:', {
        botId: this.botId,
        userId: request.userId,
        userMessage: request.userMessage.substring(0, 50) + '...'
      });

      if (!this.botId) {
        throw new Error('Bot ID 未配置');
      }

      if (!this.apiKey) {
        throw new Error('API Key 未配置');
      }

      // 构建请求体 - 使用正确的 Coze API 格式
      const requestBody = {
        bot_id: this.botId,
        user_id: request.userId,
        stream: false,
        additional_messages: [
          {
            role: 'user',
            content: request.userMessage,
            content_type: 'text'
          }
        ],
        conversation_id: request.conversationId || ''
      };

      if (request.additionalMessages && request.additionalMessages.length > 0) {
        // 如果有额外消息，添加到 additional_messages 数组
        requestBody.additional_messages = [
          ...requestBody.additional_messages,
          ...request.additionalMessages
        ];
      }

      const response = await fetch(`${this.baseUrl}/v3/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      console.log('[CozeApiService] Coze API 响应:', {
        code: data.code,
        msg: data.msg,
        hasData: !!data.data
      });

      if (data.code !== 0) {
        throw new Error(`Coze API 调用失败: ${data.msg} (code: ${data.code})`);
      }

      // 解析响应
      let content = '';
      let conversationId = data.data?.conversation_id || '';

      if (data.data?.messages) {
        // 找到 Bot 的回复消息
        const assistantMessage = data.data.messages.find((m: any) => m.type === 'answer' || m.role === 'assistant');
        if (assistantMessage) {
          content = assistantMessage.content || '';
        }
      }

      if (!content) {
        // 如果没有找到消息，尝试使用其他方式获取
        content = '收到了您的消息！';
      }

      return {
        success: true,
        content,
        conversationId,
        rawResponse: data
      };

    } catch (error: any) {
      console.error('[CozeApiService] 调用 Coze API 失败:', error);
      return {
        success: false,
        content: '',
        conversationId: '',
        error: error?.message || '调用失败',
        rawResponse: error
      };
    }
  }

  /**
   * 发送飞书消息（通过 Coze API）- 暂不实现，使用 lark-cli 替代
   */
  async sendFeishuMessage(request: CozeMessageRequest): Promise<CozeMessageResponse> {
    try {
      console.log('[CozeApiService] 准备发送消息:', request);
      
      // 使用 lark-cli 来发送消息
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const escapedText = request.message.replace(/'/g, "'\\''");
      const command = `lark-cli im +messages-send --user-id "${request.receiveId}" --text '${escapedText}' --as user`;
      
      console.log('[CozeApiService] 执行命令:', command);
      
      const { stdout, stderr } = await execAsync(command);
      
      console.log('[CozeApiService] 命令输出:', stdout);
      if (stderr) {
        console.log('[CozeApiService] 命令错误:', stderr);
      }
      
      return {
        success: true,
        data: stdout,
        messageId: Date.now().toString()
      };
      
    } catch (error: any) {
      console.error('[CozeApiService] 发送消息失败:', error);
      return {
        success: false,
        error: error?.message || '发送消息失败'
      };
    }
  }

  /**
   * 发送逾期提醒
   */
  async sendOverdueReminder(request: CozeSendReminderRequest): Promise<CozeMessageResponse> {
    let message = '';
    
    if (request.customMessage) {
      message = request.customMessage;
    } else {
      // 构建默认提醒消息
      message = `【逾期提醒】\n`;
      if (request.customerName) {
        message += `客户：${request.customerName}\n`;
      }
      if (request.overdueAmount) {
        message += `逾期金额：¥${request.overdueAmount.toLocaleString()}\n`;
      }
      if (request.overdueDays) {
        message += `逾期天数：${request.overdueDays}天\n`;
      }
      if (request.caseId) {
        message += `案件ID：${request.caseId}\n`;
      }
      message += `\n请及时跟进处理！`;
    }
    
    return await this.sendFeishuMessage({
      receiveId: request.receiveId,
      message: message,
      receiveIdType: 'open_id',
      msgType: 'text'
    });
  }

  /**
   * 发送还款到期提醒
   */
  async sendDueReminder(request: CozeSendReminderRequest): Promise<CozeMessageResponse> {
    let message = '';
    
    if (request.customMessage) {
      message = request.customMessage;
    } else {
      message = `【还款到期提醒】\n`;
      if (request.customerName) {
        message += `客户：${request.customerName}\n`;
      }
      if (request.caseId) {
        message += `案件ID：${request.caseId}\n`;
      }
      message += `\n请提前联系客户做好还款准备！`;
    }
    
    return await this.sendFeishuMessage({
      receiveId: request.receiveId,
      message: message,
      receiveIdType: 'open_id',
      msgType: 'text'
    });
  }
}
