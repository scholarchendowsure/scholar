
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { query, cliPath = 'lark' } = await request.json();
    
    if (!query) {
      return NextResponse.json({ 
        success: false, 
        error: '请输入搜索关键词' 
      }, { status: 400 });
    }

    try {
      console.log('🔍 使用 lark-cli 搜索用户:', query);
      
      // 使用 lark-cli 搜索用户
      const { stdout, stderr } = await execAsync(
        `${cliPath} contact +search-user --query "${query}" --page-size 10`
      );
      
      console.log('📡 lark-cli 搜索结果:', stdout);
      
      if (stderr) {
        console.warn('⚠️ lark-cli stderr:', stderr);
      }
      
      let users: any[] = [];
      
      try {
        const result = JSON.parse(stdout);
        console.log('📊 解析后的 JSON:', JSON.stringify(result, null, 2));
        
        // lark-cli 返回的格式可能是多种，尝试各种可能
        if (result.items) {
          users = result.items;
        } else if (result.data?.items) {
          users = result.data.items;
        } else if (Array.isArray(result)) {
          users = result;
        } else {
          // 如果是单个用户对象，包装成数组
          users = [result];
        }
      } catch (parseError) {
        console.warn('⚠️ JSON 解析失败，尝试按行解析:', parseError);
        // 如果 JSON 解析失败，尝试其他方式处理
      }
      
      console.log(`✅ 找到 ${users.length} 个用户`);
      
      // 转换为前端需要的格式
      const formattedUsers = users.map((user: any) =&gt; ({
        unionId: user.union_id || user.unionId || user.user_id || user.userId || '',
        userId: user.user_id || user.userId || user.open_id || user.openId || '',
        open_id: user.open_id || user.openId || user.user_id || user.userId || '',
        name: user.name || user.nick_name || user.nickName || user.localized_name || '',
        localized_name: user.localized_name || user.name || '',
        enName: user.en_name || user.enName || '',
        email: user.email || user.enterprise_email || '',
        enterprise_email: user.enterprise_email || user.email || '',
        mobile: user.mobile || user.mobile_phone || user.mobilePhone || '',
        department: user.department || user.department_name || ''
      })).filter(user =&gt; user.name || user.localized_name);

      return NextResponse.json({ 
        success: true, 
        users: formattedUsers
      });
      
    } catch (cliError: any) {
      console.error('❌ lark-cli 执行失败:', cliError);
      return NextResponse.json({ 
        success: false, 
        error: `搜索失败: ${cliError.message || cliError.stderr || 'lark-cli 执行失败'}` 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ 搜索用户错误:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}
