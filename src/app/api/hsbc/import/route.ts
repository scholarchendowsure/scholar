import { NextRequest, NextResponse } from 'next/server';
import { getHSBCLoansByBatchDate, saveHSBCLoans } from '@/storage/database/hsbc-loan-storage';
import type { HSBCLoan } from '@/lib/hsbc-loan';

// 解析中文日期格式 "2024年1月29日"
function parseChineseDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const cleaned = dateStr.replace(/["\u200b]/g, '').trim();
  const match = cleaned.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return cleaned;
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

// 解析日期（支持多种格式）
function parseDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  // 尝试中文日期
  const chinese = parseChineseDate(dateStr);
  if (chinese && chinese.includes('-') && chinese !== dateStr.replace(/["\u200b]/g, '').trim()) return chinese;
  // 尝试DD-MMM-YY
  const ddmmmmyy = parseDDMMMYY(dateStr);
  if (ddmmmmyy) return ddmmmmyy;
  // 尝试YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) return dateStr.trim();
  // 尝试Excel序列号日期
  const num = parseFloat(dateStr);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const excelDate = new Date((num - 25569) * 86400 * 1000);
    return excelDate.toISOString().split('T')[0];
  }
  return dateStr;
}

// 解析金额（支持多种格式）
function parseAmount(amountStr: unknown): number {
  // 如果是数字，直接返回
  if (typeof amountStr === 'number') return amountStr;
  
  // 如果是字符串
  if (typeof amountStr === 'string') {
    const cleaned = amountStr.replace(/[,，\s]/g, '').replace(/["\u200b]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  
  // 如果是对象（Excel 单元格对象等）
  if (amountStr !== null && typeof amountStr === 'object') {
    const obj = amountStr as Record<string, unknown>;
    // 尝试从对象中提取数值
    if (typeof obj.value === 'number') return obj.value;
    if (typeof obj.v === 'number') return obj.v;
    if (typeof obj.w === 'string') {
      const num = parseFloat(obj.w.replace(/[,，\s()]/g, ''));
      if (!isNaN(num)) return num;
    }
    if (typeof obj.text === 'string') {
      const num = parseFloat(obj.text.replace(/[,，\s()]/g, ''));
      if (!isNaN(num)) return num;
    }
  }
  
  return 0;
}

// 规范化列名
function normalizeKey(key: string): string {
  return key.replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loans, batchDate, mode = 'replace' } = body;

    if (!Array.isArray(loans) || loans.length === 0) {
      return NextResponse.json({ error: '没有可导入的数据' }, { status: 400 });
    }

    // 确定 batchDate
    const importDate = batchDate || new Date().toISOString().split('T')[0];

    // 解析还款计划（支持已解析的数组或需要重新解析的列数据）
    function parseRepaymentSchedule(row: Record<string, unknown>): { date: string; amount: number }[] {
      // 如果已经有 repaymentSchedule 字段（来自 parse API）
      if (row.repaymentSchedule) {
        if (Array.isArray(row.repaymentSchedule)) {
          return row.repaymentSchedule as { date: string; amount: number }[];
        }
        if (typeof row.repaymentSchedule === 'string') {
          try {
            return JSON.parse(row.repaymentSchedule);
          } catch {
            return [];
          }
        }
      }
      return [];
    }

    // 获取单元格值（处理 Excel 单元格对象）
    function getCellValue(val: unknown): string | number {
      if (val === null || val === undefined) return '';
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return val;
      if (typeof val === 'object') {
        const obj = val as Record<string, unknown>;
        // 优先使用格式化文本
        if (typeof obj.w === 'string') return obj.w;
        // 使用原始值
        if (typeof obj.v === 'number') return obj.v;
        if (typeof obj.v === 'string') return obj.v;
        // 使用文本属性
        if (typeof obj.text === 'string') return obj.text;
      }
      return String(val);
    }

    // 解析贷款数据
    const parsedLoans = loans.map((row: Record<string, unknown>, index: number) => {
      const keys = Object.keys(row);
      const repaymentSchedule = parseRepaymentSchedule(row);
      const getValue = (...possibleKeys: string[]): string => {
        for (const key of possibleKeys) {
          const nk = normalizeKey(key);
          for (const k of keys) {
            if (normalizeKey(k) === nk) {
              const val = row[k];
              const cellVal = getCellValue(val);
              return String(cellVal);
            }
          }
        }
        return '';
      };
      
      // 获取数值型值
      const getNumericValue = (...possibleKeys: string[]): number => {
        for (const key of possibleKeys) {
          const nk = normalizeKey(key);
          for (const k of keys) {
            if (normalizeKey(k) === nk) {
              const val = row[k];
              if (typeof val === 'number') return val;
              if (typeof val === 'object') {
                const obj = val as Record<string, unknown>;
                if (typeof obj.v === 'number') return obj.v;
                if (typeof obj.w === 'string') {
                  const num = parseFloat(obj.w.replace(/[,，\s()]/g, ''));
                  if (!isNaN(num)) return num;
                }
              }
              if (typeof val === 'string') {
                const num = parseFloat(val.replace(/[,，\s()]/g, ''));
                if (!isNaN(num)) return num;
              }
            }
          }
        }
        return 0;
      };

      // 如果需要从列数据解析还款计划
      if (repaymentSchedule.length === 0) {
        const repaymentDateIndices: number[] = [];
        const repaymentAmountIndices: number[] = [];

        keys.forEach((key, idx) => {
          const nk = normalizeKey(key);
          if (nk === 'repayment date' || (nk.includes('repayment') && nk.includes('date'))) {
            repaymentDateIndices.push(idx);
          }
          if (nk === 'repay amount' || (nk.includes('repay') && nk.includes('amount'))) {
            repaymentAmountIndices.push(idx);
          }
        });

        const pairCount = Math.min(repaymentDateIndices.length, repaymentAmountIndices.length);
        for (let i = 0; i < pairCount; i++) {
          const dateVal = row[keys[repaymentDateIndices[i]]];
          const amountVal = row[keys[repaymentAmountIndices[i]]];
          if (dateVal && amountVal && parseAmount(String(amountVal)) > 0) {
            repaymentSchedule.push({
              date: parseDate(String(dateVal)),
              amount: parseAmount(String(amountVal)),
            });
          }
        }
      }

      const loanCurrency = (getValue('Loan Currency', 'loanCurrency') || 'CNY').toUpperCase() as 'CNY' | 'USD';

      return {
        id: `hsbc-${importDate}-${index}`,
        loanReference: getValue('Loan Reference', 'loanReference'),
        merchantId: getValue('Merchant ID', 'merchantId'),
        borrowerName: getValue('Borrower Name', 'borrowerName'),
        loanStartDate: parseDate(getValue('Loan Start Date', 'loanDate')),
        loanCurrency,
        loanAmount: getNumericValue('Loan Amount', 'loanAmount'),
        loanInterest: getValue('Loan Interest', 'loanInterest'),
        totalInterestRate: getNumericValue('Total Interest Rate', 'totalInterestRate'),
        loanTenor: getValue('Loan Tenor', 'loanTenor'),
        maturityDate: parseDate(getValue('Maturity Date', 'maturityDate')),
        repaymentSchedule,
        balance: getNumericValue('Balance', 'balance'),
        pastdueAmount: getNumericValue('Pastdue amount', 'pastdueAmount', 'Pastdue Amount'),
        batchDate: importDate,
        rmApproval: getValue('Approval from RM TH (No action taken on Freeze Account OR Force Debit)? (DDMMYY)'),
        dowsureFreezeConfirm: getValue('Confirmation from Dowsure with action taken on Freeze Account? (DDMMYY)'),
        dowsureForceDebitConfirm: getValue('Confirmation from Dowsure with action taken on Force Debit? (DDMMYY)'),
        remarks: getValue('Remarks (Any subsequent action likes freeze PSP account on day 8 or follow up with Dowsure if no response on action date)'),
      } as HSBCLoan;
    });

// 根据导入模式处理
    if (mode === 'append' || mode === 'merge') {
      const existingLoans = await getHSBCLoansByBatchDate(importDate);
      // 增量模式：去重追加
      const existingRefs = new Set(existingLoans.map(l => l.loanReference));
      const newLoans = parsedLoans.filter(l => !existingRefs.has(l.loanReference));
      const loansToSave = [...existingLoans, ...newLoans].map(l => ({ ...l, batchDate: importDate }));
      await saveHSBCLoans(loansToSave);
    } else {
      const loansToSave = parsedLoans.map(l => ({ ...l, batchDate: importDate }));
      await saveHSBCLoans(loansToSave);
    }

    const currentLoans = await getHSBCLoansByBatchDate(importDate);

    return NextResponse.json({
      success: true,
      message: `成功导入 ${parsedLoans.length} 条记录，批次日期：${importDate}`,
      importedCount: parsedLoans.length,
      totalCount: currentLoans.length,
      batchDate: importDate,
    });
  } catch (error) {
    console.error('汇丰数据导入失败:', error);
    return NextResponse.json({ error: '导入失败：' + (error instanceof Error ? error.message : '未知错误') }, { status: 500 });
  }
}
