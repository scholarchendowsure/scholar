import { NextRequest, NextResponse } from 'next/server';
import { caseStorage, stripLargeFields } from '@/storage/database/case-storage';
import { addSecurityHeaders } from '@/lib/security';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseData = await caseStorage.getById(id);

    if (!caseData) {
      const response = NextResponse.json(
        { success: false, error: '案件不存在' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    // 🛡️ 默认剥离大字段（base64文件数据），除非明确请求完整数据
    const includeFiles = req.nextUrl.searchParams.get('includeFiles') === 'true';
    const responseData = includeFiles ? caseData : stripLargeFields(caseData);

    const response = NextResponse.json({
      success: true,
      data: responseData,
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Get case error:', error);
    const response = NextResponse.json(
      { success: false, error: '获取案件详情失败' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updatedCase = await caseStorage.update(id, body);

    if (!updatedCase) {
      const response = NextResponse.json(
        { success: false, error: '案件不存在' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    const response = NextResponse.json({
      success: true,
      data: updatedCase,
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Update case error:', error);
    const response = NextResponse.json(
      { success: false, error: '更新案件失败' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await caseStorage.delete(id);

    if (!success) {
      const response = NextResponse.json(
        { success: false, error: '案件不存在' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    const response = NextResponse.json({
      success: true,
      message: '删除成功',
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Delete case error:', error);
    const response = NextResponse.json(
      { success: false, error: '删除案件失败' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
