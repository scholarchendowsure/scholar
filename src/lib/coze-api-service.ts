import { CozeMessageRequest, CozeMessageResponse, CozeSendReminderRequest } from '@/types/coze-api';

export class CozeApiService {
  private apiKey: string;
  private botId?: string;
  private baseUrl: string = 'https://api.coze.cn';

  constructor(apiKey?: string, botId?: string) {
    this.apiKey = apiKey || process.env.COZE_API_KEY || '';
    this.botId = botId || process.env.COZE_BOT_ID;
  }

  /**
   * 发送飞书消息（通过 Coze API）
   */
  async sendFeishuMessage(request: CozeMessageRequest): Promise<CozeMessageResponse> {
    try {
      // 这里我们使用 lark-cli 来发送消息，因为用户已经配置好了 lark-cli
      // Coze API 可以作为备用方案
      
      console.log('[CozeApiService] 准备发送消息:', request);
      
      // 方案1：直接使用已有的 lark-cli 发送消息（推荐）
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
