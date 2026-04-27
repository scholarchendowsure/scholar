import { NextResponse } from 'next/server';
import { getMockHSBCLoans, setMockHSBCLoans, HSBCLoan } from '@/lib/hsbc-data';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { loans, action } = body;

    if (action === 'import') {
      // 导入新数据
      if (!loans || !Array.isArray(loans)) {
        return NextResponse.json({ error: '无效的数据格式' }, { status: 400 });
      }

      // 验证并转换数据
      const validLoans: HSBCLoan[] = loans.map((row: Record<string, string>, index: number) => {
        const loanAmount = parseFloat(String(row.loanAmount || row[' Loan Amount '] || '0').replace(/,/g, ''));
        const balance = parseFloat(String(row.balance || row.Balance || '0').replace(/,/g, ''));
        const pastdueAmount = parseFloat(String(row.pastdueAmount || row['Pastdue amount'] || '0').replace(/,/g, ''));
        
        return {
          id: String(row.loanReference || row['Loan Reference'] || `LOAN_${index}`),
          loanReference: String(row.loanReference || row['Loan Reference'] || `LOAN_${index}`),
          merchantId: String(row.merchantId || row['Merchant ID'] || ''),
          borrowerName: String(row.borrowerName || row['Borrower Name'] || '').trim(),
          loanStartDate: String(row.loanStartDate || row[' Loan Start Date '] || ''),
          loanCurrency: (String(row.loanCurrency || row['Loan Currency'] || 'USD').trim() as 'CNY' | 'USD') || 'USD',
          loanAmount: isNaN(loanAmount) ? 0 : loanAmount,
          loanInterest: String(row.loanInterest || row['Loan Interest'] || ''),
          totalInterestRate: parseFloat(String(row.totalInterestRate || row['Total Interest Rate'] || '0')) || 0,
          loanTenor: String(row.loanTenor || row[' Loan \nTenor '] || ''),
          maturityDate: String(row.maturityDate || row['Maturity Date'] || ''),
          balance: isNaN(balance) ? 0 : balance,
          pastdueAmount: isNaN(pastdueAmount) ? 0 : pastdueAmount,
          freezeAccountRequested: row.freezeAccountRequested || row['Freeze Account Requested? (DDMMYY)'] || undefined,
          forceDebitRequested: row.forceDebitRequested || row['Force Debit Requested? (DDMMYY)'] || undefined,
          remarks: row.remarks || '',
          batchDate: new Date().toISOString().split('T')[0],
        };
      }).filter(loan => loan.merchantId && loan.loanReference);

      // 更新缓存
      setMockHSBCLoans(validLoans);

      return NextResponse.json({
        success: true,
        message: `成功导入 ${validLoans.length} 条贷款记录`,
        count: validLoans.length,
      });
    }

    if (action === 'merge') {
      // 合并数据
      if (!loans || !Array.isArray(loans)) {
        return NextResponse.json({ error: '无效的数据格式' }, { status: 400 });
      }

      const existingLoans = getMockHSBCLoans();
      const existingRefs = new Set(existingLoans.map(l => l.loanReference));

      const newLoans = loans
        .filter((row: Record<string, string>) => {
          const ref = String(row.loanReference || row['Loan Reference'] || '');
          return !existingRefs.has(ref);
        })
        .map((row: Record<string, string>, index: number) => {
          const loanAmount = parseFloat(String(row.loanAmount || row[' Loan Amount '] || '0').replace(/,/g, ''));
          const balance = parseFloat(String(row.balance || row.Balance || '0').replace(/,/g, ''));
          const pastdueAmount = parseFloat(String(row.pastdueAmount || row['Pastdue amount'] || '0').replace(/,/g, ''));
          
          return {
            id: String(row.loanReference || row['Loan Reference'] || `LOAN_${index}`),
            loanReference: String(row.loanReference || row['Loan Reference'] || `LOAN_${index}`),
            merchantId: String(row.merchantId || row['Merchant ID'] || ''),
            borrowerName: String(row.borrowerName || row['Borrower Name'] || '').trim(),
            loanStartDate: String(row.loanStartDate || row[' Loan Start Date '] || ''),
            loanCurrency: (String(row.loanCurrency || row['Loan Currency'] || 'USD').trim() as 'CNY' | 'USD') || 'USD',
            loanAmount: isNaN(loanAmount) ? 0 : loanAmount,
            loanInterest: String(row.loanInterest || row['Loan Interest'] || ''),
            totalInterestRate: parseFloat(String(row.totalInterestRate || row['Total Interest Rate'] || '0')) || 0,
            loanTenor: String(row.loanTenor || row[' Loan \nTenor '] || ''),
            maturityDate: String(row.maturityDate || row['Maturity Date'] || ''),
            balance: isNaN(balance) ? 0 : balance,
            pastdueAmount: isNaN(pastdueAmount) ? 0 : pastdueAmount,
            freezeAccountRequested: row.freezeAccountRequested || row['Freeze Account Requested? (DDMMYY)'] || undefined,
            forceDebitRequested: row.forceDebitRequested || row['Force Debit Requested? (DDMMYY)'] || undefined,
            remarks: row.remarks || '',
            batchDate: new Date().toISOString().split('T')[0],
          };
        });

      // 合并
      setMockHSBCLoans([...existingLoans, ...newLoans]);

      return NextResponse.json({
        success: true,
        message: `合并成功，新增 ${newLoans.length} 条记录`,
        count: newLoans.length,
        total: existingLoans.length + newLoans.length,
      });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    console.error('Error importing HSBC data:', error);
    return NextResponse.json({ error: '导入失败' }, { status: 500 });
  }
}

// 获取导入模板
export async function GET() {
  const template = [
    {
      'Loan Reference': 'LAEAM1017710',
      'Merchant ID': '63257',
      'Borrower Name': 'ZHONGBO INTL TRADE CO LIMITED',
      'Loan Start Date': '08-Apr-2024',
      'Loan Currency': 'USD',
      'Loan Amount': '250000.00',
      'Loan Interest': '90D SOFR TERM + 3%',
      'Total Interest Rate': '8.30184',
      'Loan Tenor': '91D',
      'Maturity Date': '08-Jul-2024',
      'Balance': '250000.00',
      'Pastdue amount': '0',
    },
  ];

  return NextResponse.json({ template, fields: Object.keys(template[0]) });
}
