import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/auth';

// Mock汇丰数据
const mockHsbcLoans = [
  { id: '1', loanReference: 'HSBC001', merchantId: 'M001', borrowerName: '商户A', loanStartDate: '2023-01-15', loanCurrency: 'CNY', loanAmount: 5000000, totalInterestRate: 4.35, loanTenor: 12, maturityDate: '2024-01-15', balance: 4200000, pastdueAmount: 0, batchDate: '2024-01-15', createdAt: '2024-01-15T00:00:00Z' },
  { id: '2', loanReference: 'HSBC002', merchantId: 'M002', borrowerName: '商户B', loanStartDate: '2023-02-20', loanCurrency: 'USD', loanAmount: 1000000, totalInterestRate: 5.5, loanTenor: 18, maturityDate: '2024-08-20', balance: 850000, pastdueAmount: 150000, batchDate: '2024-01-15', createdAt: '2024-01-15T00:00:00Z' },
  { id: '3', loanReference: 'HSBC003', merchantId: 'M003', borrowerName: '商户C', loanStartDate: '2023-03-10', loanCurrency: 'CNY', loanAmount: 3000000, totalInterestRate: 4.2, loanTenor: 12, maturityDate: '2024-03-10', balance: 2500000, pastdueAmount: 250000, batchDate: '2024-01-20', createdAt: '2024-01-20T00:00:00Z' },
  { id: '4', loanReference: 'HSBC004', merchantId: 'M004', borrowerName: '商户D', loanStartDate: '2023-04-05', loanCurrency: 'CNY', loanAmount: 2000000, totalInterestRate: 4.0, loanTenor: 6, maturityDate: '2024-04-05', balance: 1800000, pastdueAmount: 0, batchDate: '2024-01-20', createdAt: '2024-01-20T00:00:00Z' },
  { id: '5', loanReference: 'HSBC005', merchantId: 'M005', borrowerName: '商户E', loanStartDate: '2023-05-15', loanCurrency: 'USD', loanAmount: 1500000, totalInterestRate: 5.8, loanTenor: 24, maturityDate: '2025-05-15', balance: 1400000, pastdueAmount: 100000, batchDate: '2024-01-25', createdAt: '2024-01-25T00:00:00Z' },
];

const mockHsbcStats = {
  totalLoans: 5,
  totalLoanAmount: 12500000,
  totalBalance: 10750000,
  totalOverdueAmount: 500000,
  overdueRate: 4.65,
  activeMerchants: 5,
  overdueMerchants: 3,
  overdueMerchantRate: 60,
  warningAmount: 800000,
  dueIn7Days: 2500000,
  dueIn15Days: 3000000,
  dueIn30Days: 5000000,
  currencyBreakdown: {
    CNY: { loans: 3, amount: 10000000, balance: 8500000, overdue: 250000, overdueMerchants: 1 },
    USD: { loans: 2, amount: 2500000, balance: 2250000, overdue: 250000, overdueMerchants: 2 },
  },
  riskBreakdown: {
    low: { days: '0-30', amount: 200000, merchants: 1, loans: 1 },
    medium: { days: '31-60', amount: 250000, merchants: 2, loans: 2 },
    high: { days: '61-90', amount: 50000, merchants: 1, loans: 1 },
    severe: { days: '91-180', amount: 0, merchants: 0, loans: 0 },
    extreme: { days: '181+', amount: 0, merchants: 0, loans: 0 },
  },
  batchDates: ['2024-01-15', '2024-01-20', '2024-01-25'],
};

// 获取汇丰贷款列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const batchDate = searchParams.get('batchDate');
    const merchantId = searchParams.get('merchantId');

    let filteredLoans = [...mockHsbcLoans];

    if (batchDate) {
      filteredLoans = filteredLoans.filter(l => l.batchDate === batchDate);
    }
    if (merchantId) {
      filteredLoans = filteredLoans.filter(l => l.merchantId === merchantId);
    }

    const total = filteredLoans.length;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;
    const paginatedLoans = filteredLoans.slice(offset, offset + pageSize);

    return NextResponse.json(successResponse({
      data: paginatedLoans,
      total,
      page,
      pageSize,
      totalPages,
    }));
  } catch (error) {
    console.error('Get HSBC loans error:', error);
    return NextResponse.json(errorResponse('获取汇丰贷款列表失败'), { status: 500 });
  }
}
