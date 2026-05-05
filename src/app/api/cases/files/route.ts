import { NextRequest, NextResponse } from 'next/server';
import { caseStorage } from '@/storage/database/case-storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');
    const fileName = searchParams.get('fileName');
    
    if (!caseId || !fileName) {
      return NextResponse.json({ error: '缺少caseId或fileName' }, { status: 400 });
    }
    
    // 从案件存储中获取案件
    const caseData = await caseStorage.getById(caseId);
    if (!caseData) {
      return NextResponse.json({ error: '案件不存在' }, { status: 404 });
    }
    
    // 查找文件数据
    let fileData: { name?: string; data?: string; type?: string } | null = null;
    
    // 先在案件的文件信息中查找
    if (caseData.files && Array.isArray(caseData.files)) {
      for (const f of caseData.files) {
        if (typeof f === 'object' && f !== null && 'name' in f && f.name === fileName) {
          fileData = f as { name?: string; data?: string; type?: string };
          break;
        }
      }
    }
    
    // 如果没找到，在跟进记录中查找
    if (!fileData && caseData.followups) {
      for (const followup of caseData.followups) {
        if (followup.fileInfo) {
          const fileInfoArr = Array.isArray(followup.fileInfo) 
            ? followup.fileInfo 
            : Object.values(followup.fileInfo);
          
          for (const f of fileInfoArr) {
            if (typeof f === 'object' && f !== null && 'name' in f && (f as Record<string, unknown>).name === fileName) {
              fileData = f as { name?: string; data?: string; type?: string };
              break;
            }
          }
          if (fileData) break;
        }
      }
    }
    
    if (!fileData) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }
    
    // 处理文件数据
    if (fileData.data) {
      const dataStr = fileData.data;
      
      // 🛡️ 检查base64数据是否已被剥离（设计规范：文件数据应存储在对象存储中）
      if (dataStr === '[stripped]' || dataStr.length < 100) {
        return NextResponse.json({ 
          error: '文件数据不可用', 
          message: '该文件数据已归档至对象存储，本地副本已清理以优化系统性能。请联系管理员获取文件。'
        }, { status: 410 }); // 410 Gone - 资源已永久删除
      }
      
      // 判断文件类型
      const isImage = fileData.type === 'image' || 
        /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(fileData.name || '');
      
      const mimeType = isImage ? 'image/jpeg' : 'application/octet-stream';
      
      let dataUrl = dataStr;
      if (!dataUrl.startsWith('data:')) {
        dataUrl = isImage 
          ? `data:image/jpeg;base64,${dataUrl}` 
          : `data:application/octet-stream;base64,${dataUrl}`;
      }
      
      // 转换为Buffer
      const base64Data = dataUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `inline; filename="${encodeURIComponent(fileData.name || fileName)}"`,
        },
      });
    }
    
    return NextResponse.json({ error: '文件数据格式不正确' }, { status: 400 });
  } catch (error) {
    console.error('文件API错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
