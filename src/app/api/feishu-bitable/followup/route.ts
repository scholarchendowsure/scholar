import { NextResponse } from 'next/server';
import { bitableConfigStorage } from '@/storage/database/feishu-bitable-storage';
import { addBitableRecord } from '@/lib/feishu-api';

// 跟进记录同步到飞书多维表格
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { followup, caseData } = body;

    if (!followup || !caseData) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数：跟进记录或案件信息' },
        { status: 400 }
      );
    }

    console.log('📝 开始同步跟进记录到飞书多维表格');
    console.log('📋 案件信息:', {
      loanNo: caseData.loanNo,
      borrowerName: caseData.borrowerName,
    });
    console.log('📝 跟进记录:', followup);

    // 获取启用的多维表格配置
    const configs = bitableConfigStorage.findAll().filter(c => c.syncEnabled);
    
    if (configs.length === 0) {
      console.log('⚠️ 没有启用的多维表格配置，跳过同步');
      return NextResponse.json({
        success: true,
        message: '没有启用的多维表格配置',
        skipped: true
      });
    }

    const results: any[] = [];
    
    for (const config of configs) {
      try {
        console.log('🔄 正在同步到配置:', config.id);
        
        // 使用配置中的App Secret
        const appSecret = config.appSecret;
        
        // 构造多维表格字段（根据实际字段映射调整）
        const fields: Record<string, any> = {
          '贷款单号': caseData.loanNo,
          '借款人姓名': caseData.borrowerName,
          '公司名称': caseData.companyName || '',
          '逾期金额': caseData.overdueAmount,
          '记录人': followup.follower,
          '记录时间': new Date(followup.followTime).toLocaleString('zh-CN'),
          '跟进类型': followup.followType,
          '联系人': followup.contact,
          '跟进结果': followup.followResult,
          '记录内容': followup.followRecord,
          '同步时间': new Date().toLocaleString('zh-CN'),
        };
        
        // 如果有自定义字段映射，应用映射
        if (config.fieldMapping && Object.keys(config.fieldMapping).length > 0) {
          const mappedFields: Record<string, any> = {};
          for (const [targetField, sourceField] of Object.entries(config.fieldMapping)) {
            if (fields[sourceField as string] !== undefined) {
              mappedFields[targetField] = fields[sourceField as string];
            }
          }
          if (Object.keys(mappedFields).length > 0) {
            Object.assign(fields, mappedFields);
          }
        }

        // 调用飞书API添加记录
        const result = await addBitableRecord(
          config.appId,
          appSecret,
          config.appToken,
          config.tableId,
          fields
        );

        results.push({
          configId: config.id,
          success: result.success,
          recordId: result.recordId,
          error: result.error
        });

        console.log('✅ 配置', config.id, result.success ? '同步成功' : '同步失败:', result);
      } catch (configError) {
        console.error('❌ 配置', config.id, '同步异常:', configError);
        results.push({
          configId: config.id,
          success: false,
          error: configError instanceof Error ? configError.message : '未知错误'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return NextResponse.json({
      success: true,
      message: `同步完成：${successCount}/${totalCount} 个配置成功`,
      results: results,
      successCount: successCount,
      totalCount: totalCount
    });

  } catch (error) {
    console.error('❌ 跟进记录同步到多维表格失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '同步失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
