import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || '/tmp';
    const hsbcLoansPath = path.join(LOCAL_STORAGE_PATH, 'hsbc-loans.json');
    const hsbcBatchDatesPath = path.join(LOCAL_STORAGE_PATH, 'hsbc-batch-dates.json');

    if (action === 'check-files') {
      // 检查文件是否存在
      const hsbcLoansExists = fs.existsSync(hsbcLoansPath);
      const hsbcBatchDatesExists = fs.existsSync(hsbcBatchDatesPath);

      let loansContent = null;
      let batchDatesContent = null;

      if (hsbcLoansExists) {
        try {
          loansContent = JSON.parse(fs.readFileSync(hsbcLoansPath, 'utf-8'));
        } catch (e) {
          loansContent = { error: String(e) };
        }
      }

      if (hsbcBatchDatesExists) {
        try {
          batchDatesContent = JSON.parse(fs.readFileSync(hsbcBatchDatesPath, 'utf-8'));
        } catch (e) {
          batchDatesContent = { error: String(e) };
        }
      }

      return NextResponse.json({
        success: true,
        message: '本地文件检查完成',
        storagePath: LOCAL_STORAGE_PATH,
        files: {
          hsbcLoans: {
            exists: hsbcLoansExists,
            path: hsbcLoansPath,
            content: loansContent
          },
          hsbcBatchDates: {
            exists: hsbcBatchDatesExists,
            path: hsbcBatchDatesPath,
            content: batchDatesContent
          }
        }
      });
    }

    return NextResponse.json({
      success: false,
      message: '未知的action'
    }, { status: 400 });

  } catch (error) {
    console.error('检查本地文件失败:', error);
    return NextResponse.json({
      success: false,
      message: '检查本地文件失败',
      error: String(error)
    }, { status: 500 });
  }
}
