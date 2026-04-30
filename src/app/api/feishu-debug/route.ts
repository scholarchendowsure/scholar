import { NextRequest, NextResponse } from 'next/server';

const TEST_APP_ID = 'cli_a9652497d7389bd6';
const TEST_APP_SECRET = 'YHs5IxuDt5xXy4NT5dx0NgIVoC0aE2dO';
const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

async function getTenantAccessToken() {
  console.log('🔐 获取token...');
  const response = await fetch(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: TEST_APP_ID,
      app_secret: TEST_APP_SECRET,
    }),
  });
  
  const data = await response.json();
  console.log('📊 Token响应:', JSON.stringify(data, null, 2));
  return data.tenant_access_token;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const step = searchParams.get('step');

  try {
    console.log('🔍 调试步骤:', step);

    switch (step) {
      case 'token': {
        const token = await getTenantAccessToken();
        return NextResponse.json({
          success: true,
          message: 'Token获取成功',
          tokenPreview: token ? token.substring(0, 20) + '...' : 'null',
        });
      }

      case 'raw-users': {
        const token = await getTenantAccessToken();
        console.log('📡 调用用户API...');
        
        const response = await fetch(`${FEISHU_API_BASE}/contact/v3/users?page_size=50`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const rawText = await response.text();
        console.log('📄 原始响应:', rawText);

        let data;
        try {
          data = JSON.parse(rawText);
        } catch (e) {
          return NextResponse.json({
            success: false,
            message: '响应不是有效的JSON',
            rawText,
          });
        }

        return NextResponse.json({
          success: true,
          message: '获取原始用户数据成功',
          status: response.status,
          data,
        });
      }

      case 'departments': {
        const token = await getTenantAccessToken();
        console.log('📡 调用部门API...');
        
        const response = await fetch(`${FEISHU_API_BASE}/contact/v3/departments?page_size=50`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        return NextResponse.json({
          success: true,
          message: '获取部门数据成功',
          data,
        });
      }

      case 'users-by-department': {
        const deptId = searchParams.get('deptId') || '0';
        const token = await getTenantAccessToken();
        console.log('📡 调用部门用户API，部门ID:', deptId);
        
        const response = await fetch(`${FEISHU_API_BASE}/contact/v3/users/find_by_department?department_id=${deptId}&page_size=50`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        return NextResponse.json({
          success: true,
          message: '获取部门用户成功',
          departmentId: deptId,
          data,
        });
      }

      default: {
        return NextResponse.json({
          success: true,
          message: '飞书调试API',
          availableSteps: [
            'token - 测试获取token',
            'raw-users - 获取原始用户数据（查看完整响应）',
            'departments - 获取部门列表',
            'users-by-department?deptId=0 - 获取指定部门的用户',
          ],
        });
      }
    }
  } catch (error) {
    console.error('❌ 调试失败:', error);
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
