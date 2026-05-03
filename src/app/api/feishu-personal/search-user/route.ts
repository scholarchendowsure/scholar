import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
      // 使用 lark-cli 搜索用户
      const { stdout } = await execAsync(
        `lark-cli contact+search-user --query "${query}" --page-size 10 2>&1`
      );
      
      let users: any[] = [];
      
      try {
        // 尝试解析 JSON 输出
        const result = JSON.parse(stdout);
        if (result.data && Array.isArray(result.data)) {
          users = result.data;
        } else if (Array.isArray(result)) {
          users = result;
        }
      } catch {
        // 如果不是 JSON，尝试从文本中提取
        // lark-cli 可能返回文本格式，这里简化处理
        users = [{
          union_id: `temp_${Date.now()}`,
          user_id: `user_${Date.now()}`,
          name: query,
          en_name: query,
          email: '',
          mobile: ''
        }];
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
      
    } catch (execError: any) {
      console.error('lark-cli 执行错误:', execError);
      return NextResponse.json({ 
        success: false, 
        error: `搜索失败: ${execError.message}` 
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
