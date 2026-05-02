import { NextRequest, NextResponse } from 'next/server';
import { CozeApiService } from '@/lib/coze-api-service';
import { cozeApiStorage } from '@/storage/database/coze-api-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      caseId, 
      customerName, 
      overdueAmount, 
      overdueDays, 
      receiveId, 
      reminderType,
      customMessage 
    } = body;
    
    if (!receiveId) {
      return NextResponse.json(
        { success: false, error: '接收人ID不能为空' },
        { status: 400 }
      );
    }

    const config = cozeApiStorage.getConfig();
    const service = new CozeApiService(config.apiKey, config.botId);
    
    let result;
    
    if (reminderType === 'overdue') {
      result = await service.sendOverdueReminder({
        caseId,
        customerName,
        overdueAmount,
        overdueDays,
        receiveId,
        reminderType: 'overdue',
        customMessage
      });
    } else if (reminderType === 'due') {
      result = await service.sendDueReminder({
        caseId,
        customerName,
        receiveId,
        reminderType: 'due',
        customMessage
      });
    } else {
      // 默认发送普通消息
      result = await service.sendFeishuMessage({
        receiveId,
        message: customMessage || '消息提醒',
        receiveIdType: 'open_id',
        msgType: 'text'
      });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('发送提醒失败:', error);
    return NextResponse.json(
      { success: false, error: '发送失败' },
      { status: 500 }
    );
  }
}
