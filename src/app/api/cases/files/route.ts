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
    
    // 在文件信息和跟进记录中查找文件
    let foundFile: any = null;
    
    // 先在案件的文件信息中查找
    if (caseData.files) {
      foundFile = (caseData.files as any[]).find((f: any) => 
        f.name === fileName || f === fileName
      );
    }
    
    // 如果没找到，在跟进记录中查找
    if (!foundFile && caseData.followups) {
      for (const followup of caseData.followups) {
        if (followup.fileInfo) {
          foundFile = (followup.fileInfo as any[]).find((f: any) => 
            f.name === fileName || f === fileName
          );
          if (foundFile) break;
        }
      }
    }
    
    if (!foundFile) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }
    
    // 处理文件数据
    let fileData: any = foundFile;
    let mimeType = 'application/octet-stream';
    
    if (fileData && typeof fileData === 'object' && fileData.data) {
      // 如果是CaseFile类型
      const isImage = fileData.type === 'image' || 
        /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(fileData.name || '');
      
      mimeType = isImage ? 'image/jpeg' : 'application/octet-stream';
      
      let dataUrl = fileData.data;
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
