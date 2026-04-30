import { NextRequest, NextResponse } from 'next/server';
import { getTenantAccessToken, getAllFeishuUsers, findFeishuUser, sendFeishuPrivateMessage } from '@/lib/feishu-api';

const TEST_APP_ID = 'cli_a9652497d7389bd6';
const TEST_APP_SECRET = 'YHs5IxuDt5xXy4NT5dx0NgIVoC0aE2dO';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'search';
  const keyword = searchParams.get('keyword') || '晨忻';

  try {
    if (action === 'search') {
      return await searchUser(keyword);
    } else if (action === 'list-all') {
      return await listAllUsers();
    } else if (action === 'try-all-methods') {
      return await tryAllMethods(keyword);
    } else {
      return NextResponse.json({
        success: false,
        message: '未知的操作'
      });
    }
  } catch (error) {
    console.error('搜索测试失败:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '搜索失败',
      error: String(error)
    }, { status: 500 });
  }
}

async function searchUser(keyword: string) {
  const results: any[] = [];
  
  // 方式1: 使用 findFeishuUser 方法
  try {
    const user1 = await findFeishuUser(TEST_APP_ID, TEST_APP_SECRET, { name: keyword });
    results.push({
      method: 'findFeishuUser-by-name',
      keyword,
      found: !!user1,
      user: user1
    });
  } catch (e) {
    results.push({
      method: 'findFeishuUser-by-name',
      keyword,
      error: String(e)
    });
  }
  
  return NextResponse.json({
    success: true,
    message: `搜索"${keyword}"完成`,
    keyword,
    results
  });
}

async function listAllUsers() {
  const users = await getAllFeishuUsers(TEST_APP_ID, TEST_APP_SECRET);
  return NextResponse.json({
    success: true,
    message: `获取到 ${users.length} 个用户`,
    count: users.length,
    users: users.map((u: any) => ({
      userId: u.userId,
      unionId: u.unionId,
      name: u.name,
      status: u.status
    }))
  });
}

async function tryAllMethods(keyword: string) {
  const results: any[] = [];
  
  // 首先获取所有用户
  try {
    const allUsers = await getAllFeishuUsers(TEST_APP_ID, TEST_APP_SECRET);
    results.push({
      method: 'getAllFeishuUsers',
      count: allUsers.length,
      users: allUsers.map((u: any) => ({
        userId: u.userId,
        name: u.name,
        raw: u
      }))
    });
    
    // 尝试在所有用户中搜索
    const matchedByName = allUsers.filter((u: any) => 
      u.name && u.name.includes(keyword)
    );
    
    results.push({
      method: 'filter-by-name',
      keyword,
      count: matchedByName.length,
      users: matchedByName
    });
    
    // 尝试直接给找到的用户发消息
    if (matchedByName.length > 0) {
      const testUser = matchedByName[0];
      try {
        const msgResult = await sendFeishuPrivateMessage(
          TEST_APP_ID,
          TEST_APP_SECRET,
          testUser.userId,
          `${keyword}您好！这是来自系统的测试消息。`
        );
        results.push({
          method: 'send-message',
          success: true,
          targetUser: testUser,
          result: msgResult
        });
      } catch (msgError) {
        results.push({
          method: 'send-message',
          success: false,
          targetUser: testUser,
          error: String(msgError)
        });
      }
    }
  } catch (e) {
    results.push({
      method: 'overall',
      error: String(e)
    });
  }
  
  return NextResponse.json({
    success: true,
    message: '多方式搜索完成',
    keyword,
    results
  });
}
