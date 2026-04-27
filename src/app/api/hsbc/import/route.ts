import { NextRequest, NextResponse } from 'next/server';
import { setLoansByBatchDate, getLoansByBatchDate } from '@/lib/hsbc-data';

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

// 解析金额
function parseAmount(amountStr: string | number): number {
  if (typeof amountStr === 'number') return amountStr;
  if (!amountStr || typeof amountStr !== 'string') return 0;
  const cleaned = amountStr.replace(/[,，\s]/g, '').replace(/["\u200b]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
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

    // 解析贷款数据
    const parsedLoans = loans.map((row: Record<string, string>, index: number) => {
      // 找到还款计划
      const repaymentSchedule: { date: string; amount: number }[] = [];
      const keys = Object.keys(row);

      // 收集所有还款日期和金额的列索引
      let repaymentDateIndices: number[] = [];
      let repaymentAmountIndices: number[] = [];

      keys.forEach((key, idx) => {
        const nk = normalizeKey(key);
        if (nk === 'repayment date' || nk.includes('repayment') && nk.includes('date')) {
          repaymentDateIndices.push(idx);
        }
        if (nk === 'repay amount' || nk.includes('repay') && nk.includes('amount')) {
          repaymentAmountIndices.push(idx);
        }
      });

      // 配对还款日期和金额
      const pairCount = Math.min(repaymentDateIndices.length, repaymentAmountIndices.length);
      for (let i = 0; i < pairCount; i++) {
        const dateVal = row[keys[repaymentDateIndices[i]]];
        const amountVal = row[keys[repaymentAmountIndices[i]]];
        if (dateVal && amountVal && parseAmount(amountVal) > 0) {
          repaymentSchedule.push({
            date: parseDate(dateVal),
            amount: parseAmount(amountVal),
          });
        }
      }

      // 提取各字段值（兼容不同列名）
      const getValue = (...possibleKeys: string[]): string => {
        for (const key of possibleKeys) {
          const nk = normalizeKey(key);
          for (const k of keys) {
            if (normalizeKey(k) === nk) return row[k] || '';
          }
        }
        return '';
      };

      const loanCurrency = (getValue('Loan Currency', 'loanCurrency') || 'CNY').toUpperCase() as 'CNY' | 'USD';

      return {
        id: `hsbc-${importDate}-${index}`,
        loanReference: getValue('Loan Reference', 'loanReference'),
        merchantId: getValue('Merchant ID', 'merchantId'),
        borrowerName: getValue('Borrower Name', 'borrowerName'),
        loanStartDate: parseDate(getValue('Loan Start Date', 'loanStartDate')),
        loanCurrency,
        loanAmount: parseAmount(getValue('Loan Amount', 'loanAmount')),
        loanInterest: getValue('Loan Interest', 'loanInterest'),
        totalInterestRate: parseAmount(getValue('Total Interest Rate', 'totalInterestRate')),
        loanTenor: getValue('Loan Tenor', 'loanTenor'),
        maturityDate: parseDate(getValue('Maturity Date', 'maturityDate')),
        repaymentSchedule,
        balance: parseAmount(getValue('Balance', 'balance')),
        pastdueAmount: parseAmount(getValue('Pastdue amount', 'pastdueAmount', 'Pastdue Amount')),
        batchDate: importDate,
        freezeAccountRequested: getValue('Freeze Account Requested? (DDMMYY)'),
        forceDebitRequested: getValue('Force Debit Requested? (DDMMYY)'),
        rmApproval: getValue('Approval from RM TH (No action taken on Freeze Account OR Force Debit)? (DDMMYY)'),
        dowsureFreezeConfirm: getValue('Confirmation from Dowsure with action taken on Freeze Account? (DDMMYY)'),
        dowsureForceDebitConfirm: getValue('Confirmation from Dowsure with action taken on Force Debit? (DDMMYY)'),
        remarks: getValue('Remarks (Any subsequent action likes freeze PSP account on day 8 or follow up with Dowsure if no response on action date)'),
      };
    });

    // 根据导入模式处理
    if (mode === 'append') {
      const existingLoans = getLoansByBatchDate(importDate);
      setLoansByBatchDate(importDate, [...existingLoans, ...parsedLoans]);
    } else {
      setLoansByBatchDate(importDate, parsedLoans);
    }

    const currentLoans = getLoansByBatchDate(importDate);

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
