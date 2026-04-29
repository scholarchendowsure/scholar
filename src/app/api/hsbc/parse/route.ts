import { NextRequest, NextResponse } from 'next/server';

const DECRYPT_PASSWORD = 'amazon246';

// 解析中文日期格式 "2024年1月29日"
function parseChineseDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const cleaned = dateStr.replace(/["\u200b]/g, '').trim();
  const match = cleaned.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return '';
}

// 解析DD-MMM-YY格式日期 (如 "08-Apr-24")
function parseDDMMMYY(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const cleaned = dateStr.replace(/["\u200b]/g, '').trim();
  const months: Record<string, string> = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
  };
  const match = cleaned.match(/(\d{1,2})-(\w{3})-(\d{2,4})/i);
  if (match) {
    const [, day, monthStr, yearStr] = match;
    const month = months[monthStr.toLowerCase()];
    if (month) {
      const year = yearStr.length === 2 ? `20${yearStr}` : yearStr;
      return `${year}-${month}-${day.padStart(2, '0')}`;
    }
  }
  return '';
}

// 解析日期（支持多种格式，包括Excel序列号）
function parseDate(dateValue: string | number | undefined | null): string {
  if (!dateValue || dateValue === '') return '';
  
  // 如果是数字（Excel序列号日期）
  if (typeof dateValue === 'number' && dateValue > 40000 && dateValue < 60000) {
    const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
    const year = excelDate.getFullYear();
    const month = String(excelDate.getMonth() + 1).padStart(2, '0');
    const day = String(excelDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  const dateStr = String(dateValue);
  
  // 尝试中文日期
  const chinese = parseChineseDate(dateStr);
  if (chinese && chinese.includes('-') && chinese !== dateStr.replace(/["\u200b]/g, '').trim()) return chinese;
  // 尝试DD-MMM-YY
  const ddmmmmyy = parseDDMMMYY(dateStr);
  if (ddmmmmyy) return ddmmmmyy;
  // 尝试YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) return dateStr.trim();
  return dateStr;
}

// 解析金额 - 支持多种格式
function parseAmount(amountStr: unknown): number {
  // 如果是数字，直接返回
  if (typeof amountStr === 'number' && !isNaN(amountStr)) return amountStr;
  
  // 如果是字符串
  if (typeof amountStr === 'string') {
    const cleaned = amountStr.replace(/[,，\s]/g, '').replace(/["\u200b()]/g, '');
    // 处理会计格式的负数: (123.45) -> -123.45
    const isNegative = cleaned.startsWith('-') || amountStr.includes('(');
    const numStr = cleaned.replace(/[()]/g, '');
    const num = parseFloat(numStr);
    if (isNaN(num)) return 0;
    return isNegative ? -num : num;
  }
  
  // 如果是对象（Excel 复杂单元格格式）
  if (amountStr !== null && typeof amountStr === 'object') {
    // 尝试从对象中提取数值
    const obj = amountStr as Record<string, unknown>;
    if (typeof obj.value === 'number') return obj.value;
    if (typeof obj.v === 'number') return obj.v;
    if (typeof obj.w === 'string') {
      const num = parseFloat(obj.w.replace(/[,，\s()]/g, ''));
      if (!isNaN(num)) return num;
    }
    // 如果对象有 text 属性，递归解析
    if (typeof obj.text === 'string') return parseAmount(obj.text);
    if (typeof obj.t === 'string' && typeof obj.v === 'number') return obj.v;
  }
  
  return 0;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '请上传文件' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let rawData: (string | number)[][] = [];
    let isEncrypted = false;

    // 使用 xlsx 库解析（支持密码解密）
    const XLSX = await import('xlsx');

    // 尝试1: 直接读取（非加密文件）
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    } catch (directError: unknown) {
      const errorMsg = directError instanceof Error ? directError.message : String(directError);
      console.log('直接读取失败，尝试密码解密:', errorMsg.substring(0, 100));

      // 尝试2: 使用密码读取（加密文件）
      try {
        const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false, password: DECRYPT_PASSWORD });
        isEncrypted = true;
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        console.log('使用密码解密成功');
      } catch (passwordError: unknown) {
        const pwdErrorMsg = passwordError instanceof Error ? passwordError.message : String(passwordError);
        console.log('密码解密失败，尝试xlsx-populate:', pwdErrorMsg.substring(0, 100));

        // 尝试3: 使用 xlsx-populate 解密
        try {
          const XlsxPopulate = require('xlsx-populate');
          const populateWorkbook = await XlsxPopulate.fromDataAsync(buffer, { password: DECRYPT_PASSWORD });
          isEncrypted = true;

          // 从 xlsx-populate workbook 提取数据
          const sheet = populateWorkbook.sheet(0);
          const usedRange = sheet.usedRange();
          if (!usedRange) {
            return NextResponse.json({ error: '文件没有数据' }, { status: 400 });
          }

          const startRow = usedRange.startCell().rowNumber();
          const endRow = usedRange.endCell().rowNumber();
          const startCol = usedRange.startCell().columnNumber();
          const endCol = usedRange.endCell().columnNumber();

          for (let r = startRow; r <= endRow; r++) {
            const row: (string | number)[] = [];
            for (let c = startCol; c <= endCol; c++) {
              try {
                const cell = sheet.cell(r, c);
                const value = cell.value();
                if (value instanceof Date) {
                  const year = value.getFullYear();
                  const month = String(value.getMonth() + 1).padStart(2, '0');
                  const day = String(value.getDate()).padStart(2, '0');
                  row.push(`${year}年${month}月${day}日`);
                } else if (typeof value === 'object' && value !== null) {
                  if ('text' in value) {
                    row.push(String((value as { text: string }).text));
                  } else if ('result' in value) {
                    row.push(Number((value as { result: number }).result) || '');
                  } else {
                    row.push(String(value));
                  }
                } else {
                  row.push(value === undefined || value === null ? '' : value);
                }
              } catch {
                row.push('');
              }
            }
            rawData.push(row);
          }
          console.log('xlsx-populate 解密成功，行数:', rawData.length);
        } catch (populateError: unknown) {
          const popErrorMsg = populateError instanceof Error ? populateError.message : String(populateError);
          console.error('所有解密方式均失败:', popErrorMsg);
          return NextResponse.json({
            error: '文件解密失败，请确认文件是否加密或密码是否正确',
            detail: popErrorMsg.substring(0, 200),
          }, { status: 400 });
        }
      }
    }

    if (rawData.length < 2) {
      return NextResponse.json({ error: '文件没有数据（至少需要表头行和一行数据）' }, { status: 400 });
    }

    // 获取表头行
    const headerRow = rawData[0].map((h: string | number) => String(h || '').replace(/[\n\r]/g, ' ').trim());

    // 找到各列的索引
    const findColumnIndex = (keywords: string[]): number => {
      for (let i = 0; i < headerRow.length; i++) {
        const headerLower = headerRow[i].toLowerCase();
        for (const kw of keywords) {
          if (headerLower.includes(kw.toLowerCase())) return i;
        }
      }
      return -1;
    };

    // 核心列索引
    const loanRefIdx = findColumnIndex(['Loan Reference']);
    const merchantIdIdx = findColumnIndex(['Merchant ID']);
    const borrowerIdx = findColumnIndex(['Borrower Name']);
    const startDateIdx = findColumnIndex(['Loan Start Date']);
    const currencyIdx = findColumnIndex(['Loan Currency']);
    const amountIdx = headerRow.findIndex((h: string, i: number) => {
      const hl = h.toLowerCase();
      return hl === 'loan amount' || (hl.includes('loan') && hl.includes('amount') && i < 20);
    });
    const interestIdx = findColumnIndex(['Loan Interest']);
    const rateIdx = findColumnIndex(['Total Interest Rate']);
    const tenorIdx = findColumnIndex(['Loan Tenor']);
    const maturityIdx = findColumnIndex(['Maturity Date']);
    const balanceIdx = headerRow.reduce((lastIdx: number, h: string, i: number) => {
      return h.toLowerCase() === 'balance' ? i : lastIdx;
    }, -1);
    const pastdueIdx = headerRow.reduce((lastIdx: number, h: string, i: number) => {
      return h.toLowerCase().includes('pastdue') ? i : lastIdx;
    }, -1);
    const freezeIdx = findColumnIndex(['Freeze Account Requested']);
    const forceDebitIdx = findColumnIndex(['Force Debit Requested']);
    const rmApprovalIdx = findColumnIndex(['Approval from RM TH']);
    const dowsureFreezeIdx = findColumnIndex(['Confirmation from Dowsure with action taken on Freeze']);
    const dowsureForceDebitIdx = findColumnIndex(['Confirmation from Dowsure with action taken on Force Debit']);
    const remarksIdx = findColumnIndex(['Remarks']);

    // 找到所有还款日期和还款金额列
    const repaymentDateIndices: number[] = [];
    const repaymentAmountIndices: number[] = [];
    for (let i = 0; i < headerRow.length; i++) {
      const h = headerRow[i].toLowerCase();
      if (h === 'repayment date' || (h.includes('repayment') && h.includes('date') && !h.includes('start'))) {
        repaymentDateIndices.push(i);
      }
      if (h === 'repay amount' || (h.includes('repay') && h.includes('amount'))) {
        repaymentAmountIndices.push(i);
      }
    }

    // 解析数据行（跳过表头）
    const loans: Record<string, unknown>[] = [];
    for (let rowIdx = 1; rowIdx < rawData.length; rowIdx++) {
      const row = rawData[rowIdx];

      // 跳过完全空的行
      const hasData = (row as (string | number)[]).some((cell, idx) => {
        if (idx === 0) return false;
        return cell !== '' && cell !== null && cell !== undefined;
      });
      if (!hasData) continue;

      // 获取单元格值，支持数字和对象类型
      const getCellValue = (idx: number): unknown => {
        if (idx < 0 || idx >= (row as unknown[]).length) return '';
        const val = (row as unknown[])[idx];
        if (val === null || val === undefined) return '';
        
        // 处理对象类型（Excel 单元格复杂格式）
        if (typeof val === 'object') {
          const obj = val as Record<string, unknown>;
          // 优先返回原始数值
          if (typeof obj.v === 'number') return obj.v;
          if (typeof obj.w === 'string') return obj.w;
          if (typeof obj.text === 'string') return obj.text;
          // 如果对象可以转为字符串
          return String(val);
        }
        
        return val;
      };

      const loanRef = getCellValue(loanRefIdx);
      if (!loanRef) continue;

      // 构建还款计划
      const repaymentSchedule: { date: string; amount: number }[] = [];
      for (let i = 0; i < Math.min(repaymentDateIndices.length, repaymentAmountIndices.length); i++) {
        const dateVal = getCellValue(repaymentDateIndices[i]);
        const amountVal = getCellValue(repaymentAmountIndices[i]);
        const parsedDate = parseDate(dateVal);
        const parsedAmount = parseAmount(amountVal);
        if (parsedDate && parsedAmount > 0) {
          repaymentSchedule.push({
            date: parsedDate,
            amount: parsedAmount,
          });
        }
      }

      // 清理字符串值中的不可见字符
      const cleanString = (val: unknown): string => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'number') return String(val);
        if (typeof val === 'object') {
          const obj = val as Record<string, unknown>;
          if (typeof obj.v === 'number') return String(obj.v);
          if (typeof obj.text === 'string') return obj.text.replace(/[\u200b\u00a0]/g, '').trim();
          if (typeof obj.w === 'string') return obj.w;
          return String(val);
        }
        return String(val).replace(/[\u200b\u00a0]/g, '').trim();
      };

      const loan: Record<string, unknown> = {
        loanReference: cleanString(loanRef),
        merchantId: cleanString(getCellValue(merchantIdIdx)),
        borrowerName: cleanString(getCellValue(borrowerIdx)),
        loanStartDate: parseDate(getCellValue(startDateIdx)),
        loanCurrency,
        loanAmount: parseAmount(getCellValue(amountIdx)),
        loanInterest: cleanString(getCellValue(interestIdx)),
        totalInterestRate: parseAmount(getCellValue(rateIdx)),
        loanTenor: cleanString(getCellValue(tenorIdx)),
        maturityDate: parseDate(getCellValue(maturityIdx)),
        repaymentSchedule: repaymentSchedule,
        balance: parseAmount(getCellValue(balanceIdx)),
        pastdueAmount: parseAmount(getCellValue(pastdueIdx)),
        batchDate: '',
        freezeAccountRequested: cleanString(getCellValue(freezeIdx)),
        forceDebitRequested: cleanString(getCellValue(forceDebitIdx)),
        rmApproval: cleanString(getCellValue(rmApprovalIdx)),
        dowsureFreezeConfirm: cleanString(getCellValue(dowsureFreezeIdx)),
        dowsureForceDebitConfirm: cleanString(getCellValue(dowsureForceDebitIdx)),
        remarks: cleanString(getCellValue(remarksIdx)),
      };

      loans.push(loan);
    }

    return NextResponse.json({
      success: true,
      message: `成功解析 ${loans.length} 条记录${isEncrypted ? '（已自动解密）' : ''}`,
      totalRows: rawData.length - 1,
      parsedRows: loans.length,
      loans,
      isEncrypted,
    });
  } catch (error) {
    console.error('Excel文件解析失败:', error);
    return NextResponse.json({
      error: '文件解析失败：' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 });
  }
}
