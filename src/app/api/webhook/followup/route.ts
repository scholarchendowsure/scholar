import { NextRequest, NextResponse } from 'next/server';
import { caseStorage } from '@/storage/database/case-storage';
import { saveFollowupWebhookRecord } from './records/route';

export async function POST(request: NextRequest) {
  let body: any;
  
  try {
    body = await request.json();
    
    // 从请求体中获取数据
    const {
      用户ID: userId,
      贷款单号: loanNumber,
      记录人: follower,
      跟进类型: followType,
      联系人: contact,
      跟进结果: followResult,
      记录内容: followRecord,
      文件信息: fileInfo
    } = body;
    
    // 验证必填字段
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '用户ID不能为空' },
        { status: 400 }
      );
    }
    
    if (!loanNumber) {
      return NextResponse.json(
        { success: false, error: '贷款单号不能为空' },
        { status: 400 }
      );
    }
    
    // 获取所有案件
    const allCases = await caseStorage.getAll();
    
    // 查找匹配的案件（根据用户ID和贷款单号）
    const matchingCases = allCases.filter(c => 
      c.userId === userId && c.loanNo === loanNumber
    );
    
    if (matchingCases.length === 0) {
      return NextResponse.json(
        { success: false, error: '未找到匹配的案件' },
        { status: 404 }
      );
    }
    
    // 自动生成记录时间（当前时间）
    const followTime = new Date().toISOString();
    
    // 转换枚举值为英文（如果是中文的话）
    const followTypeEn = convertFollowTypeToEn(followType);
    const contactEn = convertContactToEn(contact);
    const followResultEn = convertFollowResultToEn(followResult);
    
    // 处理文件信息
    const processedFileInfo = processFileInfo(fileInfo);
    
    // 创建跟进记录
    const followupRecord = {
      id: Date.now().toString(),
      follower: follower || '未登记人',
      followTime: followTime,
      followType: followTypeEn,
      contact: contactEn,
      followResult: followResultEn,
      followRecord: followRecord || '',
      fileInfo: processedFileInfo,
      createdBy: '飞书Webhook'
    };
    
    // 为每个匹配的案件添加跟进记录
    for (const caseItem of matchingCases) {
      const updatedCase: any = {
        followups: [...(caseItem.followups || []), followupRecord],
        updatedAt: new Date().toISOString()
      };
      
      // 如果有文件信息，同步更新到案件的文件信息
      if (processedFileInfo.length > 0) {
        updatedCase.files = [...((caseItem as any).files || []), ...processedFileInfo];
      }
      
      await caseStorage.update(caseItem.id, updatedCase);
    }
    
    const processResult = {
      success: true,
      message: `已成功为 ${matchingCases.length} 个案件添加跟进记录`,
      updatedCases: matchingCases.length
    };
    
    // 保存记录
    saveFollowupWebhookRecord(body, processResult);
    
    return NextResponse.json({
      success: true,
      message: `已成功为 ${matchingCases.length} 个案件添加跟进记录`,
      updatedCases: matchingCases.length
    });
  } catch (error) {
    console.error('Webhook接收跟进记录错误:', error);
    
    const processResult = {
      success: false,
      message: 'Webhook处理失败',
      error: error instanceof Error ? error.message : '未知错误'
    };
    
    // 保存记录
    if (body) {
      saveFollowupWebhookRecord(body, processResult);
    }
    
    return NextResponse.json(
      { success: false, error: 'Webhook处理失败' },
      { status: 500 }
    );
  }
}

// 转换跟进类型为英文
function convertFollowTypeToEn(type: string): string {
  const typeMap: Record<string, string> = {
    '线上': 'online',
    '线下': 'offline',
    '其他': 'other'
  };
  return typeMap[type] || type || 'other';
}

// 转换联系人为英文
function convertContactToEn(contact: string): string {
  const contactMap: Record<string, string> = {
    '法人': 'legal_representative',
    '实控人': 'actual_controller',
    '其他': 'other'
  };
  return contactMap[contact] || contact || 'other';
}

// 转换跟进结果为英文
function convertFollowResultToEn(result: string): string {
  const resultMap: Record<string, string> = {
    '正常还款': 'normal_repayment',
    '预警上升': 'warning_rise',
    '逾期承诺': 'overdue_promise',
    '其他': 'other'
  };
  return resultMap[result] || result || 'other';
}

// 处理文件信息
function processFileInfo(fileInfo: any): any[] {
  if (!fileInfo) return [];
  
  if (Array.isArray(fileInfo)) {
    return fileInfo.map(file => {
      if (typeof file === 'string') {
        // 如果只是文件名
        return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file,
          type: file.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? 'image' : 'file',
          data: '',
          createdAt: new Date().toISOString()
        };
      } else if (file && file.name) {
        // 如果是对象
        return {
          id: file.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.type || (file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? 'image' : 'file'),
          data: file.data || '',
          createdAt: new Date().toISOString()
        };
      }
      return file;
    });
  }
  
  return [];
}
