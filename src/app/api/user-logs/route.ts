import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';
import { userStorage } from '@/storage/database/user-storage';

// 获取操作日志
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const userId = searchParams.get('userId') || '';
    const action = searchParams.get('action') || '';
    const module = searchParams.get('module') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const result = userStorage.getLogs(page, pageSize, {
      userId: userId || undefined,
      action: action || undefined,
      module: module || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    return NextResponse.json(successResponse({
      data: result.data,
      total: result.total,
      page,
      pageSize,
      totalPages: result.totalPages,
    }));
  } catch (error) {
    console.error('Get user logs error:', error);
    return NextResponse.json(errorResponse('获取操作日志失败'), { status: 500 });
  }
}
