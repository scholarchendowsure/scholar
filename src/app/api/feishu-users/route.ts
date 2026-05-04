import { NextRequest, NextResponse } from 'next/server';
import { getFeishuUsers, saveFeishuUser, deleteFeishuUser, FeishuUser } from '@/storage/database/feishu-user-storage';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// 导出飞书用户数据或获取列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    // 如果是导出请求
    if (action === 'export') {
      console.log('📥 导出飞书用户数据请求');
      
      const dataFilePath = path.join(process.cwd(), 'public', 'data', 'feishu-users.json');
      
      if (fs.existsSync(dataFilePath)) {
        const rawData = fs.readFileSync(dataFilePath, 'utf-8');
        const users = JSON.parse(rawData);
        
        console.log(`✅ 导出 ${users.length} 个飞书用户`);
        
        // 返回可下载的文件
        return new NextResponse(rawData, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="feishu-users-export-${new Date().toISOString().slice(0, 10)}.json"`,
          },
        });
      }
    }
    
    // 否则返回正常的用户列表
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

// 导入飞书用户数据或保存单个用户
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    // 如果是导入请求（multipart/form-data）
    if (contentType.includes('multipart/form-data')) {
      console.log('📥 导入飞书用户数据请求');
      
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json(
          { success: false, error: '请选择要导入的文件' },
          { status: 400 }
        );
      }
      
      const content = await file.text();
      let importedUsers: any[];
      
      try {
        importedUsers = JSON.parse(content);
      } catch (parseError) {
        return NextResponse.json(
          { success: false, error: '文件格式错误，请上传有效的JSON文件' },
          { status: 400 }
        );
      }
      
      if (!Array.isArray(importedUsers)) {
        return NextResponse.json(
          { success: false, error: 'JSON文件格式错误，需要数组格式' },
          { status: 400 }
        );
      }
      
      // 读取现有用户
      const dataFilePath = path.join(process.cwd(), 'public', 'data', 'feishu-users.json');
      let existingUsers: any[] = [];
      
      if (fs.existsSync(dataFilePath)) {
        const rawData = fs.readFileSync(dataFilePath, 'utf-8');
        existingUsers = JSON.parse(rawData);
      }
      
      // 备份现有数据
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(process.cwd(), 'public', 'data', `feishu-users-backup-before-import-${timestamp}.json`);
      fs.writeFileSync(backupPath, JSON.stringify(existingUsers, null, 2), 'utf-8');
      console.log(`📦 导入前备份已创建: ${backupPath}`);
      
      // 合并用户：导入的用户优先，去重
      const userMap = new Map();
      
      // 先添加现有用户
      for (const user of existingUsers) {
        const key = user.unionId || user.openId || user.userId || user.id;
        if (key) {
          userMap.set(key, user);
        }
      }
      
      // 再添加导入的用户（会覆盖同名用户）
      let newCount = 0;
      let updatedCount = 0;
      
      for (const user of importedUsers) {
        const key = user.unionId || user.openId || user.userId || user.id;
        if (key) {
          if (userMap.has(key)) {
            updatedCount++;
          } else {
            newCount++;
          }
          userMap.set(key, {
            ...user,
            updatedAt: new Date()
          });
        }
      }
      
      const finalUsers = Array.from(userMap.values());
      
      // 保存合并后的数据
      fs.writeFileSync(dataFilePath, JSON.stringify(finalUsers, null, 2), 'utf-8');
      
      // 同时更新备份文件
      const backupFile = path.join(process.cwd(), 'public', 'data', 'feishu_users.json');
      fs.writeFileSync(backupFile, JSON.stringify(finalUsers, null, 2), 'utf-8');
      
      console.log(`✅ 导入完成：新增 ${newCount} 个用户，更新 ${updatedCount} 个用户，总计 ${finalUsers.length} 个用户`);
      
      return NextResponse.json({
        success: true,
        message: `导入成功！新增 ${newCount} 个用户，更新 ${updatedCount} 个用户`,
        data: {
          total: finalUsers.length,
          newUsers: newCount,
          updatedUsers: updatedCount,
        },
      });
    }
    
    // 否则是保存飞书用户的原有逻辑
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
