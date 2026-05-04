
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const STORAGE_FILE = process.env.NODE_ENV === 'production' 
  ? '/tmp/hsbc-loans.json'
  : path.join(process.cwd(), 'hsbc-loans.json');

const BATCH_DATES_FILE = process.env.NODE_ENV === 'production'
  ? '/tmp/hsbc-batch-dates.json'
  : path.join(process.cwd(), 'hsbc-batch-dates.json');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    
    if (action === 'check-files') {
      const result: Record<string, unknown> = {};
      
      // 检查贷款文件
      if (fs.existsSync(STORAGE_FILE)) {
        const loansContent = fs.readFileSync(STORAGE_FILE, 'utf-8');
        const loansData = JSON.parse(loansContent);
        const loanBatchDates = new Set<string>();
        loansData.forEach((loan: any) => {
          if (loan.batchDate) {
            loanBatchDates.add(loan.batchDate);
          }
        });
        
        result.loansFile = {
          exists: true,
          totalLoans: loansData.length,
          batchDatesFromLoans: Array.from(loanBatchDates).sort(),
          sample: loansData.slice(0, 3).map((l: any) => ({
            id: l.id,
            batchDate: l.batchDate,
            loanReference: l.loanReference
          }))
        };
      } else {
        result.loansFile = { exists: false };
      }
      
      // 检查批次日期文件
      if (fs.existsSync(BATCH_DATES_FILE)) {
        const batchContent = fs.readFileSync(BATCH_DATES_FILE, 'utf-8');
        const batchData = JSON.parse(batchContent);
        result.batchDatesFile = {
          exists: true,
          batchDates: batchData
        };
      } else {
        result.batchDatesFile = { exists: false };
      }
      
      return NextResponse.json({
        success: true,
        message: '文件检查完成',
        result
      });
    }
    
    if (action === 'fix-batch-dates') {
      // 从贷款数据中重新提取批次日期
      if (fs.existsSync(STORAGE_FILE)) {
        const loansContent = fs.readFileSync(STORAGE_FILE, 'utf-8');
        const loansData = JSON.parse(loansContent);
        
        const batchDates = new Set<string>();
        loansData.forEach((loan: any) => {
          if (loan.batchDate) {
            batchDates.add(loan.batchDate);
          }
        });
        
        const sortedBatchDates = Array.from(batchDates).sort((a, b) => b.localeCompare(a));
        
        // 保存批次日期
        fs.writeFileSync(BATCH_DATES_FILE, JSON.stringify(sortedBatchDates, null, 2));
        
        return NextResponse.json({
          success: true,
          message: '批次日期已修复',
          batchDates: sortedBatchDates,
          count: sortedBatchDates.length
        });
      } else {
        return NextResponse.json({
          success: false,
          message: '贷款文件不存在'
        }, { status: 400 });
      }
    }
    
    return NextResponse.json({
      success: false,
      message: '请指定action参数: check-files, fix-batch-dates'
    }, { status: 400 });
    
  } catch (error) {
    console.error('检查文件失败:', error);
    return NextResponse.json({ error: '检查失败：' + (error instanceof Error ? error.message : '未知错误') }, { status: 500 });
  }
}
