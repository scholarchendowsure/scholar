import { NextRequest, NextResponse } from 'next/server';
import { addSecurityHeaders } from '@/lib/security';
import jschardet from 'jschardet';
import iconv from 'iconv-lite';

// 解析CSV文件，支持多种编码
function parseCSVWithEncoding(contentBuffer: Buffer) {
  // 检测编码
  const detection = jschardet.detect(contentBuffer);
  let encoding = 'utf-8';
  
  if (detection.encoding) {
    const detectedEncoding = detection.encoding.toLowerCase();
    if (detectedEncoding.includes('gb') || detectedEncoding.includes('big5')) {
      encoding = 'gb18030';
    } else if (detectedEncoding.includes('utf-8') || detectedEncoding.includes('utf8')) {
      encoding = 'utf-8';
    }
  }
  
  // 解码内容
  let content: string;
  try {
    if (encoding === 'gb18030') {
      content = iconv.decode(contentBuffer, 'gb18030');
    } else {
      content = contentBuffer.toString('utf-8');
      // 如果UTF-8解码还是乱码，尝试GB18030
      if (content.includes('���') || content.includes('?')) {
        content = iconv.decode(contentBuffer, 'gb18030');
      }
    }
  } catch {
    content = contentBuffer.toString('utf-8');
  }
  
  // 移除BOM
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }
  
  // 解析表头
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  // 解析数据行（前20条）
  const rows = [];
  for (let i = 1; i < Math.min(lines.length, 21); i++) {
    if (!lines[i].trim()) continue;
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  
  return { headers, rows, totalLines: lines.length - 1 };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return addSecurityHeaders(NextResponse.json({ 
        success: false, 
        error: '请选择文件' 
      }, { status: 400 }));
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { headers, rows, totalLines } = parseCSVWithEncoding(buffer);
    
    return addSecurityHeaders(NextResponse.json({
      success: true,
      data: {
        filename: file.name,
        totalRows: totalLines,
        headers,
        previewRows: rows
      }
    }));
  } catch (error) {
    console.error('Preview error:', error);
    return addSecurityHeaders(NextResponse.json({ 
      success: false, 
      error: '文件解析失败' 
    }, { status: 500 }));
  }
}
