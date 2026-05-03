import { NextRequest, NextResponse } from 'next/server';
import { bitableCaseUpdateStorage } from '@/storage/database/bitable-case-update-storage';
import { processFeishuBitableRecord } from '@/lib/feishu-bitable-processor';

export async function POST(request: NextRequest) {
  try {
    // 尝试解析JSON
    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      // 如果JSON解析失败，尝试读取文本
      const text = await request.text();
      payload = { raw: text };
    }

    console.log('[多维案件更新Webhook] 收到请求:', payload);

    // 自动处理：尝试创建/更新案件
    let processResult = null;
    let recordData = payload;
    
    try {
      // 提取记录数据 - 支持多种格式
      if (payload.data && payload.data.fields) {
        recordData = payload.data.fields;
      } else if (payload.fields) {
        recordData = payload.fields;
      } else if (payload.data && payload.data.record) {
        recordData = payload.data.record;
      } else if (payload.record) {
        recordData = payload.record;
      }
      
      console.log('[多维案件更新Webhook] 开始处理记录数据:', recordData);
      
      processResult = await processFeishuBitableRecord(recordData);
      console.log('[多维案件更新Webhook] 处理结果:', processResult);
      
    } catch (processError) {
      console.error('[多维案件更新Webhook] 自动处理失败:', processError);
      processResult = {
        success: false,
        error: processError instanceof Error ? processError.message : '未知错误'
      };
    }

    // 保存接收到的记录（包含处理结果）
    const record = bitableCaseUpdateStorage.addRecord(payload, processResult);

    console.log('[多维案件更新Webhook] 记录已保存:', record.id);

    // 飞书挑战验证（如果有challenge字段，直接返回）
    if (payload && payload.challenge) {
      return NextResponse.json({
        challenge: payload.challenge
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook接收成功',
      recordId: record.id,
      receivedAt: record.receivedAt,
      processResult
    });
  } catch (error) {
    console.error('[多维案件更新Webhook] 处理失败:', error);
    return NextResponse.json(
      { success: false, error: '处理失败' },
      { status: 500 }
    );
  }
}

// 同时支持GET方法，用于测试
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const records = bitableCaseUpdateStorage.getRecords(limit);
    
    return NextResponse.json({
      success: true,
      count: records.length,
      records
    });
  } catch (error) {
    console.error('获取多维案件更新记录失败:', error);
    return NextResponse.json(
      { success: false, error: '获取失败' },
      { status: 500 }
    );
  }
}

// 删除记录
export async function DELETE(request: NextRequest) {
  try {
    bitableCaseUpdateStorage.clearRecords();
    
    return NextResponse.json({
      success: true,
      message: '记录已清空'
    });
  } catch (error) {
    console.error('清空记录失败:', error);
    return NextResponse.json(
      { success: false, error: '清空失败' },
      { status: 500 }
    );
  }
}
