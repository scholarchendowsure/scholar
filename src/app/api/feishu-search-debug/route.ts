import { NextRequest, NextResponse } from 'next/server';
import { searchFeishuUsersDirectly, sendFeishuPrivateMessage, searchFeishuUserComprehensive } from '@/lib/feishu-api';
import { saveFeishuUser } from '@/storage/database/feishu-user-storage';

// 测试用的配置
const TEST_APP_ID = 'cli_a9652497d7389bd6';
const TEST_APP_SECRET = 'YHs5IxuDt5xXy4NT5dx0NgIVoC0aE2dO';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const keyword = searchParams.get('keyword') || '';

  try {
    if (action === 'search') {
      console.log('🔍 开始搜索调试，关键词:', keyword);
      
      const result = await searchFeishuUsersDirectly(
        TEST_APP_ID,
        TEST_APP_SECRET,
        keyword
      );
      
      console.log('📋 搜索结果:', JSON.stringify(result, null, 2));
      
      return NextResponse.json({
        success: true,
        action: 'search',
        keyword,
        result
      });
    }

    if (action === 'search-with-detail') {
      console.log('🔍 详细搜索调试，关键词:', keyword);
      
      // 先搜索
      const searchResult = await searchFeishuUserComprehensive(
        TEST_APP_ID,
        TEST_APP_SECRET,
        keyword
      );
      
      console.log('📋 搜索结果:', JSON.stringify(searchResult, null, 2));
      
      return NextResponse.json({
        success: true,
        action: 'search-with-detail',
        keyword,
        searchResult,
        foundCount: searchResult.length
      });
    }

    return NextResponse.json({
      success: false,
      error: '未知操作'
    }, { status: 400 });

  } catch (error: any) {
    console.error('❌ 调试API错误:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
