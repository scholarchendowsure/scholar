import { NextRequest, NextResponse } from 'next/server';
import { deleteHSBCBatch } from '@/storage/database/hsbc-loan-storage';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchDate = searchParams.get('batchDate');
    
    if (!batchDate) {
      return NextResponse.json({ error: '批次日期不能为空' }, { status: 400 });
    }
    
    const result = await deleteHSBCBatch(batchDate);
    
    return NextResponse.json({ 
      success: true, 
      message: `成功删除批次 ${batchDate}，共 ${result.deletedCount} 条记录`,
      deletedCount: result.deletedCount,
      batchDate 
    });
  } catch (error) {
    console.error('删除批次失败:', error);
    return NextResponse.json(
      { error: '删除失败：' + (error instanceof Error ? error.message : '未知错误') }, 
      { status: 500 }
    );
  }
}
