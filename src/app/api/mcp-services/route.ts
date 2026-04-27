import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';

// Mock MCP服务配置数据
let mockMcpServices = [
  { id: '1', name: '贷后数据库', description: '贷后管理系统主数据库', type: 'postgresql', status: 'active', endpoint: 'postgresql://localhost:5432/postloan', lastSyncTime: '2024-01-20T10:00:00Z', createdAt: '2024-01-01T00:00:00Z' },
  { id: '2', name: '逾期数据仓库', description: '逾期数据同步服务', type: 'mysql', status: 'inactive', endpoint: 'mysql://localhost:3306/overdue', lastSyncTime: null, createdAt: '2024-01-05T00:00:00Z' },
];

// 获取MCP服务列表
export async function GET() {
  try {
    return NextResponse.json(successResponse(mockMcpServices));
  } catch (error) {
    console.error('Get MCP services error:', error);
    return NextResponse.json(errorResponse('获取MCP服务列表失败'), { status: 500 });
  }
}

// 创建MCP服务
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.name || !body.endpoint) {
      return NextResponse.json(errorResponse('请填写必填字段'), { status: 400 });
    }

    const newService = {
      id: String(mockMcpServices.length + 1),
      name: body.name,
      description: body.description || '',
      type: body.type || 'postgresql',
      status: 'inactive',
      endpoint: body.endpoint,
      lastSyncTime: null,
      createdAt: new Date().toISOString(),
    };
    
    mockMcpServices.push(newService);

    return NextResponse.json(successResponse(newService));
  } catch (error) {
    console.error('Create MCP service error:', error);
    return NextResponse.json(errorResponse('创建MCP服务失败'), { status: 500 });
  }
}
