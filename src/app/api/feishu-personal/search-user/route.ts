import { NextRequest, NextResponse } from 'next/server';
import { searchFeishuUsersDirectly, searchFeishuUserComprehensive } from '@/lib/feishu-api';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json({ 
        success: false, 
        error: '请输入搜索关键词' 
      }, { status: 400 });
    }

    try {
      // 使用企业自建应用 API 搜索用户
      let users: any[] = [];
      
      try {
        // 先尝试直接搜索
        users = await searchFeishuUsersDirectly(query);
      } catch (error) {
        console.log('直接搜索失败，尝试综合搜索:', error);
        // 如果直接搜索失败，尝试综合搜索
        const result = await searchFeishuUserComprehensive(query);
        users = result.users || [];
      }
      
      if (users.length === 0) {
        return NextResponse.json({ 
          success: true, 
          users: [] 
        });
      }
      
      // 转换为前端需要的格式
      const formattedUsers = users.map((user: any) => ({
        unionId: user.union_id || user.unionId || user.user_id || user.userId || '',
        userId: user.user_id || user.userId || user.union_id || user.unionId || '',
        name: user.name || user.nick_name || user.nickName || '',
        enName: user.en_name || user.enName || '',
        email: user.email || '',
        mobile: user.mobile || user.mobile_phone || user.mobilePhone || ''
      })).filter(user => user.name);

      return NextResponse.json({ 
        success: true, 
        users: formattedUsers
      });
      
    } catch (searchError: any) {
      console.error('搜索用户错误:', searchError);
      return NextResponse.json({ 
        success: false, 
        error: `搜索失败: ${searchError.message}` 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('搜索用户错误:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}
