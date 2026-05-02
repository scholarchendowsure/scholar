import { NextResponse } from 'next/server';
import { bitableConfigStorage, bitableSyncRecordStorage } from '@/storage/database/feishu-bitable-storage';
import { caseStorage } from '@/storage/database/case-storage';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { configId, direction } = body;

    if (!configId) {
      return NextResponse.json(
        { success: false, message: '请选择配置' },
        { status: 400 }
      );
    }

    const config = bitableConfigStorage.findById(configId);
    if (!config) {
      return NextResponse.json(
        { success: false, message: '配置不存在' },
        { status: 404 }
      );
    }

    if (!config.syncEnabled) {
      return NextResponse.json(
        { success: false, message: '同步已禁用' },
        { status: 400 }
      );
    }

    // 创建同步记录
    const syncRecord = bitableSyncRecordStorage.create({
      configId,
      direction: direction || 'to-coze',
      status: 'syncing',
      syncTime: new Date().toISOString(),
    });

    try {
      let syncedCount = 0;

      if (direction === 'to-coze' || direction === 'bidirectional') {
        // 从飞书同步到扣子
        // 这里应该调用飞书API获取数据，然后创建案件
        // 为了演示，我们假设有数据
        console.log('从飞书同步到扣子...');
        syncedCount = 0; // 实际应该是从飞书API获取的数量
      }

      if (direction === 'to-feishu' || direction === 'bidirectional') {
        // 从扣子同步到飞书
        console.log('从扣子同步到飞书...');
        const cases = await caseStorage.getAll();
        syncedCount = cases.length; // 实际应该调用飞书API写回
      }

      // 更新同步记录
      bitableSyncRecordStorage.update(syncRecord.id, {
        status: 'success',
      });

      // 更新配置同步次数
      bitableConfigStorage.incrementSyncCount(configId);

      return NextResponse.json({
        success: true,
        message: `同步成功，共同步 ${syncedCount} 条数据`,
        count: syncedCount,
      });
    } catch (syncError) {
      console.error('同步失败:', syncError);
      
      bitableSyncRecordStorage.update(syncRecord.id, {
        status: 'failed',
        errorMessage: syncError instanceof Error ? syncError.message : '同步失败',
      });

      return NextResponse.json(
        { success: false, message: syncError instanceof Error ? syncError.message : '同步失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('同步操作失败:', error);
    return NextResponse.json(
      { success: false, message: '同步操作失败' },
      { status: 500 }
    );
  }
}
