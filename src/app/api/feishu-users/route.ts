import { NextRequest, NextResponse } from 'next/server';
import { getFeishuUsers, saveFeishuUser, deleteFeishuUser, FeishuUser } from '@/storage/database/feishu-user-storage';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// 获取所有飞书用户
export async function GET(request: NextRequest) {
  try {
    console.log('📥 获取飞书用户列表请求');
    
    // 优先读取我们刚才保存的完整文件
    const dataFilePath = path.join(process.cwd(), 'public', 'data', 'feishu-users.json');
    
    if (fs.existsSync(dataFilePath)) {
      const rawData = fs.readFileSync(dataFilePath, 'utf-8');
      const users = JSON.parse(rawData);
      console.log(`✅ 返回 ${users.length} 个飞书用户（从完整文件）`);
      return NextResponse.json({
        success: true,
        data: users,
        count: users.length,
      });
    }
    
    // 如果没有完整文件，从存储中读取
    const users = await getFeishuUsers();
    
    console.log(`✅ 返回 ${users.length} 个飞书用户`);
    return NextResponse.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    console.error('❌ 获取飞书用户列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取飞书用户列表失败' },
      { status: 500 }
    );
  }
}

// 保存飞书用户
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📥 保存飞书用户请求:', body);

    const now = new Date();
    const userToSave: FeishuUser = {
      id: body.id || body.openId || body.userId || `user_${Date.now()}`,
      unionId: body.unionId || '',
      userId: body.userId || '',
      openId: body.openId || '',
      name: body.name || '未知用户',
      enName: body.enName,
      email: body.email,
      mobile: body.mobile,
      avatarUrl: body.avatarUrl,
      company: body.company,
      chatId: body.chatId,
      status: 'active',
      departmentIds: body.departmentIds,
      createdAt: body.createdAt ? new Date(body.createdAt) : now,
      updatedAt: now,
    };

    const savedUser = await saveFeishuUser(userToSave);
    
    console.log('✅ 飞书用户已保存:', savedUser.name);
    return NextResponse.json({
      success: true,
      data: savedUser,
    });
  } catch (error) {
    console.error('❌ 保存飞书用户失败:', error);
    return NextResponse.json(
      { success: false, error: '保存飞书用户失败' },
      { status: 500 }
    );
  }
}

// 删除飞书用户
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少 userId 参数' },
        { status: 400 }
      );
    }

    console.log('📥 删除飞书用户请求:', userId);
    await deleteFeishuUser(userId);
    
    console.log('✅ 飞书用户已删除:', userId);
    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('❌ 删除飞书用户失败:', error);
    return NextResponse.json(
      { success: false, error: '删除飞书用户失败' },
      { status: 500 }
    );
  }
}
