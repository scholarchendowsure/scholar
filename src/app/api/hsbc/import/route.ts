import { NextResponse } from 'next/server';
import { getMockHSBCLoans, setMockHSBCLoans, HSBCLoan, RepaymentRecord } from '@/lib/hsbc-data';

// 解析中文日期格式 (如"2024年1月29日" -> "2024-01-29")
const parseChineseDate = (dateStr: string): string => {
  if (!dateStr || dateStr.trim() === '') return '';
  
  // 清理日期字符串，去除引号等特殊字符
  const cleaned = dateStr.replace(/[""]/g, '').trim();
  
  // 匹配中文日期格式：年、月、日
  const match = cleaned.match(/(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日/);
  if (match) {
    const year = match[1].padStart(4, '0');
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // 尝试匹配 DD-MM-YY 格式 (如 08-Apr-24)
  const ddmmyyMatch = cleaned.match(/(\d+)-([A-Za-z]+)-(\d+)/);
  if (ddmmyyMatch) {
    const day = ddmmyyMatch[1].padStart(2, '0');
    const monthMap: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    const month = monthMap[ddmmyyMatch[2]] || '01';
    const year = '20' + ddmmyyMatch[3].slice(-2);
    return `${year}-${month}-${day}`;
  }
  
  return cleaned;
};

// 解析金额格式 (去除逗号)
const parseAmount = (amountStr: string): number => {
  if (!amountStr || amountStr.trim() === '') return 0;
  const cleaned = amountStr.replace(/[,]/g, '').trim();
  return parseFloat(cleaned) || 0;
};

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
      const validLoans: HSBCLoan[] = loans.map((row: Record<string, any>, index: number) => {
        // 解析还款记录（处理多个Repayment Date和Repay amount列）
        const repaymentSchedule: RepaymentRecord[] = [];
        
        // 查找所有还款日期和金额列
        for (let i = 1; i <= 20; i++) {
          const dateKey = i === 1 ? 'Repayment Date' : `Repayment Date ${i}`;
          const amountKey = i === 1 ? 'Repay amount' : `Repay amount ${i}`;
          
          // 也尝试处理有换行的列名
          const dateKeys = [dateKey, `Repayment\nDate`, `Repayment\nDate ${i}`];
          const amountKeys = [amountKey, `Repay\namount`, `Repay\namount ${i}`];
          
          let dateValue = '';
          let amountValue = '';
          
          for (const key of dateKeys) {
            if (row[key]) {
              dateValue = String(row[key]);
              break;
            }
          }
          
          for (const key of amountKeys) {
            if (row[key]) {
              amountValue = String(row[key]);
              break;
            }
          }
          
          if (dateValue && dateValue.trim() !== '') {
            const parsedDate = parseChineseDate(dateValue);
            const parsedAmount = parseAmount(amountValue);
            
            if (parsedDate && parsedAmount > 0) {
              repaymentSchedule.push({
                date: parsedDate,
                amount: parsedAmount,
                repaid: true
              });
            }
          }
        }

        const loanAmount = parseAmount(
          String(row.loanAmount || row['Loan Amount'] || row[' Loan Amount '] || '0')
        );
        const balance = parseAmount(
          String(row.balance || row.Balance || '0')
        );
        const pastdueAmount = parseAmount(
          String(row.pastdueAmount || row['Pastdue amount'] || '0')
        );
        
        return {
          id: String(row.loanReference || row['Loan Reference'] || `LOAN_${index}`),
          loanReference: String(row.loanReference || row['Loan Reference'] || `LOAN_${index}`),
          merchantId: String(row.merchantId || row['Merchant ID'] || ''),
          borrowerName: String(row.borrowerName || row['Borrower Name'] || '').trim(),
          loanStartDate: parseChineseDate(
            String(row.loanStartDate || row['Loan Start Date'] || row[' Loan Start Date '] || '')
          ),
          loanCurrency: (String(row.loanCurrency || row['Loan Currency'] || 'USD').trim() as 'CNY' | 'USD') || 'USD',
          loanAmount: loanAmount,
          loanInterest: String(row.loanInterest || row['Loan Interest'] || ''),
          totalInterestRate: parseFloat(String(row.totalInterestRate || row['Total Interest Rate'] || '0')) || 0,
          loanTenor: String(row.loanTenor || row['Loan Tenor'] || row[' Loan \nTenor '] || ''),
          maturityDate: parseChineseDate(
            String(row.maturityDate || row['Maturity Date'] || '')
          ),
          repaymentSchedule: repaymentSchedule,
          balance: balance,
          pastdueAmount: pastdueAmount,
          freezeAccountRequested: 
            row.freezeAccountRequested || row['Freeze Account Requested? (DDMMYY)'] || undefined,
          forceDebitRequested: 
            row.forceDebitRequested || row['Force Debit Requested? (DDMMYY)'] || undefined,
          approvalFromRM: 
            row.approvalFromRM || row['Approval from RM TH (No action taken on Freeze Account OR Force Debit)? (DDMMYY)'] || undefined,
          confirmationFreezeAccount: 
            row.confirmationFreezeAccount || row['Confirmation from Dowsure with action taken on Freeze Account? (DDMMYY)'] || undefined,
          confirmationForceDebit: 
            row.confirmationForceDebit || row['Confirmation from Dowsure with action taken on Force Debit? (DDMMYY)'] || undefined,
          remarks: String(row.remarks || row['Remarks'] || row['Remarks (Any subsequent action likes freeze PSP account on day 8 or follow up with Dowsure if no response on action date)'] || ''),
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
        .filter((row: Record<string, any>) => {
          const ref = String(row.loanReference || row['Loan Reference'] || '');
          return !existingRefs.has(ref);
        })
        .map((row: Record<string, any>, index: number) => {
          // 解析还款记录
          const repaymentSchedule: RepaymentRecord[] = [];
          
          for (let i = 1; i <= 20; i++) {
            const dateKey = i === 1 ? 'Repayment Date' : `Repayment Date ${i}`;
            const amountKey = i === 1 ? 'Repay amount' : `Repay amount ${i}`;
            
            const dateKeys = [dateKey, `Repayment\nDate`, `Repayment\nDate ${i}`];
            const amountKeys = [amountKey, `Repay\namount`, `Repay\namount ${i}`];
            
            let dateValue = '';
            let amountValue = '';
            
            for (const key of dateKeys) {
              if (row[key]) {
                dateValue = String(row[key]);
                break;
              }
            }
            
            for (const key of amountKeys) {
              if (row[key]) {
                amountValue = String(row[key]);
                break;
              }
            }
            
            if (dateValue && dateValue.trim() !== '') {
              const parsedDate = parseChineseDate(dateValue);
              const parsedAmount = parseAmount(amountValue);
              
              if (parsedDate && parsedAmount > 0) {
                repaymentSchedule.push({
                  date: parsedDate,
                  amount: parsedAmount,
                  repaid: true
                });
              }
            }
          }

          const loanAmount = parseAmount(
            String(row.loanAmount || row['Loan Amount'] || row[' Loan Amount '] || '0')
          );
          const balance = parseAmount(
            String(row.balance || row.Balance || '0')
          );
          const pastdueAmount = parseAmount(
            String(row.pastdueAmount || row['Pastdue amount'] || '0')
          );
          
          return {
            id: String(row.loanReference || row['Loan Reference'] || `LOAN_${index}`),
            loanReference: String(row.loanReference || row['Loan Reference'] || `LOAN_${index}`),
            merchantId: String(row.merchantId || row['Merchant ID'] || ''),
            borrowerName: String(row.borrowerName || row['Borrower Name'] || '').trim(),
            loanStartDate: parseChineseDate(
              String(row.loanStartDate || row['Loan Start Date'] || row[' Loan Start Date '] || '')
            ),
            loanCurrency: (String(row.loanCurrency || row['Loan Currency'] || 'USD').trim() as 'CNY' | 'USD') || 'USD',
            loanAmount: loanAmount,
            loanInterest: String(row.loanInterest || row['Loan Interest'] || ''),
            totalInterestRate: parseFloat(String(row.totalInterestRate || row['Total Interest Rate'] || '0')) || 0,
            loanTenor: String(row.loanTenor || row['Loan Tenor'] || row[' Loan \nTenor '] || ''),
            maturityDate: parseChineseDate(
              String(row.maturityDate || row['Maturity Date'] || '')
            ),
            repaymentSchedule: repaymentSchedule,
            balance: balance,
            pastdueAmount: pastdueAmount,
            freezeAccountRequested: 
              row.freezeAccountRequested || row['Freeze Account Requested? (DDMMYY)'] || undefined,
            forceDebitRequested: 
              row.forceDebitRequested || row['Force Debit Requested? (DDMMYY)'] || undefined,
            approvalFromRM: 
              row.approvalFromRM || row['Approval from RM TH (No action taken on Freeze Account OR Force Debit)? (DDMMYY)'] || undefined,
            confirmationFreezeAccount: 
              row.confirmationFreezeAccount || row['Confirmation from Dowsure with action taken on Freeze Account? (DDMMYY)'] || undefined,
            confirmationForceDebit: 
              row.confirmationForceDebit || row['Confirmation from Dowsure with action taken on Force Debit? (DDMMYY)'] || undefined,
            remarks: String(row.remarks || row['Remarks'] || row['Remarks (Any subsequent action likes freeze PSP account on day 8 or follow up with Dowsure if no response on action date)'] || ''),
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
      'Loan Reference': 'TPJHK1079195',
      'Merchant ID': '68537',
      'Borrower Name': 'RONDAFUL (HK) INTERNATIONAL LIMITED',
      'Loan Start Date': '2024年1月29日',
      'Loan Currency': 'CNY',
      'Loan Amount': '1.00',
      'Loan Interest': 'HIBOR 3.32848% + 2.75%',
      'Total Interest Rate': '6.07848',
      'Loan Tenor': '10D',
      'Maturity Date': '2024年2月8日',
      'Repayment Date': '2024年1月30日',
      'Repay amount': '1.00',
      'Balance': '0',
      'Pastdue amount': '0',
    },
  ];

  return NextResponse.json({ template, fields: Object.keys(template[0]) });
}
