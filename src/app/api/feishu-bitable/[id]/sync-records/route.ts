import { NextResponse } from 'next/server';
import { bitableSyncRecordStorage } from '@/storage/database/feishu-bitable-storage';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const records = bitableSyncRecordStorage.findByConfigId(id, 50);
    
    return NextResponse.json({
      success: true,
      records,
    });
  } catch (error) {
    console.error('获取同步记录失败:', error);
    return NextResponse.json(
      { success: false, message: '获取同步记录失败' },
      { status: 500 }
    );
  }
}
