import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';

// Mock data for testing
const mockServices = [
  {
    id: '1',
    name: '测试服务',
    type: 'http',
    endpoint: 'https://api.example.com',
    config: { host: '', port: 0, database: '' },
    apiKey: '',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// 测试 MCP 服务连接
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find service by ID (mock)
    const service = mockServices.find(s => s.id === id);

    if (!service) {
      return NextResponse.json(errorResponse('服务不存在'), { status: 404 });
    }

    // 根据类型测试连接
    let testResult = { success: false, message: '' };

    if (service.type === 'postgresql') {
      try {
        const { Pool } = await import('pg');
        const pool = new Pool({
          host: service.config?.host,
          port: service.config?.port || 5432,
          database: service.config?.database,
          user: service.apiKey ? JSON.parse(Buffer.from(service.apiKey, 'base64').toString()).user : undefined,
          password: service.apiKey ? JSON.parse(Buffer.from(service.apiKey, 'base64').toString()).password : undefined,
          connectionTimeoutMillis: 5000,
        });

        await pool.query('SELECT 1');
        await pool.end();
        testResult = { success: true, message: 'PostgreSQL 连接成功' };
      } catch (err) {
        testResult = { success: false, message: `连接失败: ${err instanceof Error ? err.message : '未知错误'}` };
      }
    } else if (service.type === 'http') {
      try {
        const response = await fetch(service.endpoint || '', {
          method: 'GET',
          headers: service.apiKey ? { 'Authorization': `Bearer ${service.apiKey}` } : {},
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          testResult = { success: true, message: 'HTTP 连接成功' };
        } else {
          testResult = { success: false, message: `HTTP ${response.status}` };
        }
      } catch (err) {
        testResult = { success: false, message: `连接失败: ${err instanceof Error ? err.message : '未知错误'}` };
      }
    } else {
      testResult = { success: false, message: '不支持的服务类型' };
    }

    // Mock update service status
    // await mockDb.update(schema.mcpServices).set({ status: testResult.success ? 'active' : 'error' }).where(eq(schema.mcpServices.id, id));

    return NextResponse.json(successResponse(testResult));
  } catch (error) {
    console.error('Test MCP service error:', error);
    return NextResponse.json(errorResponse('测试连接失败'), { status: 500 });
  }
}
