import { NextRequest, NextResponse } from 'next/server';
import { addSecurityHeaders } from '@/lib/security';

// 解析CSV文件
function parseCSV(content: string) {
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
  
  return { headers, rows };
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
    
    const content = await file.text();
    const { headers, rows } = parseCSV(content);
    
    return addSecurityHeaders(NextResponse.json({
      success: true,
      data: {
        filename: file.name,
        totalRows: content.trim().split('\n').length - 1,
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
