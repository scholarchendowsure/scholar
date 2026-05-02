import { NextRequest, NextResponse } from 'next/server';
import { feishuPersonalStorage } from '@/storage/database/feishu-personal-storage';

export async function GET() {
  try {
    const accounts = feishuPersonalStorage.getAllAccounts();
    // 过滤掉敏感信息
    const safeAccounts = accounts.map(acc => ({
      id: acc.id,
      userId: acc.userId,
      feishuUserId: acc.feishuUserId,
      feishuName: acc.feishuName,
      isBound: acc.isBound,
      createdAt: acc.createdAt,
      updatedAt: acc.updatedAt
    }));
    return NextResponse.json({
      success: true,
      accounts: safeAccounts
    });
  } catch (error) {
    console.error('获取个人账号列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取账号列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const account = feishuPersonalStorage.createAccount(data);
    return NextResponse.json({
      success: true,
      account
    });
  } catch (error) {
    console.error('创建个人账号失败:', error);
    return NextResponse.json(
      { success: false, error: '创建账号失败' },
      { status: 500 }
    );
  }
}
