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

// 解析日期（支持多种格式，包含多日期取后面一个）
function parseDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  
  // 处理多日期情况：换行分隔或空格分隔，取后面那个日期
  const cleaned = dateStr.replace(/["\u200b]/g, '').trim();
  const dateParts = cleaned.split(/[\n\r]+/).map(s => s.trim()).filter(Boolean);
  
  if (dateParts.length > 1) {
    // 有多个日期，取最后一个
    for (let i = dateParts.length - 1; i >= 0; i--) {
      const parsed = tryParseSingleDate(dateParts[i]);
      if (parsed) return parsed;
    }
  }
  
  return tryParseSingleDate(cleaned);
}

// 尝试解析单个日期
function tryParseSingleDate(dateStr: string): string {
  // 尝试中文日期
  const chinese = parseChineseDate(dateStr);
  if (chinese && chinese.includes('-') && chinese !== dateStr) return chinese;
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

// 解析金额（支持多种格式，多金额取第一个）
function parseAmount(amountStr: unknown): number {
  // 如果是数字，直接返回
  if (typeof amountStr === 'number') return amountStr;
  
  // 如果是字符串
  if (typeof amountStr === 'string') {
    // 处理多金额情况：换行分隔，取第一个
    const parts = amountStr.split(/[\n\r]+/).map(s => s.trim()).filter(Boolean);
    const targetStr = parts.length > 0 ? parts[0] : amountStr;
    const cleaned = targetStr.replace(/[,，\s]/g, '').replace(/["\u200b]/g, '');
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
                return parseAmount(val);
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
      
      // 计算totalRepaid、balance、pastdueAmount等字段
      const loanAmount = getNumericValue('Loan Amount', 'loanAmount');
      
      // 从还款计划计算已还款总额
      const totalRepaid = repaymentSchedule.reduce((sum, item) => sum + (item.amount || 0), 0);
      
      // 计算余额：贷款金额 - 已还款总额（最小为0）
      const balance = Math.max(0, loanAmount - totalRepaid);
      
      // 计算逾期天数和状态
      const maturityDateStr = parseDate(getValue('Maturity Date', 'maturityDate'));
      let overdueDays = -1; // -1表示正常
      let pastdueAmount = 0;
      let status = 'normal';
      
      if (maturityDateStr && balance > 0.9) {
        const maturityDate = new Date(maturityDateStr);
        const referenceDate = new Date(importDate);
        const diffDays = Math.floor((referenceDate.getTime() - maturityDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
          overdueDays = diffDays;
          pastdueAmount = balance;
          status = 'overdue';
        }
      }

      return {
        id: `hsbc-${importDate}-${index}`,
        loanReference: getValue('Loan Reference', 'loanReference'),
        merchantId: getValue('Merchant ID', 'merchantId'),
        merchantName: getValue('Merchant Name', 'merchantName'),
        borrowerName: getValue('Borrower Name', 'borrowerName'),
        loanStartDate: parseDate(getValue('Loan Start Date', 'loanDate')),
        loanCurrency,
        loanAmount,
        loanInterest: getValue('Loan Interest', 'loanInterest'),
        totalInterestRate: getNumericValue('Total Interest Rate', 'totalInterestRate'),
        loanTenor: getValue('Loan Tenor', 'loanTenor'),
        maturityDate: maturityDateStr,
        repaymentSchedule,
        balance,
        pastdueAmount,
        overdueDays,
        status,
        totalRepaid,
        batchDate: importDate,
        remarks: getValue('Remarks', 'remarks'),
      } as HSBCLoan;
    });

    // 根据导入模式处理
    if (mode === 'merge') {
      // 增量模式：使用 upsert 更新相同 loanReference 的记录，不删除其他数据
      await saveHSBCLoans(parsedLoans, 'merge');
    } else {
      // 覆盖模式：删除该批次所有旧数据，插入新数据
      await saveHSBCLoans(parsedLoans, 'replace');
    }

    const currentLoans = await getHSBCLoansByBatchDate(importDate);

    return NextResponse.json({
      success: true,
      message: `成功导入 ${parsedLoans.length} 条记录，批次日期：${importDate}，模式：${mode === 'merge' ? '增量导入' : '覆盖导入'}`,
      importedCount: parsedLoans.length,
      totalCount: currentLoans.length,
      batchDate: importDate,
      mode,
    });
  } catch (error) {
    console.error('汇丰数据导入失败:', error);
    return NextResponse.json({ error: '导入失败：' + (error instanceof Error ? error.message : '未知错误') }, { status: 500 });
  }
}
