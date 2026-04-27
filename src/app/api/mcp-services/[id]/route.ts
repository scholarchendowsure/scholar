import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';

// Mock MCP服务配置数据
let mockMcpServices = [
  { id: '1', name: '贷后数据库', description: '贷后管理系统主数据库', type: 'postgresql', status: 'active', endpoint: 'postgresql://localhost:5432/postloan', lastSyncTime: '2024-01-20T10:00:00Z', createdAt: '2024-01-01T00:00:00Z' },
  { id: '2', name: '逾期数据仓库', description: '逾期数据同步服务', type: 'mysql', status: 'inactive', endpoint: 'mysql://localhost:3306/overdue', lastSyncTime: null, createdAt: '2024-01-05T00:00:00Z' },
];

// 获取/更新/删除MCP服务
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = mockMcpServices.find(s => s.id === id);

    if (!service) {
      return NextResponse.json(errorResponse('服务不存在'), { status: 404 });
    }

    return NextResponse.json(successResponse(service));
  } catch (error) {
    console.error('Get MCP service error:', error);
    return NextResponse.json(errorResponse('获取MCP服务失败'), { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const index = mockMcpServices.findIndex(s => s.id === id);

    if (index === -1) {
      return NextResponse.json(errorResponse('服务不存在'), { status: 404 });
    }

    mockMcpServices[index] = {
      ...mockMcpServices[index],
      name: body.name ?? mockMcpServices[index].name,
      description: body.description ?? mockMcpServices[index].description,
      type: body.type ?? mockMcpServices[index].type,
      status: body.status ?? mockMcpServices[index].status,
      endpoint: body.endpoint ?? mockMcpServices[index].endpoint,
    };

    return NextResponse.json(successResponse(mockMcpServices[index]));
  } catch (error) {
    console.error('Update MCP service error:', error);
    return NextResponse.json(errorResponse('更新MCP服务失败'), { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const index = mockMcpServices.findIndex(s => s.id === id);

    if (index === -1) {
      return NextResponse.json(errorResponse('服务不存在'), { status: 404 });
    }

    mockMcpServices.splice(index, 1);

    return NextResponse.json(successResponse({ message: '删除成功' }));
  } catch (error) {
    console.error('Delete MCP service error:', error);
    return NextResponse.json(errorResponse('删除MCP服务失败'), { status: 500 });
  }
}
