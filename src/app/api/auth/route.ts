import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';

// 验证码存储（生产环境应使用Redis）
const captchaStore = new Map<string, { code: string; expires: number }>();

// Mock用户数据
let mockUsers = [
  { id: '1', sequence: 1, name: '张三', username: 'zhangsan', email: 'zhangsan@example.com', password: 'admin123', department: '外访部', role: 'agent', status: 'active', lastLoginTime: '2024-01-20T09:00:00Z', createdAt: '2024-01-01T00:00:00Z' },
  { id: '2', sequence: 2, name: '李四', username: 'lisi', email: 'lisi@example.com', password: 'admin123', department: '外访部', role: 'agent', status: 'active', lastLoginTime: '2024-01-19T18:00:00Z', createdAt: '2024-01-01T00:00:00Z' },
  { id: '3', sequence: 3, name: '王五', username: 'wangwu', email: 'wangwu@example.com', password: 'admin123', department: '管理部', role: 'manager', status: 'active', lastLoginTime: '2024-01-20T08:30:00Z', createdAt: '2024-01-01T00:00:00Z' },
  { id: '4', sequence: 4, name: '管理员', username: 'days', email: 'admin@example.com', password: '9469832.qaz', department: '管理部', role: 'admin', status: 'active', lastLoginTime: '2024-01-20T10:00:00Z', createdAt: '2024-01-01T00:00:00Z' },
];

// 登录
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, captcha, captchaId } = body;

    if (!username || !password) {
      return NextResponse.json(errorResponse('请输入用户名和密码'), { status: 400 });
    }

    if (!captcha || !captchaId) {
      return NextResponse.json(errorResponse('请输入验证码'), { status: 400 });
    }

    // 验证验证码
    const storedCaptcha = captchaStore.get(captchaId);
    if (!storedCaptcha) {
      return NextResponse.json(errorResponse('验证码已过期，请刷新'), { status: 400 });
    }

    if (Date.now() > storedCaptcha.expires) {
      captchaStore.delete(captchaId);
      return NextResponse.json(errorResponse('验证码已过期，请刷新'), { status: 400 });
    }

    if (storedCaptcha.code.toLowerCase() !== captcha.toLowerCase()) {
      return NextResponse.json(errorResponse('验证码错误'), { status: 400 });
    }

    // 验证码正确，删除已使用的验证码
    captchaStore.delete(captchaId);

    const user = mockUsers.find(u => u.username === username && u.password === password);

    if (!user) {
      return NextResponse.json(errorResponse('用户名或密码错误'), { status: 401 });
    }

    // 生成简单token
    const token = Buffer.from(JSON.stringify({ userId: user.id, exp: Date.now() + 86400000 })).toString('base64');

    // 更新最后登录时间
    user.lastLoginTime = new Date().toISOString();

    return NextResponse.json(successResponse({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        department: user.department,
      },
    }));
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(errorResponse('登录失败'), { status: 500 });
  }
}

// 获取用户列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const keyword = searchParams.get('keyword') || '';
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    let filteredUsers = [...mockUsers];

    if (keyword) {
      filteredUsers = filteredUsers.filter(u =>
        u.name.includes(keyword) ||
        u.username.includes(keyword) ||
        (u.email && u.email.includes(keyword))
      );
    }
    if (role) {
      filteredUsers = filteredUsers.filter(u => u.role === role);
    }
    if (status) {
      filteredUsers = filteredUsers.filter(u => u.status === status);
    }

    const total = filteredUsers.length;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;
    const paginatedUsers = filteredUsers.slice(offset, offset + pageSize);

    return NextResponse.json(successResponse({
      data: paginatedUsers.map(u => ({
        ...u,
        lastLoginTime: u.lastLoginTime ? formatDateTime(u.lastLoginTime) : null,
        createdAt: formatDateTime(u.createdAt),
      })),
      total,
      page,
      pageSize,
      totalPages,
    }));
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(errorResponse('获取用户列表失败'), { status: 500 });
  }
}

// 创建用户
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    const newUser = {
      id: String(mockUsers.length + 1),
      sequence: mockUsers.length + 1,
      ...body,
      status: 'active',
      lastLoginTime: null,
      createdAt: new Date().toISOString(),
    };
    
    mockUsers.push(newUser);

    return NextResponse.json(successResponse(newUser));
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(errorResponse('创建用户失败'), { status: 500 });
  }
}
