'use client';

import { useState, useEffect, useCallback, useRef, useMemo, ChangeEvent } from 'react';
import { formatCurrency } from '@/lib/constants';
import { calcPastdueAmount, calcBalance, calcOverdueDays, calcDaysToMaturity, calcTotalRepaid, HSBCLoan } from '@/lib/hsbc-loan';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Upload,
  ChevronDown,
  ChevronUp,
  Building2,
  Wallet,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  CreditCard,
  Calendar,
  Percent,
  Search,
  Eye,
  RefreshCw,
  X,
  CheckCircle,
  Clock,
  FileText,
  BarChart3,
  PieChart,
  Columns,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

// ============ 类型定义 ============
interface HSBCStats {
  totalLoans: number;
  activeMerchants: number;
  totalLoanAmount: number;
  totalBalance: number; // 折CNY
  totalBalanceUSD: number; // 折USD
  totalBalanceLoanCount: number;
  totalBalanceMerchantCount: number;
  totalPastdueAmount: number; // 折CNY
  totalPastdueAmountUSD: number; // 折USD
  overdueRate: number;
  overdueMerchantRate: number;
  warningAmount: number; // 折CNY
  warningAmountUSD: number; // 折USD
  approachingMaturityAmount: number;
  // 逾期天数分级数据
  overdueByDays: {
    over0Days: { amount: number; rate: number; amountUSD: number; loanCount: number; merchantCount: number };
    over30Days: { amount: number; rate: number; amountUSD: number; loanCount: number; merchantCount: number };
    over90Days: { amount: number; rate: number; amountUSD: number; loanCount: number; merchantCount: number };
  };
  // 预警金额相关
  warningInfo: {
    amount: number;
    amountUSD: number;
    loanCount: number;
    merchantCount: number;
  };
  // 还款期限分布
  repaymentDue: Record<number, { cnyAmount: number; usdAmount: number; count: number; merchantCount: number }>;
  currencyBreakdown: Array<{
    currency: string;
    loanCount: number;
    totalAmount: number;
    overdueAmount: number;
    balance: number;
    overdueMerchantCount: number;
    overdueLoanCount: number;
  }>;
  riskAssessment: Array<{
    riskLevel: string;
    overdueAmount: number;
    merchantCount: number;
    loanCount: number;
  }>;
  approachingMaturity: Array<{
    daysRange: string;
    days: number;
    cnyAmount: number;
    cnyMerchants: number;
    usdAmount: number;
    usdMerchants: number;
  }>;
}

// ============ 模拟数据生成 ============
const generateMockLoans = (): HSBCLoan[] => {
  const merchants = [
    { id: '68537', name: 'RONDAFUL (HK) INTERNATIONAL LIMITED' },
    { id: '63257', name: 'ZHONGBO INTL TRADE CO LIMITED' },
    { id: '70643', name: 'HK GRATEFULNESS GROUP CO LIMITED' },
    { id: '69717', name: 'MAXUP HOLDINGS LIMITED' },
    { id: '71880', name: 'HONGKONG ZHENGDASHENG PACKING CO LIMITED' },
    { id: '71490', name: 'XIAOYOUZI TECH CO LTD' },
    { id: '71753', name: 'KOWCOMMS TECH (HK) CO LIMITED' },
    { id: '71830', name: 'SECUTEK TECH LTD' },
    { id: '72311', name: 'LH TECHNOLOGY (HK) CO LIMITED' },
    { id: '72640', name: 'HK YUANHAO HOLDING GROUP LTD' },
    { id: '71543', name: 'CHUANGXIN INTL TRADE CO LIMITED' },
    { id: '72248', name: 'HK XINJINHUI TECHNOLOGY CO LIMITED' },
    { id: '70536', name: 'HK INAMORI TRADING LIMITED' },
    { id: '71228', name: 'HK HONGYI HUI INTL TECHNOLOGY LTD' },
    { id: '62312', name: 'SMART DO INTERNATIONAL LIMITED' },
    { id: '61382', name: 'GAMEGEEK LIMITED' },
    { id: '68665', name: 'FUTURE LIGHT HOLDINGS LIMITED' },
    { id: '62596', name: 'HYTOP INOVATION (HK) TECHNOLOGY LTD' },
    { id: '72851', name: 'HONGKONG FEILING TRADING LIMITED' },
    { id: '65366', name: 'KARY (HONG KONG) SUPPLY CHAIN MGT C' },
    { id: '67348', name: 'BEST CHOICE ARTS PRODUCTS CO LTD' },
    { id: '68718', name: 'ZHILE HOLDINGS GROUP (HK) LIMITED' },
    { id: '69300', name: 'HK HENGYU INTERNATIONAL LIMITED' },
    { id: '69248', name: 'HK LA LA LA TECH CO LTD' },
  ];

  const currencies = ['CNY', 'USD'];
  const loans: HSBCLoan[] = [];

  merchants.forEach((merchant, idx) => {
    const loanCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < loanCount; i++) {
      const currency = currencies[Math.floor(Math.random() * currencies.length)];
      const amount = currency === 'USD'
        ? Math.floor(Math.random() * 500000) + 50000
        : Math.floor(Math.random() * 2000000) + 100000;
      
      // 随机生成已还款比例（0-1之间）
      const repaidRatio = Math.random();
      // 计算已还款金额
      const totalRepaid = Math.floor(amount * repaidRatio);
      // 计算余额
      const balance = amount - totalRepaid;
      
      // 随机决定是否逾期（约30%概率逾期）
      const isOverdue = Math.random() > 0.7;
      
      // 贷款开始日期
      const startDate = new Date(2024, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1);
      // 到期日
      const maturityDate = new Date(startDate);
      maturityDate.setMonth(maturityDate.getMonth() + Math.floor(Math.random() * 3) + 1);
      
      // 如果需要逾期，将到期日设为过去的日期
      if (isOverdue && balance > 0) {
        maturityDate.setFullYear(2024); // 设为2024年（已过期）
      }
      
      // 生成还款计划
      const repaymentSchedule: Array<{date: string; amount: number; repaid: boolean}> = [];
      if (repaidRatio > 0) {
        repaymentSchedule.push({
          date: startDate.toISOString().split('T')[0],
          amount: totalRepaid,
          repaid: true,
        });
      }
      if (balance > 0) {
        repaymentSchedule.push({
          date: maturityDate.toISOString().split('T')[0],
          amount: balance,
          repaid: false,
        });
      }
      
      // 逾期金额计算：只有到期日已过且有余额才算逾期
      let pastdue = 0;
      let overdueDaysCalc = -1;
      const today = new Date();
      if (today > maturityDate && balance > 0) {
        pastdue = balance;
        overdueDaysCalc = Math.floor((today.getTime() - maturityDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      loans.push({
        id: `LAE${idx.toString().padStart(4, '0')}${i}`,
        loanReference: `LAEAM10${idx.toString().padStart(4, '0')}${i}`,
        merchantId: merchant.id,
        borrowerName: merchant.name,
        loanStartDate: startDate.toISOString().split('T')[0],
        loanCurrency: currency as 'CNY' | 'USD',
        loanAmount: amount,
        loanInterest: currency === 'USD' ? '90D SOFR TERM + 3%' : '90D CNY HBR + 2.25%',
        totalInterestRate: currency === 'USD' ? 8.2 + Math.random() * 0.3 : 5.5 + Math.random() * 0.5,
        loanTenor: `${Math.floor(Math.random() * 30) + 90}D`,
        maturityDate: maturityDate.toISOString().split('T')[0],
        balance,
        pastdueAmount: pastdue,
        overdueDays: overdueDaysCalc,
        status: pastdue > 0 ? 'overdue' : (balance === 0 ? 'settled' : 'active'),
        remarks: '',
        batchDate: '2024-07',
        repaymentSchedule,
      });
    }
  });

  return loans;
};

// 汇率常量
const USD_TO_CNY_RATE = 7;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generateMockStats = (loans: HSBCLoan[]): any => {
  const cnyLoans = loans.filter(l => l.loanCurrency === 'CNY');
  const usdLoans = loans.filter(l => l.loanCurrency === 'USD');
  
  const cnyTotalAmount = cnyLoans.reduce((sum, l) => sum + l.loanAmount, 0);
  const cnyBalance = cnyLoans.reduce((sum, l) => sum + calcBalance(l), 0);
  const usdTotalAmount = usdLoans.reduce((sum, l) => sum + l.loanAmount, 0);
  const usdBalance = usdLoans.reduce((sum, l) => sum + calcBalance(l), 0);
  
  // 转换USD到CNY计算总在贷
  const totalBalanceCNY = cnyBalance + usdBalance * USD_TO_CNY_RATE;
  
  // 计算在贷笔数（余额>0）和在贷商户数
  const activeLoans = loans.filter(l => calcBalance(l) > 0);
  const activeLoanCount = activeLoans.length;
  const activeMerchantCount = [...new Set(activeLoans.map(l => l.merchantId))].length;
  
  // 逾期天数分级计算
  const today = new Date();
  const overdueByDays = {
    over0Days: { amount: 0, rate: 0, amountUSD: 0, loanCount: 0, merchantCount: 0 },
    over30Days: { amount: 0, rate: 0, amountUSD: 0, loanCount: 0, merchantCount: 0 },
    over90Days: { amount: 0, rate: 0, amountUSD: 0, loanCount: 0, merchantCount: 0 },
  };
  
  // 用于去重的逾期商户
  const over0Merchants = new Set<string>();
  const over30Merchants = new Set<string>();
  const over90Merchants = new Set<string>();
  
  loans.forEach(loan => {
    const maturityDate = new Date(loan.maturityDate);
    const balance = calcBalance(loan);
    if (today > maturityDate && balance > 0) {
      const overdueDays = Math.floor((today.getTime() - maturityDate.getTime()) / (1000 * 60 * 60 * 24));
      const overdueAmount = calcPastdueAmount(loan);
      const overdueAmountUSD = overdueAmount / USD_TO_CNY_RATE;
      
      // 逾期>0天
      overdueByDays.over0Days.amount += overdueAmount;
      overdueByDays.over0Days.amountUSD += overdueAmountUSD;
      overdueByDays.over0Days.loanCount++;
      over0Merchants.add(loan.merchantId);
      
      // 逾期>30天
      if (overdueDays > 30) {
        overdueByDays.over30Days.amount += overdueAmount;
        overdueByDays.over30Days.amountUSD += overdueAmountUSD;
        overdueByDays.over30Days.loanCount++;
        over30Merchants.add(loan.merchantId);
      }
      
      // 逾期>90天
      if (overdueDays > 90) {
        overdueByDays.over90Days.amount += overdueAmount;
        overdueByDays.over90Days.amountUSD += overdueAmountUSD;
        overdueByDays.over90Days.loanCount++;
        over90Merchants.add(loan.merchantId);
      }
    }
  });
  
  overdueByDays.over0Days.merchantCount = over0Merchants.size;
  overdueByDays.over30Days.merchantCount = over30Merchants.size;
  overdueByDays.over90Days.merchantCount = over90Merchants.size;
  
  // 计算逾期率
  overdueByDays.over0Days.rate = totalBalanceCNY > 0 ? overdueByDays.over0Days.amount / totalBalanceCNY : 0;
  overdueByDays.over30Days.rate = totalBalanceCNY > 0 ? overdueByDays.over30Days.amount / totalBalanceCNY : 0;
  overdueByDays.over90Days.rate = totalBalanceCNY > 0 ? overdueByDays.over90Days.amount / totalBalanceCNY : 0;
  
  // 预警金额：逾期商户未到期的余额总和
  const overdueMerchants = [...new Set(loans.filter(l => calcPastdueAmount(l) > 0).map(l => l.merchantId))];
  let warningAmountCNY = 0;
  let warningLoanCount = 0;
  const warningMerchants = new Set<string>();
  overdueMerchants.forEach(merchantId => {
    const merchantLoans = loans.filter(l => l.merchantId === merchantId);
    merchantLoans.forEach(loan => {
      const maturityDate = new Date(loan.maturityDate);
      const balance = calcBalance(loan);
      // 未到期但逾期的余额
      if (today <= maturityDate && balance > 0) {
        warningAmountCNY += loan.loanCurrency === 'CNY' ? balance : balance * USD_TO_CNY_RATE;
        warningLoanCount++;
        warningMerchants.add(loan.merchantId);
      }
    });
  });

  const totalPastdueCNY = overdueByDays.over0Days.amount;
  
  // 计算还款期限金额
  const repaymentDue: Record<number, { cnyAmount: number; usdAmount: number; count: number }> = {
    3: { cnyAmount: 0, usdAmount: 0, count: 0 },
    7: { cnyAmount: 0, usdAmount: 0, count: 0 },
    15: { cnyAmount: 0, usdAmount: 0, count: 0 },
    30: { cnyAmount: 0, usdAmount: 0, count: 0 },
    45: { cnyAmount: 0, usdAmount: 0, count: 0 },
  };
  
  loans.forEach(loan => {
    // 只计算未逾期的贷款
    if (calcPastdueAmount(loan) === 0) {
      const maturityDate = new Date(loan.maturityDate);
      const daysUntilDue = Math.floor((maturityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const balance = calcBalance(loan);
      const amountCNY = loan.loanCurrency === 'CNY' ? balance : balance * USD_TO_CNY_RATE;
      const amountUSD = loan.loanCurrency === 'USD' ? balance : balance / USD_TO_CNY_RATE;
      
      // 累计各期限的金额
      if (daysUntilDue >= 0 && daysUntilDue <= 3) {
        repaymentDue[3].cnyAmount += amountCNY;
        repaymentDue[3].usdAmount += amountUSD;
        repaymentDue[3].count++;
      }
      if (daysUntilDue >= 0 && daysUntilDue <= 7) {
        repaymentDue[7].cnyAmount += amountCNY;
        repaymentDue[7].usdAmount += amountUSD;
        repaymentDue[7].count++;
      }
      if (daysUntilDue >= 0 && daysUntilDue <= 15) {
        repaymentDue[15].cnyAmount += amountCNY;
        repaymentDue[15].usdAmount += amountUSD;
        repaymentDue[15].count++;
      }
      if (daysUntilDue >= 0 && daysUntilDue <= 30) {
        repaymentDue[30].cnyAmount += amountCNY;
        repaymentDue[30].usdAmount += amountUSD;
        repaymentDue[30].count++;
      }
      if (daysUntilDue >= 0 && daysUntilDue <= 45) {
        repaymentDue[45].cnyAmount += amountCNY;
        repaymentDue[45].usdAmount += amountUSD;
        repaymentDue[45].count++;
      }
    }
  });
  
  const totalLoanAmount = cnyTotalAmount + usdTotalAmount * USD_TO_CNY_RATE;
  
  return {
    totalLoans: loans.length,
    totalLoanAmount,
    totalBalance: totalBalanceCNY,
    totalBalanceLoanCount: activeLoanCount,
    totalBalanceMerchantCount: activeMerchantCount,
    totalPastdueAmount: totalPastdueCNY,
    overdueRate: totalBalanceCNY > 0 ? totalPastdueCNY / totalBalanceCNY : 0,
    overdueByDays,
    warningInfo: {
      amount: warningAmountCNY,
      amountUSD: warningAmountCNY / USD_TO_CNY_RATE,
      merchantCount: warningMerchants.size,
      loanCount: warningLoanCount,
    },
    repaymentDue,
    currencyBreakdown: [
      {
        currency: 'CNY',
        loanCount: cnyLoans.length,
        totalAmount: cnyTotalAmount,
        balance: cnyBalance,
        overdueAmount: cnyLoans.reduce((sum, l) => sum + calcPastdueAmount(l), 0),
        overdueMerchantCount: [...new Set(cnyLoans.filter(l => calcPastdueAmount(l) > 0).map(l => l.merchantId))].length,
        overdueLoanCount: cnyLoans.filter(l => calcPastdueAmount(l) > 0).length,
      },
      {
        currency: 'USD',
        loanCount: usdLoans.length,
        totalAmount: usdTotalAmount * USD_TO_CNY_RATE,
        balance: usdBalance * USD_TO_CNY_RATE,
        overdueAmount: usdLoans.reduce((sum, l) => sum + calcPastdueAmount(l) * USD_TO_CNY_RATE, 0),
        overdueMerchantCount: [...new Set(usdLoans.filter(l => calcPastdueAmount(l) > 0).map(l => l.merchantId))].length,
        overdueLoanCount: usdLoans.filter(l => calcPastdueAmount(l) > 0).length,
      },
    ],
    riskDistribution: [
      { level: '低风险', count: Math.floor(loans.length * 0.4), amount: Math.floor(totalLoanAmount * 0.4) },
      { level: '中风险', count: Math.floor(loans.length * 0.3), amount: Math.floor(totalLoanAmount * 0.3) },
      { level: '高风险', count: Math.floor(loans.length * 0.2), amount: Math.floor(totalLoanAmount * 0.2) },
      { level: '严重', count: Math.floor(loans.length * 0.1), amount: Math.floor(totalLoanAmount * 0.1) },
    ],
    maturityDistribution: [
      { range: '7天内', count: 3, amount: 500000 },
      { range: '15天内', count: 5, amount: 1200000 },
      { range: '30天内', count: 8, amount: 2500000 },
      { range: '45天内', count: 12, amount: 4000000 },
    ],
  };
};

// ============ 贷后还款统计类型 ============
interface RepaymentStats {
  availableMonths: string[];
  currentMonth: string;
  stats: {
    ontimeRepayment: {
      amountUSD: number;
      amountCNY: number;
      amountUSDWan: string;
      amountCNYWan: string;
      count: number;
      loanCount: number;
    };
    overdueRepayment: {
      amountUSD: number;
      amountCNY: number;
      amountUSDWan: string;
      amountCNYWan: string;
      count: number;
      loanCount: number;
    };
    totalRepayment: {
      amountUSD: number;
      amountCNY: number;
      amountUSDWan: string;
      amountCNYWan: string;
    };
  } | null;
  totalLoans: number;
  loansWithRepayment: number;
}

// ============ 主组件 ============
export default function HSBCPanelPage() {
  const [loans, setLoans] = useState<HSBCLoan[]>([]);
  const [stats, setStats] = useState<HSBCStats | null>(null);
  const [repaymentStats, setRepaymentStats] = useState<RepaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dashboard: true,
    loans: false,
    upload: false,
  });

  // 筛选状态
  const [searchTerm, setSearchTerm] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedLoan, setSelectedLoan] = useState<HSBCLoan | null>(null);

  // 导入状态
  const [uploadMode, setUploadMode] = useState<'replace' | 'merge'>('replace');
  const [importPreview, setImportPreview] = useState<HSBCLoan[]>([]);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importBatchDate, setImportBatchDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedBatchDate, setSelectedBatchDate] = useState<string>(() => {
    // 从 localStorage 获取保存的日期，默认使用最新日期
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hsbc_selected_batch_date');
      return saved || '';
    }
    return '';
  });
  const [availableBatchDates, setAvailableBatchDates] = useState<string[]>([]);
  const [filePassword, setFilePassword] = useState<string>('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // 仪表盘币种选择状态
  const [dashboardCurrency, setDashboardCurrency] = useState<'CNY' | 'USD' | 'ALL'>('CNY');

  // 列选择相关状态
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'loanReference', 'merchantId', 'borrowerName', 'loanCurrency', 
    'loanStartDate', 'loanAmount', 'balance', 'pastdueAmount', 'status'
  ]);
  const [selectedRepaymentMonth, setSelectedRepaymentMonth] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<string>('');
  const [activeRepaymentCard, setActiveRepaymentCard] = useState<string | null>(null);
  const [filteredLoanReferences, setFilteredLoanReferences] = useState<string[] | null>(null);
  
  // 切换还款统计月份
  const handleMonthChange = async (month: string) => {
    setSelectedRepaymentMonth(month);
    setActiveRepaymentCard(null);
    setFilteredLoanReferences(null);
    try {
      const params = new URLSearchParams();
      if (selectedBatchDate) params.set('batchDate', selectedBatchDate);
      if (month) params.set('yearMonth', month);
      
      const res = await fetch(`/api/hsbc/repayment-stats?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRepaymentStats(data.data || null);
      }
    } catch (err) {
      console.error('加载还款统计失败:', err);
    }
  };

  // 处理还款统计卡片点击
  const handleRepaymentCardClick = (type: 'ontime' | 'overdue' | 'total') => {
    if (activeRepaymentCard === type) {
      // 再次点击同一卡片，取消筛选
      setActiveRepaymentCard(null);
      setFilteredLoanReferences(null);
    } else {
      // 点击新卡片，应用筛选
      setActiveRepaymentCard(type);
      let refs: string[] = [];
      if (type === 'ontime') {
        refs = (repaymentStats?.stats?.ontimeRepayment as any)?.loanReferences || [];
      } else if (type === 'overdue') {
        refs = (repaymentStats?.stats?.overdueRepayment as any)?.loanReferences || [];
      } else if (type === 'total') {
        refs = (repaymentStats?.stats?.totalRepayment as any)?.loanReferences || [];
      }
      setFilteredLoanReferences(refs);
    }
    // 清除其他卡片筛选
    setActiveCardFilter(null);
    // 滚动到案件列表
    setTimeout(() => {
      casesListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    setCurrentPage(1); // 重置分页
  };
  
  const columnDefinitions = [
    { key: 'loanReference', label: '贷款编号' },
    { key: 'merchantId', label: '商户ID' },
    { key: 'borrowerName', label: '借款人名称' },
    { key: 'loanCurrency', label: '币种' },
    { key: 'loanStartDate', label: '贷款日期' },
    { key: 'maturityDate', label: '到期日' },
    { key: 'loanAmount', label: '贷款金额' },
    { key: 'balance', label: '余额' },
    { key: 'pastdueAmount', label: '逾期金额' },
    { key: 'overdueDays', label: '逾期天数' },
    { key: 'totalRepaid', label: '已还款总额' },
    { key: 'status', label: '状态' },
  ];

  const toggleColumn = (key: string) => {
    if (visibleColumns.includes(key)) {
      setVisibleColumns(visibleColumns.filter(k => k !== key));
    } else {
      setVisibleColumns([...visibleColumns, key]);
    }
  };

  // 去重商户ID相关状态
  const [deduplicateMerchant, setDeduplicateMerchant] = useState(false);
  const [activeCardFilter, setActiveCardFilter] = useState<string | null>(null);
  const casesListRef = useRef<HTMLDivElement>(null);

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 加载批次日期列表
      const datesRes = await fetch('/api/hsbc/batch-dates');
      let dates: string[] = [];
      if (datesRes.ok) {
        const datesData = await datesRes.json();
        dates = datesData.data || [];
        setAvailableBatchDates(dates);
      }

      // 如果有批次日期，加载最新日期的数据；否则加载所有数据
      if (dates.length > 0) {
        const latestDate = dates[0]; // 最新日期排在第一个
        setSelectedBatchDate(latestDate);
        const loansRes = await fetch(`/api/hsbc/loans?batchDate=${encodeURIComponent(latestDate)}&pageSize=99999`);
        if (loansRes.ok) {
          const loansData = await loansRes.json();
          setLoans(loansData.data || []);
        }
        const statsRes = await fetch(`/api/hsbc/stats?batchDate=${encodeURIComponent(latestDate)}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.data || null);
        }
        // 加载还款统计数据
        const repaymentStatsRes = await fetch(`/api/hsbc/repayment-stats?batchDate=${encodeURIComponent(latestDate)}`);
        if (repaymentStatsRes.ok) {
          const repaymentStatsData = await repaymentStatsRes.json();
          setRepaymentStats(repaymentStatsData.data || null);
        }
      } else {
        // 没有批次日期时，加载所有数据
        const loansRes = await fetch('/api/hsbc/loans?pageSize=99999');
        if (loansRes.ok) {
          const loansData = await loansRes.json();
          setLoans(loansData.data || []);
        }
        setStats(null);
      }
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 加载批次日期列表
  useEffect(() => {
    fetchBatchDates();
  }, []);

  // 根据选择的批次日期重新加载数据（跳过初始加载，因为 loadData 已经处理了）
  const initialLoadRef = useRef(true);
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    if (selectedBatchDate) {
      loadLoansByBatchDate(selectedBatchDate);
    }
  }, [selectedBatchDate]);

  // 根据批次日期加载贷款数据
  const loadLoansByBatchDate = async (batchDate: string) => {
    try {
      const response = await fetch(`/api/hsbc/loans?batchDate=${encodeURIComponent(batchDate)}&pageSize=99999`);
      if (response.ok) {
        const data = await response.json();
        setLoans(data.data || []);
        // 同时获取对应日期的统计数据
        const statsResponse = await fetch(`/api/hsbc/stats?batchDate=${encodeURIComponent(batchDate)}`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData.data || null);
        }
        // 获取还款统计数据
        const repaymentStatsRes = await fetch(`/api/hsbc/repayment-stats?batchDate=${encodeURIComponent(batchDate)}`);
        if (repaymentStatsRes.ok) {
          const repaymentStatsData = await repaymentStatsRes.json();
          setRepaymentStats(repaymentStatsData.data || null);
        }
      }
    } catch (err) {
      console.error('按日期加载数据失败:', err);
    }
  };

  // 切换展开/闭合
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // 获取过滤条件标签
  const getFilterLabel = (filter: string): string => {
    const labels: Record<string, string> = {
      'totalBalance': '在贷总额',
      'overdue0': '逾期>0天',
      'overdue30': '逾期>30天',
      'overdue90': '逾期>90天',
      'warning': '预警金额',
      'due3': '3天内到期',
      'due7': '7天内到期',
      'due15': '15天内到期',
      'due30': '30天内到期',
      'due45': '45天内到期',
    };
    return labels[filter] || filter;
  };

  // 处理卡片点击 - 过滤案件列表
  const handleCardClick = (filterType: string) => {
    if (activeCardFilter === filterType) {
      setActiveCardFilter(null); // 再次点击同一卡片，取消过滤
    } else {
      setActiveCardFilter(filterType);
    }
    // 清除还款统计筛选
    setActiveRepaymentCard(null);
    setFilteredLoanReferences(null);
    // 滚动到案件列表
    setTimeout(() => {
      casesListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    setCurrentPage(1); // 重置分页
  };

  // 处理排序
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // 先筛选（不去重）
  const filteredLoansBeforeDedupe = useMemo(() => {
    return loans.filter((loan: HSBCLoan) => {
      // 支持多商户ID搜索（用空格分隔）
      const searchTerms = searchTerm.trim().split(/\s+/).filter(t => t.length > 0);
      const matchSearch = searchTerms.length === 0 ||
        searchTerms.some(term =>
          loan.loanReference.toLowerCase().includes(term.toLowerCase()) ||
          loan.merchantId.toLowerCase().includes(term.toLowerCase()) ||
          loan.borrowerName.toLowerCase().includes(term.toLowerCase())
        );
      const matchCurrency = currencyFilter === 'all' || loan.loanCurrency === currencyFilter;
      const matchStatus = statusFilter === 'all' ||
        (statusFilter === 'overdue' && calcPastdueAmount(loan) > 0) ||
        (statusFilter === 'normal' && calcPastdueAmount(loan) === 0);
    
      // 卡片点击过滤
      let matchCardFilter = true;
      const today = new Date().toISOString().slice(0, 10);
      const maturityDate = loan.maturityDate;
      const balance = calcBalance(loan);
      const pastdueAmount = calcPastdueAmount(loan);
      
      if (activeCardFilter) {
        switch (activeCardFilter) {
          case 'totalBalance': // 在贷总额 - 余额>0的贷款
            matchCardFilter = balance > 0;
            break;
          case 'overdue0': // 逾期>0天 - 逾期金额>0
            matchCardFilter = pastdueAmount > 0;
            break;
          case 'overdue30': // 逾期>30天 - 逾期天数>=30
            const overdueDays0 = calcOverdueDays(loan);
            matchCardFilter = overdueDays0 >= 30 && pastdueAmount > 0;
            break;
          case 'overdue90': // 逾期>90天 - 逾期天数>=90
            const overdueDays30 = calcOverdueDays(loan);
            matchCardFilter = overdueDays30 >= 90 && pastdueAmount > 0;
            break;
          case 'warning': // 预警金额 - 逾期但未到期
            const daysToMaturity = calcDaysToMaturity(loan);
            matchCardFilter = pastdueAmount > 0 && daysToMaturity > 0;
            break;
          case 'due3': // 3天内到期
            const days3 = calcDaysToMaturity(loan);
            matchCardFilter = days3 >= 0 && days3 <= 3;
            break;
          case 'due7': // 7天内到期
            const days7 = calcDaysToMaturity(loan);
            matchCardFilter = days7 >= 0 && days7 <= 7;
            break;
          case 'due15': // 15天内到期
            const days15 = calcDaysToMaturity(loan);
            matchCardFilter = days15 >= 0 && days15 <= 15;
            break;
          case 'due30': // 30天内到期
            const days30 = calcDaysToMaturity(loan);
            matchCardFilter = days30 >= 0 && days30 <= 30;
            break;
          case 'due45': // 45天内到期
            const days45 = calcDaysToMaturity(loan);
            matchCardFilter = days45 >= 0 && days45 <= 45;
            break;
          default:
            matchCardFilter = true;
        }
      }
      
      // 还款统计卡片筛选
      const matchRepaymentFilter = !filteredLoanReferences || filteredLoanReferences.length === 0 || 
        filteredLoanReferences.includes(loan.loanReference);
      
      // 去重商户筛选
      const matchDeduplicateFilter = !activeRepaymentCard || 
        (activeRepaymentCard === 'ontime' && loan.loanReference !== 'dummy') ||
        (activeRepaymentCard === 'overdue' && loan.loanReference !== 'dummy') ||
        (activeRepaymentCard === 'total' && loan.loanReference !== 'dummy');
      
      return matchSearch && matchCurrency && matchStatus && matchCardFilter && matchRepaymentFilter && matchDeduplicateFilter;
    });
  }, [loans, searchTerm, currencyFilter, statusFilter, activeCardFilter, filteredLoanReferences, activeRepaymentCard]);

  // 去重商户ID后的贷款数据（基于筛选后的结果去重）
  const deduplicatedLoans = useMemo(() => {
    if (!deduplicateMerchant) return filteredLoansBeforeDedupe;
    const map = new Map<string, {
      loan: HSBCLoan;
      allRepaymentSchedules: HSBCLoan['repaymentSchedule'];
      earliestMaturityDate: string;
    }>();
    
    filteredLoansBeforeDedupe.forEach(loan => {
      if (!map.has(loan.merchantId)) {
        map.set(loan.merchantId, {
          loan: { ...loan },
          allRepaymentSchedules: [...(loan.repaymentSchedule || [])],
          earliestMaturityDate: loan.maturityDate,
        });
      } else {
        const existing = map.get(loan.merchantId)!;
        // 合并还款计划
        existing.allRepaymentSchedules = [
          ...existing.allRepaymentSchedules,
          ...(loan.repaymentSchedule || [])
        ];
        // 保留最早到期的日期（更容易显示逾期）
        if (loan.maturityDate < existing.earliestMaturityDate) {
          existing.earliestMaturityDate = loan.maturityDate;
        }
      }
    });
    
    // 构建去重后的贷款数据
    return Array.from(map.values()).map(item => {
      // 重新计算合并后的所有字段（基于筛选后的结果）
      const merchantLoans = filteredLoansBeforeDedupe.filter(l => l.merchantId === item.loan.merchantId);
      
      const totalLoanAmount = merchantLoans.reduce((sum, l) => sum + l.loanAmount, 0);
      const totalRepaid = merchantLoans.reduce((sum, l) => sum + (l.totalRepaid || 0), 0);
      const balance = Math.max(0, totalLoanAmount - totalRepaid);
      
      // 批次日期是2026-04-29
      const batchDate = new Date('2026-04-29');
      const maturityDate = new Date(item.earliestMaturityDate);
      
      // 计算逾期天数：到期日已过且余额>0.9才算逾期
      let overdueDays = -1;
      if (item.earliestMaturityDate) {
        const diffDays = Math.floor((batchDate.getTime() - maturityDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 0 && balance > 0.9) {
          overdueDays = diffDays;
        }
      }
      
      // 计算逾期金额和状态
      const pastdueAmount = overdueDays > 0 ? balance : 0;
      const status = overdueDays > 0 ? 'overdue' : 'normal';
      
      const mergedLoan: HSBCLoan = {
        ...item.loan,
        loanAmount: totalLoanAmount,
        totalRepaid: totalRepaid,
        balance: balance,
        pastdueAmount: pastdueAmount,
        overdueDays: overdueDays,
        status: status,
        maturityDate: item.earliestMaturityDate,
        repaymentSchedule: item.allRepaymentSchedules,
      };
      
      return mergedLoan;
    });
  }, [filteredLoansBeforeDedupe, deduplicateMerchant]);

  // 最终显示的贷款（已经去重和筛选好了）
  const filteredLoans = deduplicatedLoans;

  // 排序后的数据
  const sortedFilteredLoans = useMemo(() => {
    if (!sortField) return filteredLoans;
    
    return [...filteredLoans].sort((a, b) => {
      let aValue: string | number = 0;
      let bValue: string | number = 0;
      
      switch (sortField) {
        case 'loanReference':
          aValue = a.loanReference;
          bValue = b.loanReference;
          break;
        case 'merchantId':
          aValue = a.merchantId;
          bValue = b.merchantId;
          break;
        case 'borrowerName':
          aValue = a.borrowerName;
          bValue = b.borrowerName;
          break;
        case 'loanCurrency':
          aValue = a.loanCurrency;
          bValue = b.loanCurrency;
          break;
        case 'loanStartDate':
          aValue = a.loanStartDate;
          bValue = b.loanStartDate;
          break;
        case 'maturityDate':
          aValue = a.maturityDate;
          bValue = b.maturityDate;
          break;
        case 'loanAmount':
          aValue = a.loanAmount;
          bValue = b.loanAmount;
          break;
        case 'balance':
          aValue = calcBalance(a);
          bValue = calcBalance(b);
          break;
        case 'pastdueAmount':
          aValue = calcPastdueAmount(a);
          bValue = calcPastdueAmount(b);
          break;
        case 'totalRepaid':
          aValue = calcTotalRepaid(a);
          bValue = calcTotalRepaid(b);
          break;
        case 'overdueDays':
          aValue = calcOverdueDays(a);
          bValue = calcOverdueDays(b);
          break;
        case 'status':
          aValue = calcPastdueAmount(a) > 0 ? '逾期' : '正常';
          bValue = calcPastdueAmount(b) > 0 ? '逾期' : '正常';
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      return sortOrder === 'asc' 
        ? (aValue as number) - (bValue as number) 
        : (bValue as number) - (aValue as number);
    });
  }, [filteredLoans, sortField, sortOrder]);

  // 计算当前筛选结果的USD和CNY统计
  const usdStats = filteredLoans.reduce(
    (acc, loan: HSBCLoan) => {
      if (loan.loanCurrency === 'USD') {
        const balance = calcBalance(loan);
        const pastdue = calcPastdueAmount(loan);
        acc.totalBalance += balance;
        acc.totalPastdue += pastdue;
      }
      return acc;
    },
    { totalBalance: 0, totalPastdue: 0 }
  );

  const cnyStats = filteredLoans.reduce(
    (acc, loan: HSBCLoan) => {
      if (loan.loanCurrency === 'CNY') {
        const balance = calcBalance(loan);
        const pastdue = calcPastdueAmount(loan);
        acc.totalBalance += balance;
        acc.totalPastdue += pastdue;
      }
      return acc;
    },
    { totalBalance: 0, totalPastdue: 0 }
  );

  // 分页
  const totalPages = Math.ceil(sortedFilteredLoans.length / pageSize);
  const paginatedLoans = sortedFilteredLoans.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 处理文件上传 - 上传到后端解析（支持加密文件）
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('password', 'amazon246');

      const response = await fetch('/api/hsbc/parse', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || '文件解析失败');
        return;
      }

      const parsedLoans: HSBCLoan[] = (result.loans || []).map((loan: Record<string, string | number>) => ({
        id: String(loan.loanReference || Math.random().toString(36).slice(2)),
        loanReference: String(loan.loanReference || ''),
        merchantId: String(loan.merchantId || ''),
        borrowerName: String(loan.borrowerName || ''),
        loanStartDate: String(loan.loanStartDate || ''),
        loanCurrency: (String(loan.loanCurrency || 'CNY')).toUpperCase() as 'CNY' | 'USD',
        loanAmount: Number(loan.loanAmount) || 0,
        loanInterest: String(loan.loanInterest || ''),
        totalInterestRate: Number(loan.totalInterestRate) || 0,
        loanTenor: String(loan.loanTenor || ''),
        maturityDate: String(loan.maturityDate || ''),
        repaymentSchedule: typeof loan.repaymentSchedule === 'string' 
          ? JSON.parse(loan.repaymentSchedule || '[]') 
          : (loan.repaymentSchedule || []),
        balance: Number(loan.balance) || 0,
        pastdueAmount: Number(loan.pastdueAmount) || 0,
        batchDate: String(loan.batchDate || ''),
        freezeAccountRequested: String(loan.freezeAccountRequested || ''),
        forceDebitRequested: String(loan.forceDebitRequested || ''),
        rmApproval: String(loan.rmApproval || ''),
        dowsureFreezeConfirm: String(loan.dowsureFreezeConfirm || ''),
        dowsureForceDebitConfirm: String(loan.dowsureForceDebitConfirm || ''),
        remarks: String(loan.remarks || ''),
      }));
      if (parsedLoans.length === 0) {
        toast.error('未能从文件中解析到有效数据，请检查文件格式');
        return;
      }

      if (result.isEncrypted) {
        toast.success('检测到加密文件，已自动解密');
      }

      setImportPreview(parsedLoans);
      setShowImportConfirm(true);
      toast.success(`已解析 ${parsedLoans.length} 条数据，请确认导入`);
    } catch (err) {
      console.error('文件上传错误:', err);
      toast.error('文件上传失败，请重试');
    }
  };

  // 处理拖拽上传
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      const input = document.createElement('input');
      input.type = 'file';
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      handleFileUpload({ target: input } as unknown as ChangeEvent<HTMLInputElement>);
    } else {
      toast.error('请上传 Excel 或 CSV 文件');
    }
  };

  // 确认导入
  const confirmImport = async () => {
    try {
      const response = await fetch('/api/hsbc/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loans: importPreview,
          batchDate: importBatchDate,
          mode: uploadMode,
        }),
      });

      if (!response.ok) {
        throw new Error('导入失败');
      }

      const result = await response.json();

      // 更新前端状态
      // 重新从后端加载数据，确保持久化
      await loadData();

      // 自动选择当前导入的批次日期
      setSelectedBatchDate(importBatchDate);

      // 刷新批次日期列表
      await fetchBatchDates();

      setShowImportConfirm(false);
      setImportPreview([]);
      toast.success(`成功导入 ${importPreview.length} 条数据（批次日期: ${importBatchDate}）`);
    } catch (err) {
      console.error('导入错误:', err);
      toast.error('导入失败，请重试');
    }
  };

  // 处理删除批次
  const handleDeleteBatch = (batchDate: string) => {
    setBatchToDelete(batchDate);
    setShowDeleteConfirm(true);
  };

  // 确认删除批次
  const confirmDeleteBatch = async () => {
    try {
      const response = await fetch(`/api/hsbc/delete-batch?batchDate=${encodeURIComponent(batchToDelete)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '删除失败');
      }

      const result = await response.json();
      
      // 清空选择的批次日期
      setSelectedBatchDate('');
      
      // 重新加载数据
      await loadData();
      
      // 刷新批次日期列表
      await fetchBatchDates();
      
      setShowDeleteConfirm(false);
      setBatchToDelete('');
      toast.success(result.message || '删除成功');
    } catch (err) {
      console.error('删除错误:', err);
      toast.error(err instanceof Error ? err.message : '删除失败，请重试');
    }
  };

  // 获取批次日期列表
  const fetchBatchDates = async () => {
    try {
      const response = await fetch('/api/hsbc/batch-dates');
      if (response.ok) {
        const data = await response.json();
        setAvailableBatchDates(data.data || []);
      }
    } catch (err) {
      console.error('获取批次日期失败:', err);
    }
  };

  // 下载模板
  const downloadTemplate = () => {
    const headers = [
      'Loan Reference', 'Merchant ID', 'Borrower Name', 'Loan Start Date',
      'Loan Currency', 'Loan Amount', 'Loan Interest', 'Total Interest Rate',
      'Loan Tenor', 'Maturity Date', 'Balance', 'Pastdue amount'
    ];
    const csv = headers.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hsbc_loan_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('模板下载成功');
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">汇丰贷款管理</h1>
          <p className="text-slate-500 text-sm mt-1">管理汇丰银行贷后案件全流程</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 批次日期选择与删除 */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <select
              value={selectedBatchDate}
              onChange={(e) => setSelectedBatchDate(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部日期</option>
              {(availableBatchDates || []).map((date: string) => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
            {selectedBatchDate && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleDeleteBatch(selectedBatchDate)}
                className="gap-1"
              >
                <X className="w-4 h-4" />
                删除批次
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新数据
          </Button>
        </div>
      </div>

      {/* ============ 汇丰仪表盘 ============ */}
      <Collapsible open={expandedSections.dashboard} onOpenChange={() => toggleSection('dashboard')}>
        <Card className="border-l-4 border-l-blue-500">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-blue-500" />
                汇丰仪表盘
                <Badge variant="secondary" className="ml-2">
                  {stats?.totalLoans || 0} 笔贷款
                </Badge>
              </CardTitle>
              <Button variant="ghost" size="sm">
                {expandedSections.dashboard ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* 标题说明和币种选择 */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-slate-500">
                  <span className="font-semibold">汇丰（香港）数据</span>（汇率1USD=7CNY）
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">币种筛选:</span>
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                    <button
                      onClick={() => setDashboardCurrency('CNY')}
                      className={`px-3 py-1.5 text-sm transition-colors ${
                        dashboardCurrency === 'CNY'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      折CNY
                    </button>
                    <button
                      onClick={() => setDashboardCurrency('USD')}
                      className={`px-3 py-1.5 text-sm transition-colors border-l border-slate-200 ${
                        dashboardCurrency === 'USD'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      折USD
                    </button>
                    <button
                      onClick={() => setDashboardCurrency('ALL')}
                      className={`px-3 py-1.5 text-sm transition-colors border-l border-slate-200 ${
                        dashboardCurrency === 'ALL'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      全部
                    </button>
                  </div>
                </div>
              </div>

              {/* 核心指标 - 根据币种选择显示 */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                {/* 1. 在贷总额 */}
                {(dashboardCurrency === 'CNY' || dashboardCurrency === 'ALL') && (
                  <div 
                    className={`bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'totalBalance' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                    onClick={() => handleCardClick('totalBalance')}
                  >
                    <div className="text-sm opacity-80 mb-1">在贷总额(折CNY)</div>
                    <div className="text-xl font-bold">¥{((stats?.totalBalance || 0) / 10000).toFixed(2)}万</div>
                    <div className="text-xs opacity-70 mt-2 space-y-0.5">
                      <div>贷款笔数: {stats?.totalBalanceLoanCount || 0}笔</div>
                      <div>商户数: {stats?.totalBalanceMerchantCount || 0}个</div>
                    </div>
                  </div>
                )}

                {(dashboardCurrency === 'USD' || dashboardCurrency === 'ALL') && (
                  <div 
                    className={`bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'totalBalanceUSD' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                    onClick={() => handleCardClick('totalBalance')}
                  >
                    <div className="text-sm opacity-80 mb-1">在贷总额(折USD)</div>
                    <div className="text-xl font-bold">${((stats?.totalBalanceUSD || 0) / 10000).toFixed(2)}万</div>
                    <div className="text-xs opacity-70 mt-2 space-y-0.5">
                      <div>贷款笔数: {stats?.totalBalanceLoanCount || 0}笔</div>
                      <div>商户数: {stats?.totalBalanceMerchantCount || 0}个</div>
                    </div>
                  </div>
                )}

                {/* 2. 逾期总额(逾期>0天) */}
                {(dashboardCurrency === 'CNY' || dashboardCurrency === 'ALL') && (
                  <div 
                    className={`bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'overdue0' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                    onClick={() => handleCardClick('overdue0')}
                  >
                    <div className="text-sm opacity-80 mb-1">
                      逾期总额(CNY)
                      <span className="ml-1 text-xs bg-white/20 px-1 rounded">逾期天数&gt;0天</span>
                    </div>
                    <div className="text-xl font-bold">¥{((stats?.overdueByDays?.over0Days?.amount || 0) / 10000).toFixed(2)}万</div>
                    <div className="text-xs opacity-70 mt-2 space-y-0.5">
                      <div>逾期率: {((stats?.overdueByDays?.over0Days?.rate || 0) * 100).toFixed(2)}%</div>
                      <div>逾期笔数: {stats?.overdueByDays?.over0Days?.loanCount || 0}笔</div>
                      <div>商户数: {stats?.overdueByDays?.over0Days?.merchantCount || 0}个</div>
                    </div>
                  </div>
                )}

                {(dashboardCurrency === 'USD' || dashboardCurrency === 'ALL') && (
                  <div 
                    className={`bg-gradient-to-br from-red-600 to-red-700 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'overdue0USD' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                    onClick={() => handleCardClick('overdue0')}
                  >
                    <div className="text-sm opacity-80 mb-1">
                      逾期总额(USD)
                      <span className="ml-1 text-xs bg-white/20 px-1 rounded">逾期天数&gt;0天</span>
                    </div>
                    <div className="text-xl font-bold">${((stats?.overdueByDays?.over0Days?.amountUSD || 0) / 10000).toFixed(2)}万</div>
                    <div className="text-xs opacity-70 mt-2 space-y-0.5">
                      <div>逾期率: {((stats?.overdueByDays?.over0Days?.rate || 0) * 100).toFixed(2)}%</div>
                      <div>逾期笔数: {stats?.overdueByDays?.over0Days?.loanCount || 0}笔</div>
                      <div>商户数: {stats?.overdueByDays?.over0Days?.merchantCount || 0}个</div>
                    </div>
                  </div>
                )}

                {/* 3. 逾期总额(逾期>30天) */}
                {(dashboardCurrency === 'CNY' || dashboardCurrency === 'ALL') && (
                  <div 
                    className={`bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'overdue30' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                    onClick={() => handleCardClick('overdue30')}
                  >
                    <div className="text-sm opacity-80 mb-1">
                      逾期总额(CNY)
                      <span className="ml-1 text-xs bg-white/20 px-1 rounded">逾期天数&gt;30天</span>
                    </div>
                    <div className="text-xl font-bold">¥{((stats?.overdueByDays?.over30Days?.amount || 0) / 10000).toFixed(2)}万</div>
                    <div className="text-xs opacity-70 mt-2 space-y-0.5">
                      <div>逾期率: {((stats?.overdueByDays?.over30Days?.rate || 0) * 100).toFixed(2)}%</div>
                      <div>逾期笔数: {stats?.overdueByDays?.over30Days?.loanCount || 0}笔</div>
                      <div>商户数: {stats?.overdueByDays?.over30Days?.merchantCount || 0}个</div>
                    </div>
                  </div>
                )}

                {(dashboardCurrency === 'USD' || dashboardCurrency === 'ALL') && (
                  <div 
                    className={`bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'overdue30USD' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                    onClick={() => handleCardClick('overdue30')}
                  >
                    <div className="text-sm opacity-80 mb-1">
                      逾期总额(USD)
                      <span className="ml-1 text-xs bg-white/20 px-1 rounded">逾期天数&gt;30天</span>
                    </div>
                    <div className="text-xl font-bold">${((stats?.overdueByDays?.over30Days?.amountUSD || 0) / 10000).toFixed(2)}万</div>
                    <div className="text-xs opacity-70 mt-2 space-y-0.5">
                      <div>逾期率: {((stats?.overdueByDays?.over30Days?.rate || 0) * 100).toFixed(2)}%</div>
                      <div>逾期笔数: {stats?.overdueByDays?.over30Days?.loanCount || 0}笔</div>
                      <div>商户数: {stats?.overdueByDays?.over30Days?.merchantCount || 0}个</div>
                    </div>
                  </div>
                )}

                {/* 4. 逾期总额(逾期>90天) */}
                {(dashboardCurrency === 'CNY' || dashboardCurrency === 'ALL') && (
                  <div 
                    className={`bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'overdue90' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                    onClick={() => handleCardClick('overdue90')}
                  >
                    <div className="text-sm opacity-80 mb-1">
                      逾期总额(CNY)
                      <span className="ml-1 text-xs bg-white/20 px-1 rounded">逾期天数&gt;90天</span>
                    </div>
                    <div className="text-xl font-bold">¥{((stats?.overdueByDays?.over90Days?.amount || 0) / 10000).toFixed(2)}万</div>
                    <div className="text-xs opacity-70 mt-2 space-y-0.5">
                      <div>逾期率: {((stats?.overdueByDays?.over90Days?.rate || 0) * 100).toFixed(2)}%</div>
                      <div>逾期笔数: {stats?.overdueByDays?.over90Days?.loanCount || 0}笔</div>
                      <div>商户数: {stats?.overdueByDays?.over90Days?.merchantCount || 0}个</div>
                    </div>
                  </div>
                )}

                {(dashboardCurrency === 'USD' || dashboardCurrency === 'ALL') && (
                  <div 
                    className={`bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'overdue90USD' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                    onClick={() => handleCardClick('overdue90')}
                  >
                    <div className="text-sm opacity-80 mb-1">
                      逾期总额(USD)
                      <span className="ml-1 text-xs bg-white/20 px-1 rounded">逾期天数&gt;90天</span>
                    </div>
                    <div className="text-xl font-bold">${((stats?.overdueByDays?.over90Days?.amountUSD || 0) / 10000).toFixed(2)}万</div>
                    <div className="text-xs opacity-70 mt-2 space-y-0.5">
                      <div>逾期率: {((stats?.overdueByDays?.over90Days?.rate || 0) * 100).toFixed(2)}%</div>
                      <div>逾期笔数: {stats?.overdueByDays?.over90Days?.loanCount || 0}笔</div>
                      <div>商户数: {stats?.overdueByDays?.over90Days?.merchantCount || 0}个</div>
                    </div>
                  </div>
                )}

                {/* 5. 预警金额 */}
                {(dashboardCurrency === 'CNY' || dashboardCurrency === 'ALL') && (
                  <div 
                    className={`bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'warning' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                    onClick={() => handleCardClick('warning')}
                  >
                    <div className="text-sm opacity-80 mb-1">
                      预警金额(CNY)
                      <span className="ml-1 text-xs bg-white/20 px-1 rounded">逾期商户未到期</span>
                    </div>
                    <div className="text-xl font-bold">¥{((stats?.warningInfo?.amount || 0) / 10000).toFixed(2)}万</div>
                    <div className="text-xs opacity-70 mt-2 space-y-0.5">
                      <div>未到期笔数: {stats?.warningInfo?.loanCount || 0}笔</div>
                      <div>商户数: {stats?.warningInfo?.merchantCount || 0}个</div>
                    </div>
                  </div>
                )}

                {(dashboardCurrency === 'USD' || dashboardCurrency === 'ALL') && (
                  <div 
                    className={`bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'warningUSD' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                    onClick={() => handleCardClick('warning')}
                  >
                    <div className="text-sm opacity-80 mb-1">
                      预警金额(USD)
                      <span className="ml-1 text-xs bg-white/20 px-1 rounded">逾期商户未到期</span>
                    </div>
                    <div className="text-xl font-bold">${((stats?.warningInfo?.amountUSD || 0) / 10000).toFixed(2)}万</div>
                    <div className="text-xs opacity-70 mt-2 space-y-0.5">
                      <div>未到期笔数: {stats?.warningInfo?.loanCount || 0}笔</div>
                      <div>商户数: {stats?.warningInfo?.merchantCount || 0}个</div>
                    </div>
                  </div>
                )}
              </div>

              {/* ============ 贷后数据卡片 ============ */}
              <div className="mt-6 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className="font-semibold text-slate-700">贷后还款数据</span>
                    <span className="text-xs text-slate-500">
                      ({repaymentStats?.totalLoans || 0}笔贷款中有{repaymentStats?.loansWithRepayment || 0}笔有还款记录)
                    </span>
                  </div>
                  <select
                    value={repaymentStats?.currentMonth || ''}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">选择月份</option>
                    {(repaymentStats?.availableMonths || []).map((month: string) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
                
                {repaymentStats?.stats ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 未逾期还款 */}
                    <div 
                      className={`bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeRepaymentCard === 'ontime' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                      onClick={() => handleRepaymentCardClick('ontime')}
                    >
                      <div className="text-sm opacity-90 mb-2">
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          未逾期还款
                        </span>
                        {activeRepaymentCard === 'ontime' && (
                          <span className="ml-2 text-xs bg-white/30 px-2 py-0.5 rounded-full">已筛选</span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {(dashboardCurrency === 'CNY' || dashboardCurrency === 'ALL') && (
                          <div>
                            <div className="text-2xl font-bold">¥{repaymentStats.stats.ontimeRepayment.amountCNYWan}万</div>
                            <div className="text-xs opacity-70">CNY</div>
                          </div>
                        )}
                        {(dashboardCurrency === 'USD' || dashboardCurrency === 'ALL') && (
                          <div>
                            <div className="text-2xl font-bold">${repaymentStats.stats.ontimeRepayment.amountUSDWan}万</div>
                            <div className="text-xs opacity-70">USD</div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs opacity-70 mt-3 space-y-1">
                        <div>还款笔数: {repaymentStats.stats.ontimeRepayment.count}笔</div>
                        <div>涉及贷款: {repaymentStats.stats.ontimeRepayment.loanCount}笔</div>
                      </div>
                    </div>

                    {/* 逾期后还款 */}
                    <div 
                      className={`bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeRepaymentCard === 'overdue' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                      onClick={() => handleRepaymentCardClick('overdue')}
                    >
                      <div className="text-sm opacity-90 mb-2">
                        <span className="inline-flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          逾期后还款
                        </span>
                        {activeRepaymentCard === 'overdue' && (
                          <span className="ml-2 text-xs bg-white/30 px-2 py-0.5 rounded-full">已筛选</span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {(dashboardCurrency === 'CNY' || dashboardCurrency === 'ALL') && (
                          <div>
                            <div className="text-2xl font-bold">¥{repaymentStats.stats.overdueRepayment.amountCNYWan}万</div>
                            <div className="text-xs opacity-70">CNY</div>
                          </div>
                        )}
                        {(dashboardCurrency === 'USD' || dashboardCurrency === 'ALL') && (
                          <div>
                            <div className="text-2xl font-bold">${repaymentStats.stats.overdueRepayment.amountUSDWan}万</div>
                            <div className="text-xs opacity-70">USD</div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs opacity-70 mt-3 space-y-1">
                        <div>还款笔数: {repaymentStats.stats.overdueRepayment.count}笔</div>
                        <div>涉及贷款: {repaymentStats.stats.overdueRepayment.loanCount}笔</div>
                      </div>
                    </div>

                    {/* 还款总额 */}
                    <div 
                      className={`bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeRepaymentCard === 'total' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                      onClick={() => handleRepaymentCardClick('total')}
                    >
                      <div className="text-sm opacity-90 mb-2">
                        <span className="inline-flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          还款总额
                        </span>
                        {activeRepaymentCard === 'total' && (
                          <span className="ml-2 text-xs bg-white/30 px-2 py-0.5 rounded-full">已筛选</span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {(dashboardCurrency === 'CNY' || dashboardCurrency === 'ALL') && (
                          <div>
                            <div className="text-2xl font-bold">¥{repaymentStats.stats.totalRepayment.amountCNYWan}万</div>
                            <div className="text-xs opacity-70">CNY</div>
                          </div>
                        )}
                        {(dashboardCurrency === 'USD' || dashboardCurrency === 'ALL') && (
                          <div>
                            <div className="text-2xl font-bold">${repaymentStats.stats.totalRepayment.amountUSDWan}万</div>
                            <div className="text-xs opacity-70">USD</div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs opacity-70 mt-3 space-y-1">
                        <div>总还款笔数: {repaymentStats.stats.ontimeRepayment.count + repaymentStats.stats.overdueRepayment.count}笔</div>
                        <div>涉及贷款: {repaymentStats.stats.ontimeRepayment.loanCount + repaymentStats.stats.overdueRepayment.loanCount}笔</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>暂无还款数据</p>
                    <p className="text-xs">请选择月份查看该月的还款情况</p>
                  </div>
                )}
              </div>

              {/* 还款期限分布 - 根据币种选择显示 */}
              <div className="mt-6">
                <div className="grid grid-cols-1 gap-4">
                  {(dashboardCurrency === 'CNY' || dashboardCurrency === 'ALL') && (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {/* 3天内 */}
                      <div 
                        className={`bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'due3' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                        onClick={() => handleCardClick('due3')}
                      >
                        <div className="text-sm opacity-80 mb-1">3天内需还款(折CNY)</div>
                        <div className="text-xl font-bold">
                          ¥{((stats?.repaymentDue?.[3]?.cnyAmount || 0) / 10000).toFixed(2)}万
                        </div>
                        <div className="text-xs opacity-70 mt-2 space-y-0.5">
                          <div>贷款笔数: {stats?.repaymentDue?.[3]?.count || 0}笔</div>
                          <div>商户数: {stats?.repaymentDue?.[3]?.merchantCount || 0}个</div>
                        </div>
                      </div>

                      {/* 7天内 */}
                      <div 
                        className={`bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'due7' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                        onClick={() => handleCardClick('due7')}
                      >
                        <div className="text-sm opacity-80 mb-1">7天内需还款(折CNY)</div>
                        <div className="text-xl font-bold">
                          ¥{((stats?.repaymentDue?.[7]?.cnyAmount || 0) / 10000).toFixed(2)}万
                        </div>
                        <div className="text-xs opacity-70 mt-2 space-y-0.5">
                          <div>贷款笔数: {stats?.repaymentDue?.[7]?.count || 0}笔</div>
                          <div>商户数: {stats?.repaymentDue?.[7]?.merchantCount || 0}个</div>
                        </div>
                      </div>

                      {/* 15天内 */}
                      <div 
                        className={`bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'due15' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                        onClick={() => handleCardClick('due15')}
                      >
                        <div className="text-sm opacity-80 mb-1">15天内需还款(折CNY)</div>
                        <div className="text-xl font-bold">
                          ¥{((stats?.repaymentDue?.[15]?.cnyAmount || 0) / 10000).toFixed(2)}万
                        </div>
                        <div className="text-xs opacity-70 mt-2 space-y-0.5">
                          <div>贷款笔数: {stats?.repaymentDue?.[15]?.count || 0}笔</div>
                          <div>商户数: {stats?.repaymentDue?.[15]?.merchantCount || 0}个</div>
                        </div>
                      </div>

                      {/* 30天内 */}
                      <div 
                        className={`bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'due30' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                        onClick={() => handleCardClick('due30')}
                      >
                        <div className="text-sm opacity-80 mb-1">30天内需还款(折CNY)</div>
                        <div className="text-xl font-bold">
                          ¥{((stats?.repaymentDue?.[30]?.cnyAmount || 0) / 10000).toFixed(2)}万
                        </div>
                        <div className="text-xs opacity-70 mt-2 space-y-0.5">
                          <div>贷款笔数: {stats?.repaymentDue?.[30]?.count || 0}笔</div>
                          <div>商户数: {stats?.repaymentDue?.[30]?.merchantCount || 0}个</div>
                        </div>
                      </div>

                      {/* 45天内 */}
                      <div 
                        className={`bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'due45' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                        onClick={() => handleCardClick('due45')}
                      >
                        <div className="text-sm opacity-80 mb-1">45天内需还款(折CNY)</div>
                        <div className="text-xl font-bold">
                          ¥{((stats?.repaymentDue?.[45]?.cnyAmount || 0) / 10000).toFixed(2)}万
                        </div>
                        <div className="text-xs opacity-70 mt-2 space-y-0.5">
                          <div>贷款笔数: {stats?.repaymentDue?.[45]?.count || 0}笔</div>
                          <div>商户数: {stats?.repaymentDue?.[45]?.merchantCount || 0}个</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {(dashboardCurrency === 'USD' || dashboardCurrency === 'ALL') && (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {/* 3天内 */}
                      <div 
                        className={`bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'due3USD' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                        onClick={() => handleCardClick('due3')}
                      >
                        <div className="text-sm opacity-80 mb-1">3天内需还款(折USD)</div>
                        <div className="text-xl font-bold">
                          ${((stats?.repaymentDue?.[3]?.usdAmount || 0) / 10000).toFixed(2)}万
                        </div>
                        <div className="text-xs opacity-70 mt-2 space-y-0.5">
                          <div>贷款笔数: {stats?.repaymentDue?.[3]?.count || 0}笔</div>
                          <div>商户数: {stats?.repaymentDue?.[3]?.merchantCount || 0}个</div>
                        </div>
                      </div>

                      {/* 7天内 */}
                      <div 
                        className={`bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'due7USD' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                        onClick={() => handleCardClick('due7')}
                      >
                        <div className="text-sm opacity-80 mb-1">7天内需还款(折USD)</div>
                        <div className="text-xl font-bold">
                          ${((stats?.repaymentDue?.[7]?.usdAmount || 0) / 10000).toFixed(2)}万
                        </div>
                        <div className="text-xs opacity-70 mt-2 space-y-0.5">
                          <div>贷款笔数: {stats?.repaymentDue?.[7]?.count || 0}笔</div>
                          <div>商户数: {stats?.repaymentDue?.[7]?.merchantCount || 0}个</div>
                        </div>
                      </div>

                      {/* 15天内 */}
                      <div 
                        className={`bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'due15USD' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                        onClick={() => handleCardClick('due15')}
                      >
                        <div className="text-sm opacity-80 mb-1">15天内需还款(折USD)</div>
                        <div className="text-xl font-bold">
                          ${((stats?.repaymentDue?.[15]?.usdAmount || 0) / 10000).toFixed(2)}万
                        </div>
                        <div className="text-xs opacity-70 mt-2 space-y-0.5">
                          <div>贷款笔数: {stats?.repaymentDue?.[15]?.count || 0}笔</div>
                          <div>商户数: {stats?.repaymentDue?.[15]?.merchantCount || 0}个</div>
                        </div>
                      </div>

                      {/* 30天内 */}
                      <div 
                        className={`bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'due30USD' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                        onClick={() => handleCardClick('due30')}
                      >
                        <div className="text-sm opacity-80 mb-1">30天内需还款(折USD)</div>
                        <div className="text-xl font-bold">
                          ${((stats?.repaymentDue?.[30]?.usdAmount || 0) / 10000).toFixed(2)}万
                        </div>
                        <div className="text-xs opacity-70 mt-2 space-y-0.5">
                          <div>贷款笔数: {stats?.repaymentDue?.[30]?.count || 0}笔</div>
                          <div>商户数: {stats?.repaymentDue?.[30]?.merchantCount || 0}个</div>
                        </div>
                      </div>

                      {/* 45天内 */}
                      <div 
                        className={`bg-gradient-to-br from-violet-600 to-violet-700 rounded-lg p-4 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${activeCardFilter === 'due45USD' ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                        onClick={() => handleCardClick('due45')}
                      >
                        <div className="text-sm opacity-80 mb-1">45天内需还款(折USD)</div>
                        <div className="text-xl font-bold">
                          ${((stats?.repaymentDue?.[45]?.usdAmount || 0) / 10000).toFixed(2)}万
                        </div>
                        <div className="text-xs opacity-70 mt-2 space-y-0.5">
                          <div>贷款笔数: {stats?.repaymentDue?.[45]?.count || 0}笔</div>
                          <div>商户数: {stats?.repaymentDue?.[45]?.merchantCount || 0}个</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>


            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ============ 汇丰案件列表 ============ */}
      <div ref={casesListRef}>
        <Collapsible open={expandedSections.loans} onOpenChange={() => toggleSection('loans')}>
          <Card className="border-l-4 border-l-emerald-500">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                  汇丰案件列表
                  <Badge variant="secondary" className="ml-2">
                    {filteredLoans.length} 条记录
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 border-blue-300 text-blue-700">
                      USD余额: ${(usdStats.totalBalance / 10000).toFixed(2)}万
                    </Badge>
                    <Badge variant="outline" className="bg-red-50 border-red-300 text-red-700">
                      USD逾期: ${(usdStats.totalPastdue / 10000).toFixed(2)}万
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 border-blue-300 text-blue-700">
                      CNY余额: ¥{(cnyStats.totalBalance / 10000).toFixed(2)}万
                    </Badge>
                    <Badge variant="outline" className="bg-red-50 border-red-300 text-red-700">
                      CNY逾期: ¥{(cnyStats.totalPastdue / 10000).toFixed(2)}万
                    </Badge>
                  {activeCardFilter && (
                    <Badge variant="outline" className="ml-2 bg-yellow-50 border-yellow-400 text-yellow-700">
                      已筛选: {getFilterLabel(activeCardFilter)}
                    </Badge>
                  )}
                  {activeRepaymentCard && (
                    <Badge variant="outline" className="ml-2 bg-green-50 border-green-400 text-green-700">
                      还款筛选: {activeRepaymentCard === 'ontime' ? '未逾期还款' : activeRepaymentCard === 'overdue' ? '逾期后还款' : '还款总额'}
                      {selectedRepaymentMonth && ` (${selectedRepaymentMonth})`}
                    </Badge>
                  )}
                </CardTitle>
                <Button variant="ghost" size="sm">
                  {expandedSections.loans ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CardHeader>
            </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* 筛选工具栏 */}
              <div className="flex flex-wrap gap-3 mb-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="搜索贷款编号/商户ID/名称/日期..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="all">全部币种</option>
                  <option value="CNY">CNY 人民币</option>
                  <option value="USD">USD 美元</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="all">全部状态</option>
                  <option value="normal">正常</option>
                  <option value="overdue">逾期</option>
                </select>
                {/* 清除卡片筛选按钮 */}
                {activeCardFilter && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setActiveCardFilter(null)}
                    className="gap-2"
                  >
                    <X className="w-4 h-4" />
                    清除筛选
                  </Button>
                )}
                {/* 去重商户ID按钮 */}
                <Button
                  variant={deduplicateMerchant ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDeduplicateMerchant(!deduplicateMerchant)}
                  className="gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  {deduplicateMerchant ? "已去重" : "去重商户"}
                </Button>
                {/* 列选择按钮 */}
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setShowColumnPicker(!showColumnPicker)} className="gap-2">
                    <Columns className="w-4 h-4" />
                    列选择
                  </Button>
                  {showColumnPicker && (
                    <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[200px]">
                      <p className="text-sm font-medium text-slate-700 mb-2">选择显示的列</p>
                      <div className="space-y-2">
                        {columnDefinitions.map(col => (
                          <label key={col.key} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={visibleColumns.includes(col.key)}
                              onChange={() => toggleColumn(col.key)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-600">{col.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 表格 */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      {visibleColumns.includes('loanReference') && (
                        <TableHead className="w-[140px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('loanReference')}>
                          <div className="flex items-center gap-1">
                            贷款编号
                            {sortField === 'loanReference' ? (sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.includes('merchantId') && (
                        <TableHead className="cursor-pointer hover:bg-slate-100" onClick={() => handleSort('merchantId')}>
                          <div className="flex items-center gap-1">
                            商户ID
                            {sortField === 'merchantId' ? (sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.includes('borrowerName') && (
                        <TableHead className="w-[250px] cursor-pointer hover:bg-slate-100" onClick={() => handleSort('borrowerName')}>
                          <div className="flex items-center gap-1">
                            借款人名称
                            {sortField === 'borrowerName' ? (sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.includes('loanCurrency') && (
                        <TableHead className="text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('loanCurrency')}>
                          <div className="flex items-center justify-center gap-1">
                            币种
                            {sortField === 'loanCurrency' ? (sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.includes('loanStartDate') && (
                        <TableHead className="text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('loanStartDate')}>
                          <div className="flex items-center justify-center gap-1">
                            贷款日期
                            {sortField === 'loanStartDate' ? (sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.includes('maturityDate') && (
                        <TableHead className="text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('maturityDate')}>
                          <div className="flex items-center justify-center gap-1">
                            到期日
                            {sortField === 'maturityDate' ? (sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.includes('loanAmount') && (
                        <TableHead className="text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('loanAmount')}>
                          <div className="flex items-center justify-end gap-1">
                            贷款金额
                            {sortField === 'loanAmount' ? (sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.includes('balance') && (
                        <TableHead className="text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('balance')}>
                          <div className="flex items-center justify-end gap-1">
                            余额
                            {sortField === 'balance' ? (sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.includes('pastdueAmount') && (
                        <TableHead className="text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('pastdueAmount')}>
                          <div className="flex items-center justify-end gap-1">
                            逾期金额
                            {sortField === 'pastdueAmount' ? (sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.includes('overdueDays') && (
                        <TableHead className="text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('overdueDays')}>
                          <div className="flex items-center justify-end gap-1">
                            逾期天数
                            {sortField === 'overdueDays' ? (sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.includes('totalRepaid') && (
                        <TableHead className="text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('totalRepaid')}>
                          <div className="flex items-center justify-end gap-1">
                            已还款总额
                            {sortField === 'totalRepaid' ? (sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.includes('status') && (
                        <TableHead className="text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('status')}>
                          <div className="flex items-center justify-center gap-1">
                            状态
                            {sortField === 'status' ? (sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                          </div>
                        </TableHead>
                      )}
                      <TableHead className="text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLoans.map((loan) => (
                      <TableRow key={loan.id} className="hover:bg-slate-50">
                        {visibleColumns.includes('loanReference') && (
                          <TableCell className="font-mono text-sm">{loan.loanReference}</TableCell>
                        )}
                        {visibleColumns.includes('merchantId') && (
                          <TableCell className="font-mono">{loan.merchantId}</TableCell>
                        )}
                        {visibleColumns.includes('borrowerName') && (
                          <TableCell className="max-w-[250px] truncate">{loan.borrowerName}</TableCell>
                        )}
                        {visibleColumns.includes('loanCurrency') && (
                          <TableCell className="text-center">
                            <Badge variant="outline">{loan.loanCurrency}</Badge>
                          </TableCell>
                        )}
                        {visibleColumns.includes('loanStartDate') && (
                          <TableCell className="text-center text-sm">{loan.loanStartDate}</TableCell>
                        )}
                        {visibleColumns.includes('maturityDate') && (
                          <TableCell className="text-center text-sm">{loan.maturityDate}</TableCell>
                        )}
                        {visibleColumns.includes('loanAmount') && (
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatCurrency(loan.loanAmount, loan.loanCurrency)}
                          </TableCell>
                        )}
                        {visibleColumns.includes('balance') && (
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatCurrency(calcBalance(loan), loan.loanCurrency)}
                          </TableCell>
                        )}
                        {visibleColumns.includes('pastdueAmount') && (
                          <TableCell className={`text-right font-mono tabular-nums ${calcPastdueAmount(loan) > 0 ? 'text-red-600 font-semibold' : ''}`}>
                            {formatCurrency(calcPastdueAmount(loan), loan.loanCurrency)}
                          </TableCell>
                        )}
                        {visibleColumns.includes('overdueDays') && (
                          <TableCell className={`text-right font-mono tabular-nums ${(loan.overdueDays ?? -1) > 0 ? 'text-red-600 font-semibold' : ''}`}>
                            {(loan.overdueDays ?? -1) > 0 ? `${loan.overdueDays}天` : '正常'}
                          </TableCell>
                        )}
                        {visibleColumns.includes('totalRepaid') && (
                          <TableCell className="text-right font-mono tabular-nums text-blue-600">
                            {formatCurrency(calcTotalRepaid(loan), loan.loanCurrency)}
                          </TableCell>
                        )}
                        {visibleColumns.includes('status') && (
                          <TableCell className="text-center">
                            {loan.status === 'overdue' ? (
                              <Badge className="bg-red-100 text-red-700 border-red-200">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                逾期
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                正常
                              </Badge>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">操作</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center">
                              <DropdownMenuItem onClick={() => setSelectedLoan(loan)}>
                                <Eye className="w-4 h-4 mr-2" />
                                查看详情
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedLoans.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-slate-500">
                          暂无数据
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 分页 */}
              <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">
                    共 {sortedFilteredLoans.length} 条，第 {currentPage} / {totalPages || 1} 页
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border rounded px-2 py-1 text-sm bg-background"
                  >
                    <option value={20}>20条/页</option>
                    <option value={50}>50条/页</option>
                    <option value={100}>100条/页</option>
                    <option value={500}>500条/页</option>
                    <option value={1000}>1000条/页</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      </div>

      {/* ============ 汇丰数据导入 ============ */}
      <Collapsible open={expandedSections.upload} onOpenChange={() => toggleSection('upload')}>
        <Card className="border-l-4 border-l-amber-500">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-500" />
                汇丰数据导入
                <Badge variant="secondary" className="ml-2">
                  支持 Excel/CSV
                </Badge>
              </CardTitle>
              <Button variant="ghost" size="sm">
                {expandedSections.upload ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 上传区域 */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-300 hover:border-blue-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-lg font-medium text-slate-700 mb-2">
                    拖拽文件到此处或点击上传
                  </p>
                  <p className="text-sm text-slate-500 mb-4">
                    支持 .xlsx, .xls, .csv 格式
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button asChild className="cursor-pointer">
                      <span>选择文件</span>
                    </Button>
                  </label>
                </div>

                {/* 导入选项 */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-700 mb-2">导入模式</h4>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                        <input
                          type="radio"
                          name="uploadMode"
                          value="replace"
                          checked={uploadMode === 'replace'}
                          onChange={(e) => setUploadMode(e.target.value as 'replace' | 'merge')}
                          className="text-blue-600"
                        />
                        <div>
                          <div className="font-medium">覆盖导入</div>
                          <div className="text-sm text-slate-500">清空现有数据，导入新数据</div>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                        <input
                          type="radio"
                          name="uploadMode"
                          value="merge"
                          checked={uploadMode === 'merge'}
                          onChange={(e) => setUploadMode(e.target.value as 'replace' | 'merge')}
                          className="text-blue-600"
                        />
                        <div>
                          <div className="font-medium">增量导入</div>
                          <div className="text-sm text-slate-500">保留现有数据，追加新数据</div>
                        </div>
                      </label>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" onClick={downloadTemplate}>
                    <FileText className="w-4 h-4 mr-2" />
                    下载导入模板
                  </Button>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 导入确认弹窗 */}
      <Dialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>确认导入数据</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
          <div className="flex items-center gap-4 mb-4">
            <p className="text-sm text-slate-600">
              共 {importPreview.length} 条数据，确认导入？
            </p>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">批次日期：</label>
              <input
                type="date"
                value={importBatchDate}
                onChange={(e) => setImportBatchDate(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm"
              />
            </div>
          </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>贷款编号</TableHead>
                    <TableHead>商户ID</TableHead>
                    <TableHead>借款人</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(importPreview || []).map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-mono">{loan.loanReference}</TableCell>
                      <TableCell className="font-mono">{loan.merchantId}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{loan.borrowerName}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(loan.loanAmount, loan.loanCurrency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowImportConfirm(false)}>
              取消
            </Button>
            <Button onClick={confirmImport}>
              确认导入
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除批次确认弹窗 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              确认删除批次
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              您确定要删除批次 <span className="font-mono font-semibold text-slate-800">{batchToDelete}</span> 的所有数据吗？
            </p>
            <p className="text-sm text-slate-500 mt-2">
              此操作不可恢复，该批次的所有贷款记录将被永久删除。
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDeleteBatch}>
              确认删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 详情弹窗 */}
      <Dialog open={!!selectedLoan} onOpenChange={() => setSelectedLoan(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              贷款详情
              {selectedLoan?.pastdueAmount && selectedLoan.pastdueAmount > 0 && (
                <Badge className="bg-red-100 text-red-700">逾期</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-6">
              {/* 基本信息 */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-3">基本信息</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-slate-500">贷款编号</div>
                    <div className="font-mono font-medium">{selectedLoan.loanReference}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">商户ID</div>
                    <div className="font-mono">{selectedLoan.merchantId}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">借款人</div>
                    <div className="truncate">{selectedLoan.borrowerName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">币种</div>
                    <Badge variant="outline">{selectedLoan.loanCurrency}</Badge>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">贷款金额</div>
                    <div className="font-mono font-semibold text-lg">
                      {formatCurrency(selectedLoan.loanAmount, selectedLoan.loanCurrency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">在贷余额</div>
                    <div className="font-mono">{formatCurrency(selectedLoan.balance ?? 0, selectedLoan.loanCurrency)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">逾期金额</div>
                    <div className={`font-mono font-semibold ${(selectedLoan.pastdueAmount ?? 0) > 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(selectedLoan.pastdueAmount ?? 0, selectedLoan.loanCurrency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">贷款期限</div>
                    <div>{selectedLoan.loanTenor}</div>
                  </div>
                </div>
              </div>

              {/* 利率信息 */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-3">利率信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-500">利率描述</div>
                    <div>{selectedLoan.loanInterest}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">总利率</div>
                    <div className="font-semibold">{selectedLoan.totalInterestRate.toFixed(5)}%</div>
                  </div>
                </div>
              </div>

              {/* 日期信息 */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-3">日期信息</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-slate-500">贷款开始日期</div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {selectedLoan.loanStartDate}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">到期日期</div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {selectedLoan.maturityDate}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">批次日期</div>
                    <div>{selectedLoan.batchDate}</div>
                  </div>
                </div>
              </div>

              {/* 还款计划 */}
              {selectedLoan.repaymentSchedule.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-700 mb-3">还款计划</h3>
                  <div className="space-y-2">
                    {(selectedLoan.repaymentSchedule || []).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                            {idx + 1}
                          </span>
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {item.date}
                        </span>
                        <span className="font-mono font-medium">
                          {formatCurrency(item.amount, selectedLoan.loanCurrency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
