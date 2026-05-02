import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// 跟进记录webhook记录文件路径
const FOLLOWUP_WEBHOOK_RECORDS_FILE = join('/tmp', 'followup-webhook-records.json');

interface FollowupWebhookRecord {
  id: string;
  receivedAt: string;
  payload: any;
  processResult?: {
    success: boolean;
    message: string;
    updatedCases?: number;
    error?: string;
  };
}

// 初始化记录文件
function initRecordsFile() {
  if (!existsSync(FOLLOWUP_WEBHOOK_RECORDS_FILE)) {
    writeFileSync(FOLLOWUP_WEBHOOK_RECORDS_FILE, JSON.stringify([], null, 2));
  }
}

// 读取记录
function getRecords(limit: number = 20): FollowupWebhookRecord[] {
  initRecordsFile();
  try {
    const content = readFileSync(FOLLOWUP_WEBHOOK_RECORDS_FILE, 'utf-8');
    const records = JSON.parse(content);
    // 最新在前
    return records.slice(0, limit);
  } catch (error) {
    console.error('读取跟进记录webhook记录失败:', error);
    return [];
  }
}

// 保存记录
export function saveFollowupWebhookRecord(payload: any, processResult?: any) {
  initRecordsFile();
  try {
    const content = readFileSync(FOLLOWUP_WEBHOOK_RECORDS_FILE, 'utf-8');
    const records = JSON.parse(content);
    
    const newRecord: FollowupWebhookRecord = {
      id: Date.now().toString(),
      receivedAt: new Date().toISOString(),
      payload,
      processResult
    };
    
    records.unshift(newRecord); // 最新在前
    // 只保留最近100条记录
    const trimmedRecords = records.slice(0, 100);
    writeFileSync(FOLLOWUP_WEBHOOK_RECORDS_FILE, JSON.stringify(trimmedRecords, null, 2));
  } catch (error) {
    console.error('保存跟进记录webhook记录失败:', error);
  }
}

// GET: 获取记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const records = getRecords(limit);
    
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
    initRecordsFile();
    writeFileSync(FOLLOWUP_WEBHOOK_RECORDS_FILE, JSON.stringify([], null, 2));
    
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
