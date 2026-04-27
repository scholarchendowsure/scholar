import { NextRequest, NextResponse } from 'next/server';
import { getCachedLoans, setCachedLoans, parseImportRow, calculateStats, HSBCLoan, HSBCImportRow } from '@/lib/hsbc-loan';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mode = formData.get('mode') as string || 'replace'; // replace | append

    if (!file) {
      return NextResponse.json({ error: '未上传文件' }, { status: 400 });
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const content = buffer.toString('binary');

    // 解析 Excel/CSV (简单的 CSV 解析)
    // 对于完整的 Excel 解析，需要使用 xlsx 库
    // 这里我们尝试使用内置的解析方式
    
    let rows: HSBCImportRow[] = [];
    
    // 检测文件类型
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCSV = file.name.endsWith('.csv');
    
    if (isExcel) {
      // Excel 文件解析 - 使用简单的 XML 解析
      try {
        // 尝试解析为 CSV 格式 (如果 Excel 是简单的)
        rows = parseSimpleCSV(content);
      } catch (e) {
        console.error('Excel parse error:', e);
        // 如果 Excel 解析失败，尝试 CSV 解析
        rows = parseCSV(content);
      }
    } else if (isCSV) {
      rows = parseCSV(content);
    } else {
      // 尝试 CSV 解析
      rows = parseCSV(content);
    }

    // 解析每一行
    const loans: HSBCLoan[] = [];
    const errors: { row: number; error: string }[] = [];

    rows.forEach((row, index) => {
      try {
        const loan = parseImportRow(row);
        if (loan) {
          loans.push(loan);
        }
      } catch (e: any) {
        errors.push({ row: index + 1, error: e.message || '解析失败' });
      }
    });

    // 根据模式处理数据
    let finalLoans: HSBCLoan[];
    if (mode === 'append') {
      const existingLoans = getCachedLoans();
      const existingRefs = new Set(existingLoans.map(l => l.loanReference));
      const newLoans = loans.filter(l => !existingRefs.has(l.loanReference));
      finalLoans = [...existingLoans, ...newLoans];
    } else {
      finalLoans = loans;
    }

    // 更新缓存
    setCachedLoans(finalLoans);

    // 计算统计
    const stats = calculateStats(finalLoans);

    return NextResponse.json({
      success: true,
      imported: loans.length,
      mode,
      stats,
      errors: errors.slice(0, 10), // 只返回前10个错误
      totalErrors: errors.length,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: '导入失败: ' + (error.message || '未知错误') },
      { status: 500 }
    );
  }
}

// CSV 解析函数
function parseCSV(content: string): HSBCImportRow[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // 解析表头
  const headers = parseCSVLine(lines[0]);
  
  // 解析数据行
  const rows: HSBCImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length > 0) {
      const row: HSBCImportRow = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    }
  }

  return rows;
}

// 解析单行 CSV
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// 简单的 Excel XML 解析
function parseSimpleCSV(content: string): HSBCImportRow[] {
  // 尝试从 XML 中提取表格数据
  const rows: HSBCImportRow[] = [];
  
  // 查找 <row 或 <Row 标签
  const rowMatches = content.match(/<row[^>]*>([\s\S]*?)<\/row>/gi) || [];
  
  // 查找共享字符串
  const sharedStrings: string[] = [];
  const ssMatches = content.match(/<si>([\s\S]*?)<\/si>/gi) || [];
  ssMatches.forEach(si => {
    const textMatch = si.match(/<t[^>]*>([^<]*)<\/t>/i);
    if (textMatch) {
      sharedStrings.push(textMatch[1]);
    }
  });
  
  rowMatches.forEach((rowContent, rowIndex) => {
    if (rowIndex === 0) return; // 跳过表头行
    
    const row: HSBCImportRow = {};
    const cellMatches = rowContent.match(/<c[^>]*r="([A-Z]+)(\d+)"[^>]*>([\s\S]*?)<\/c>/gi) || [];
    
    cellMatches.forEach(cell => {
      const refMatch = cell.match(/r="([A-Z]+)(\d+)"/);
      const typeMatch = cell.match(/t="([^"]+)"/);
      const valueMatch = cell.match(/<v>([^<]*)<\/v>/);
      
      if (refMatch && valueMatch) {
        const col = refMatch[1];
        const type = typeMatch ? typeMatch[1] : '';
        let value = valueMatch[1];
        
        // 如果是共享字符串，替换为实际值
        if (type === 's' && sharedStrings.length > 0) {
          const idx = parseInt(value);
          if (!isNaN(idx) && idx < sharedStrings.length) {
            value = sharedStrings[idx];
          }
        }
        
        // 转换为表头名
        const headerName = columnToHeader(col);
        if (headerName) {
          row[headerName] = value;
        }
      }
    });
    
    if (Object.keys(row).length > 0) {
      rows.push(row);
    }
  });
  
  return rows;
}

// 列名转表头名
function columnToHeader(col: string): string | null {
  const headerMap: Record<string, string> = {
    'A': 'Loan Reference',
    'B': 'Merchant ID',
    'C': 'Borrower Name',
    'D': 'Loan Start Date',
    'E': 'Loan Currency',
    'F': 'Loan Amount',
    'G': 'Loan Interest',
    'H': 'Total Interest Rate',
    'I': 'Loan Tenor',
    'J': 'Maturity Date',
    'K': 'Balance',
    'L': 'Pastdue amount',
  };
  
  return headerMap[col] || null;
}

// 获取导入状态
export async function GET() {
  const loans = getCachedLoans();
  const stats = calculateStats(loans);
  
  return NextResponse.json({
    total: loans.length,
    stats,
    lastImport: new Date().toISOString(),
  });
}
