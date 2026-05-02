import { NextRequest, NextResponse } from 'next/server';
import { followupWebhookStorage } from '@/storage/database/followup-webhook-storage';

// GET: 获取记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const records = followupWebhookStorage.getRecords(limit);
    
    return NextResponse.json({
      success: true,
      records
    });
  } catch (error) {
    console.error('获取跟进记录webhook记录失败:', error);
    return NextResponse.json(
      { success: false, error: '获取记录失败' },
      { status: 500 }
    );
  }
}

// DELETE: 清空记录
export async function DELETE(request: NextRequest) {
  try {
    followupWebhookStorage.clearRecords();
    
    return NextResponse.json({
      success: true,
      message: '记录已清空'
    });
  } catch (error) {
    console.error('清空跟进记录webhook记录失败:', error);
    return NextResponse.json(
      { success: false, error: '清空记录失败' },
      { status: 500 }
    );
  }
}
