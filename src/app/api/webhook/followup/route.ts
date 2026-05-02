import { NextRequest, NextResponse } from 'next/server';
import { caseStorage } from '@/storage/database/case-storage';
import { followupWebhookStorage } from '@/storage/database/followup-webhook-storage';

// 跟进记录Webhook接收
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[跟进记录Webhook] 接收到数据:', body);

    // 飞书挑战验证（如果有challenge字段，直接返回）
    if (body && body.challenge) {
      return NextResponse.json({
        challenge: body.challenge
      });
    }

    let processResult = null;
    
    try {
      // 提取字段 - 支持中文和英文
      const userId = body['用户ID'] || body.userId || body.user_id;
      const loanNumber = body['贷款单号'] || body.loanNumber || body.loan_number;
      const follower = body['记录人'] || body.recorder || '未登记人';
      const followTypeInput = body['跟进类型'] || body.followUpType || body.follow_up_type || 'other';
      const contactInput = body['联系人'] || body.contactPerson || body.contact_person || 'other';
      const followResultInput = body['跟进结果'] || body.followUpResult || body.follow_up_result || 'other';
      const followRecordInput = body['记录内容'] || body.recordContent || body.record_content || '';
      const fileInfoInput = body['文件信息'] || body.fileInfo || body.file_info || [];

      if (!userId || !loanNumber) {
        processResult = {
          success: false,
          message: '缺少必填字段：用户ID或贷款单号',
          error: '缺少必填字段'
        };
      } else {
        // 转换枚举值为英文
        const getFollowTypeText = (type: string): string => {
          const map: { [key: string]: string } = {
            '线上': 'online',
            '线下': 'offline',
            '其他': 'other'
          };
          return map[type] || type;
        };

        const getContactText = (contact: string): string => {
          const map: { [key: string]: string } = {
            '法人': 'legal_representative',
            '实控人': 'actual_controller',
            '其他': 'other'
          };
          return map[contact] || contact;
        };

        const getFollowResultText = (result: string): string => {
          const map: { [key: string]: string } = {
            '正常还款': 'normal_repayment',
            '预警上升': 'warning_rise',
            '逾期承诺': 'overdue_promise',
            '其他': 'other'
          };
          return map[result] || result;
        };

        const followTypeEn = getFollowTypeText(followTypeInput);
        const contactEn = getContactText(contactInput);
        const followResultEn = getFollowResultText(followResultInput);

        // 处理文件信息
        const processedFileInfo = Array.isArray(fileInfoInput) ? fileInfoInput.map((file: any) => {
          if (typeof file === 'string') {
            return file;
          }
          return file;
        }) : [];

        // 查找匹配的案件 - 根据用户ID和贷款单号
        const allCases = await caseStorage.getAll();
        const matchingCases = allCases.filter((c: any) => 
          c.userId === userId && 
          (c.loanNo === loanNumber || (c as any).loanNumber === loanNumber)
        );

        if (matchingCases.length === 0) {
          processResult = {
            success: false,
            message: `未找到用户ID=${userId}, 贷款单号=${loanNumber}的案件`,
            error: '未找到匹配案件'
          };
        } else {
          // 创建跟进记录
          const followupRecord = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            follower: follower,
            followTime: new Date().toISOString(),
            followType: followTypeEn,
            contact: contactEn,
            followResult: followResultEn,
            followRecord: followRecordInput,
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

          processResult = {
            success: true,
            message: `已成功为 ${matchingCases.length} 个案件添加跟进记录`,
            updatedCases: matchingCases.length
          };
        }
      }
    } catch (innerError: any) {
      console.error('[跟进记录Webhook] 处理失败:', innerError);
      processResult = {
        success: false,
        message: innerError.message || '处理失败',
        error: innerError
      };
    }

    // 保存记录
    const record = followupWebhookStorage.addRecord(body, processResult);

    // 返回响应（和多维表格同步格式一致）
    return NextResponse.json({
      success: true,
      message: 'Webhook接收成功',
      recordId: record.id,
      receivedAt: record.receivedAt,
      processResult
    });

  } catch (error: any) {
    console.error('[跟进记录Webhook] 错误:', error);
    return NextResponse.json({
      success: false,
      message: '服务器错误',
      error: error.message
    }, { status: 500 });
  }
}
