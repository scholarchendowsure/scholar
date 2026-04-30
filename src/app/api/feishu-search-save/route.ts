import { NextRequest, NextResponse } from 'next/server';
import {
  getTenantAccessToken,
  searchFeishuUsersDirectly,
  searchFeishuUserComprehensive,
  getFeishuUserDetail,
  encryptAppSecret,
  decryptAppSecret,
} from '@/lib/feishu-api';
import { getFeishuConfig, saveFeishuConfig, FeishuConfig } from '@/storage/database/feishu-config-storage';
import {
  getFeishuUsers, saveFeishuUser, FeishuUser as StorageFeishuUser } from '@/storage/database/feishu-user-storage';

const APP_ID = 'cli_a9652497d7389bd6';
const APP_SECRET = 'YHs5IxuDt5xXy4NT5dx0NgIVoC0aE2dO';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const keyword = searchParams.get('keyword') || '';
    
    console.log('🔍 飞书搜索保存API，action:', action, 'keyword:', keyword);

    if (action === 'search') {
      if (!keyword) {
        return NextResponse.json({
          success: false,
          message: '请输入搜索关键词',
        }, { status: 400 });
      }

      // 先尝试用直接搜索
      console.log('🔍 开始直接搜索...');
      let users = await searchFeishuUsersDirectly(APP_ID, APP_SECRET, keyword);
      
      // 如果直接搜索没找到，尝试更全面的搜索
      if (users.length === 0) {
        console.log('⚠️ 直接搜索未找到，尝试全面搜索...');
        users = await searchFeishuUserComprehensive(APP_ID, APP_SECRET, keyword);
      }

      return NextResponse.json({
        success: true,
        message: `找到 ${users.length} 个用户`,
        count: users.length,
        users: users,
      });
    }

    if (action === 'search-and-save') {
      if (!keyword) {
        return NextResponse.json({
          success: false,
          message: '请输入搜索关键词',
        }, { status: 400 });
      }

      console.log('🔍 搜索并保存用户...');
      
      // 搜索用户
      let users = await searchFeishuUsersDirectly(APP_ID, APP_SECRET, keyword);
      
      if (users.length === 0) {
        users = await searchFeishuUserComprehensive(APP_ID, APP_SECRET, keyword);
      }

      // 保存找到的用户到用户管理
      const savedCount = [];
      for (const user of users) {
        try {
          const storageUser: StorageFeishuUser = {
            id: user.userId,
            unionId: user.unionId,
            userId: user.userId,
            name: user.name,
            enName: user.enName,
            email: user.email,
            mobile: user.mobile,
            avatarUrl: user.avatarUrl,
            status: user.status,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          await saveFeishuUser(storageUser);
          savedCount.push(user.name);
          console.log('💾 已保存用户:', user.name, user.userId);
        } catch (saveError) {
          console.warn('⚠️ 保存用户失败:', user.name, saveError);
        }
      }

      return NextResponse.json({
        success: true,
        message: `搜索到 ${users.length} 个用户，已保存 ${savedCount.length} 个`,
        count: users.length,
        savedCount: savedCount.length,
        users: users,
      });
    }

    if (action === 'save-user') {
      const userId = searchParams.get('userId');
      if (!userId) {
        return NextResponse.json({
          success: false,
          message: '请提供用户ID',
        }, { status: 400 });
      }

      console.log('💾 保存单个用户，用户ID:', userId);
      
      // 先尝试获取用户详情
      let user = await getFeishuUserDetail(APP_ID, APP_SECRET, userId);
      
      // 如果获取详情失败，尝试用搜索方式
      if (!user) {
        const searchedUsers = await searchFeishuUsersDirectly(APP_ID, APP_SECRET, userId);
        if (searchedUsers.length > 0) {
          user = searchedUsers[0];
        }
      }

      if (!user) {
        return NextResponse.json({
          success: false,
          message: '未找到该用户',
        }, { status: 404 });
      }

      // 保存用户
      const storageUser: StorageFeishuUser = {
        id: user.userId,
        unionId: user.unionId,
        userId: user.userId,
        name: user.name,
        enName: user.enName,
        email: user.email,
        mobile: user.mobile,
        avatarUrl: user.avatarUrl,
        status: user.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await saveFeishuUser(storageUser);
      
      console.log('✅ 用户已保存:', user.name);

      return NextResponse.json({
        success: true,
        message: `用户 ${user.name} 已保存`,
        user: user,
      });
    }

    if (action === 'list-all-users') {
      const users = await getFeishuUsers();
      return NextResponse.json({
        success: true,
        message: `获取到 ${users.length} 个已保存用户`,
        count: users.length,
        users: users,
      });
    }

    return NextResponse.json({
      success: false,
      message: '未知的操作',
    }, { status: 400 });

  } catch (error) {
    console.error('❌ 飞书搜索保存API错误:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '操作失败',
    }, { status: 500 });
  }
}
