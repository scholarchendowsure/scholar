import { NextRequest, NextResponse } from 'next/server';

const TEST_APP_ID = 'cli_a9652497d7389bd6';
const TEST_APP_SECRET = 'YHs5IxuDt5xXy4NT5dx0NgIVoC0aE2dO';
const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

async function getTenantAccessToken() {
  const response = await fetch(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: TEST_APP_ID,
      app_secret: TEST_APP_SECRET,
    }),
  });
  
  const data = await response.json();
  return data.tenant_access_token;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const step = searchParams.get('step');

  try {
    const token = await getTenantAccessToken();

    switch (step) {
      case 'employee-type': {
        console.log('📡 尝试员工类型API...');
        const response = await fetch(`${FEISHU_API_BASE}/contact/v3/users?user_id_type=open_id&page_size=100`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        return NextResponse.json({ success: true, step, data });
      }

      case 'batch-get': {
        console.log('📡 尝试批量获取用户...');
        const response = await fetch(`${FEISHU_API_BASE}/contact/v3/users/batch_get_id`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_ids: ['8cgee58f'],
          user_id_type: 'user_id',
          department_id_type: 'department_id',
          department_ids: ['0'],
          department_user_id_type: 'user_id',
        }),
        });
        const data = await response.json();
        return NextResponse.json({ success: true, step, data });
      }

      case 'user-detail': {
        const userId = searchParams.get('userId') || '8cgee58f';
        console.log('📡 获取单个用户详情...');
        const response = await fetch(`${FEISHU_API_BASE}/contact/v3/users/${userId}?user_id_type=user_id`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        return NextResponse.json({ success: true, step, userId, data });
      }

      case 'contact-scopes': {
        console.log('📡 检查通讯录权限范围...');
        const response = await fetch(`${FEISHU_API_BASE}/contact/v3/scope/get`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        return NextResponse.json({ success: true, step, data });
      }

      case 'all-endpoints': {
        const results: any = {};
        
        // 测试多个端点
        const endpoints = [
          { name: 'users-v3', url: `${FEISHU_API_BASE}/contact/v3/users?page_size=50` },
          { name: 'users-department', url: `${FEISHU_API_BASE}/contact/v3/users/find_by_department?department_id=0&page_size=50` },
          { name: 'employees', url: `${FEISHU_API_BASE}/contact/v3/employees?page_size=50` },
        ];

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint.url, {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${token}` },
            });
            results[endpoint.name] = await response.json();
          } catch (e) {
            results[endpoint.name] = { error: String(e) };
          }
        }

        return NextResponse.json({ success: true, step, results });
      }

      default: {
        return NextResponse.json({
          success: true,
          message: '飞书调试API - 多种获取用户方式测试',
          availableSteps: [
            'employee-type - 使用open_id获取用户',
            'user-detail?userId=xxx - 获取单个用户详情',
            'batch-get - 批量获取用户',
            'contact-scopes - 检查权限范围',
            'all-endpoints - 测试所有端点',
          ],
        });
      }
    }
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '调试失败',
        error: String(error),
      },
      { status: 500 }
    );
  }
}
