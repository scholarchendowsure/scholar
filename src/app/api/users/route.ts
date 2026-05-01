import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';
import { userStorage } from '@/storage/database/user-storage';
import { INITIAL_PASSWORD, USER_ROLE_LABELS } from '@/types/user';
import { formatDateTime } from '@/lib/utils';

// 获取用户列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const keyword = searchParams.get('keyword') || '';
    const username = searchParams.get('username') || '';
    const realName = searchParams.get('realName') || '';
    const position = searchParams.get('position') || '';
    const department = searchParams.get('department') || '';
    const status = searchParams.get('status') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const exportFlag = searchParams.get('export') === 'true';

    const filters = {
      keyword,
      username,
      realName,
      position,
      department,
      status,
      startDate,
      endDate,
    };

    if (exportFlag) {
      // 导出用户数据
      const users = userStorage.exportUsers(filters);
      return NextResponse.json(successResponse({
        data: users,
        exportedAt: new Date().toISOString(),
      }));
    }

    const result = userStorage.paginate(page, pageSize, filters);

    return NextResponse.json(successResponse({
      data: result.data.map(u => ({
        ...u,
        roleLabel: USER_ROLE_LABELS[u.role],
      })),
      total: result.total,
      page,
      pageSize,
      totalPages: result.totalPages,
    }));
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(errorResponse('获取用户列表失败'), { status: 500 });
  }
}

// 创建用户
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.realName || !body.username) {
      return NextResponse.json(errorResponse('请填写必填字段'), { status: 400 });
    }

    // 检查用户名是否已存在
    if (userStorage.findByUsername(body.username)) {
      return NextResponse.json(errorResponse('用户名已存在'), { status: 400 });
    }

    const newUser = userStorage.create({
      username: body.username,
      realName: body.realName,
      email: body.email || '',
      phone: body.phone || '',
      department: body.department || '',
      position: body.position || '',
      role: body.role || 'agent',
      status: 'active',
      allowedIps: body.allowedIps || [],
    });

    return NextResponse.json(successResponse({
      ...newUser,
      initialPassword: INITIAL_PASSWORD,
      message: `用户创建成功，初始密码为 ${INITIAL_PASSWORD}`,
    }));
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(errorResponse('创建用户失败'), { status: 500 });
  }
}
