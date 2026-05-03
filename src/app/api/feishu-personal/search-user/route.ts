import { NextRequest, NextResponse } from 'next/server';
import { searchFeishuUsersDirectly, searchFeishuUserComprehensive } from '@/lib/feishu-api';

const APP_ID = 'cli_a9652497d7389bd6';
const APP_SECRET = 'YHs5IxuDt5xXy4NT5dx0NgIVoC0aE2dO';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { error: '查询关键词不能为空' },
        { status: 400 }
      );
    }

    console.log('🔍 使用企业应用API搜索用户:', query);

    // 使用企业应用 API 搜索用户
    let users = await searchFeishuUsersDirectly(APP_ID, APP_SECRET, query);
    
    // 如果直接搜索没找到，尝试更全面的搜索
    if (users.length === 0) {
      console.log('⚠️ 直接搜索未找到，尝试全面搜索...');
      users = await searchFeishuUserComprehensive(APP_ID, APP_SECRET, query);
    }

    console.log('✅ 搜索结果:', users.length, '个用户');

    // 转换格式，兼容前端期望的格式
    const formattedUsers = users.map(user => ({
      open_id: user.userId,
      user_id: user.userId,
      union_id: user.unionId,
      name: user.name,
      localized_name: user.name,
      en_name: user.enName,
      email: user.email,
      enterprise_email: user.email,
      mobile: user.mobile,
      avatar_url: user.avatarUrl,
      avatar: user.avatarUrl,
      department: '',
      status: user.status
    }));

    return NextResponse.json({
      success: true,
      query,
      users: formattedUsers,
      count: formattedUsers.length
    });
  } catch (error: any) {
    console.error('❌ 搜索用户失败:', error);
    
    return NextResponse.json(
      { error: error.message || '搜索用户失败' },
      { status: 500 }
    );
  }
}
