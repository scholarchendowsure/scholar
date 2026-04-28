'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { formatCurrency } from '@/lib/constants';
import { calcPastdueAmount } from '@/lib/hsbc-loan';
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
} from 'lucide-react';

// ============ 类型定义 ============
interface HSBCLoan {
  id: string;
  loanReference: string;
  merchantId: string;
  borrowerName: string;
  loanStartDate: string;
  loanCurrency: string;
  loanAmount: number;
  loanInterest: string;
  totalInterestRate: number;
  loanTenor: string;
  maturityDate: string;
  balance: number;
  pastdueAmount: number;
  status: 'normal' | 'overdue';
  batchDate: string;
  repaymentSchedule: Array<{
    date: string;
    amount: number;
  }>;
  operationLogs: Array<{
    date: string;
    type: string;
    description: string;
    status: string;
  }>;
}

interface HSBCStats {
  totalLoans: number;
  activeMerchants: number;
  totalLoanAmount: number;
  totalBalance: number;
  totalPastdueAmount: number;
  overdueRate: number;
  overdueMerchantRate: number;
  warningAmount: number;
  approachingMaturityAmount: number;
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
      const balance = Math.floor(amount * (Math.random() * 0.5 + 0.3));
      const pastdue = Math.random() > 0.7 ? Math.floor(balance * (Math.random() * 0.3)) : 0;
      const startDate = new Date(2024, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1);
      const maturityDate = new Date(startDate);
      maturityDate.setMonth(maturityDate.getMonth() + Math.floor(Math.random() * 3) + 1);

      loans.push({
        id: `LAE${idx.toString().padStart(4, '0')}${i}`,
        loanReference: `LAEAM10${idx.toString().padStart(4, '0')}${i}`,
        merchantId: merchant.id,
        borrowerName: merchant.name,
        loanStartDate: startDate.toISOString().split('T')[0],
        loanCurrency: currency,
        loanAmount: amount,
        loanInterest: currency === 'USD' ? '90D SOFR TERM + 3%' : '90D CNY HBR + 2.25%',
        totalInterestRate: currency === 'USD' ? 8.2 + Math.random() * 0.3 : 5.5 + Math.random() * 0.5,
        loanTenor: `${Math.floor(Math.random() * 30) + 90}D`,
        maturityDate: maturityDate.toISOString().split('T')[0],
        balance,
        pastdueAmount: pastdue,
        status: pastdue > 0 ? 'overdue' : 'normal',
        batchDate: '2024-07',
        repaymentSchedule: [
          { date: startDate.toISOString().split('T')[0], amount: Math.floor(amount * 0.3) },
          { date: maturityDate.toISOString().split('T')[0], amount: Math.floor(amount * 0.7) },
        ],
        operationLogs: [],
      });
    }
  });

  return loans;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generateMockStats = (loans: HSBCLoan[]): any => {
  const totalAmount = loans.reduce((sum, l) => sum + l.loanAmount, 0);
  const totalBalance = loans.reduce((sum, l) => sum + l.balance, 0);
  const totalPastdue = loans.reduce((sum, l) => sum + l.pastdueAmount, 0);
  const overdueLoans = loans.filter(l => l.pastdueAmount > 0).length;

  const cnyLoans = loans.filter(l => l.loanCurrency === 'CNY');
  const usdLoans = loans.filter(l => l.loanCurrency === 'USD');

  return {
    totalLoans: loans.length,
    totalAmount,
    totalBalance,
    totalPastdue,
    overdueLoans,
    overdueRate: totalBalance > 0 ? totalPastdue / totalBalance : 0,
    currencyBreakdown: [
      {
        currency: 'CNY',
        loanCount: cnyLoans.length,
        totalAmount: cnyLoans.reduce((sum, l) => sum + l.loanAmount, 0),
        balance: cnyLoans.reduce((sum, l) => sum + l.balance, 0),
        overdueAmount: cnyLoans.reduce((sum, l) => sum + l.pastdueAmount, 0),
        overdueMerchantCount: [...new Set(cnyLoans.filter(l => l.pastdueAmount >= 0.5).map(l => l.merchantId))].length,
        overdueLoanCount: cnyLoans.filter(l => l.pastdueAmount >= 0.5).length,
      },
      {
        currency: 'USD',
        loanCount: usdLoans.length,
        totalAmount: usdLoans.reduce((sum, l) => sum + l.loanAmount, 0),
        balance: usdLoans.reduce((sum, l) => sum + l.balance, 0),
        overdueAmount: usdLoans.reduce((sum, l) => sum + l.pastdueAmount, 0),
        overdueMerchantCount: [...new Set(usdLoans.filter(l => l.pastdueAmount >= 0.5).map(l => l.merchantId))].length,
        overdueLoanCount: usdLoans.filter(l => l.pastdueAmount >= 0.5).length,
      },
    ],
    riskDistribution: [
      { level: '低风险', count: Math.floor(loans.length * 0.4), amount: Math.floor(totalAmount * 0.4) },
      { level: '中风险', count: Math.floor(loans.length * 0.3), amount: Math.floor(totalAmount * 0.3) },
      { level: '高风险', count: Math.floor(loans.length * 0.2), amount: Math.floor(totalAmount * 0.2) },
      { level: '严重', count: Math.floor(loans.length * 0.1), amount: Math.floor(totalAmount * 0.1) },
    ],
    maturityDistribution: [
      { range: '7天内', count: 3, amount: 500000 },
      { range: '15天内', count: 5, amount: 1200000 },
      { range: '30天内', count: 8, amount: 2500000 },
      { range: '45天内', count: 12, amount: 4000000 },
    ],
  };
};

// ============ 主组件 ============
export default function HSBCPanelPage() {
  const [loans, setLoans] = useState<HSBCLoan[]>([]);
  const [stats, setStats] = useState<HSBCStats | null>(null);
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
  const [selectedLoan, setSelectedLoan] = useState<HSBCLoan | null>(null);

  // 导入状态
  const [uploadMode, setUploadMode] = useState<'replace' | 'merge'>('replace');
  const [importPreview, setImportPreview] = useState<HSBCLoan[]>([]);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importBatchDate, setImportBatchDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedBatchDate, setSelectedBatchDate] = useState<string>('');
  const [availableBatchDates, setAvailableBatchDates] = useState<string[]>([]);
  const [filePassword, setFilePassword] = useState<string>('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // 列选择相关状态
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'loanReference', 'merchantId', 'borrowerName', 'loanCurrency', 
    'loanStartDate', 'loanAmount', 'balance', 'pastdueAmount', 'status'
  ]);
  
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

  const calcTotalRepaid = (loan: HSBCLoan): number => {
    return loan.loanAmount - loan.balance;
  };

  // 去重商户ID相关状态
  const [deduplicateMerchant, setDeduplicateMerchant] = useState(false);

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

  // 去重商户ID后的贷款数据
  const deduplicatedLoans = useMemo(() => {
    if (!deduplicateMerchant) return loans;
    const map = new Map<string, HSBCLoan>();
    loans.forEach(loan => {
      if (!map.has(loan.merchantId)) {
        map.set(loan.merchantId, loan);
      } else {
        // 合并金额
        const existing = map.get(loan.merchantId)!;
        map.set(loan.merchantId, {
          ...existing,
          loanAmount: existing.loanAmount + loan.loanAmount,
          balance: existing.balance + loan.balance,
          pastdueAmount: existing.pastdueAmount + loan.pastdueAmount,
        });
      }
    });
    return Array.from(map.values());
  }, [loans, deduplicateMerchant]);

  // 筛选后的贷款（如果选择了批次日期，数据已经是该日期的数据）
  const filteredLoans = deduplicatedLoans.filter((loan: HSBCLoan) => {
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
    return matchSearch && matchCurrency && matchStatus;
  });

  // 分页
  const pageSize = 10;
  const totalPages = Math.ceil(filteredLoans.length / pageSize);
  const paginatedLoans = filteredLoans.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
      handleFileUpload({ target: input } as any);
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
          {/* 批次日期选择 */}
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
              {/* 核心指标 */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <FileSpreadsheet className="w-4 h-4 opacity-80" />
                    <span className="text-sm opacity-80">总贷款笔数</span>
                  </div>
                  <div className="text-2xl font-bold">{stats?.totalLoans || 0}</div>
                </div>
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-4 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 opacity-80" />
                    <span className="text-sm opacity-80">累计放款</span>
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(stats?.totalLoanAmount || 0)}</div>
                </div>
                <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg p-4 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 opacity-80" />
                    <span className="text-sm opacity-80">在贷余额</span>
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(stats?.totalBalance || 0)}</div>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 opacity-80" />
                    <span className="text-sm opacity-80">逾期总额</span>
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(stats?.totalPastdueAmount || 0)}</div>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-4 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="w-4 h-4 opacity-80" />
                    <span className="text-sm opacity-80">逾期率</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {(stats?.overdueRate || 0).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* 币种细分 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  币种细分
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(stats?.currencyBreakdown || []).map((item) => (
                    <div key={item.currency} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className="text-lg px-3">
                          {item.currency}
                        </Badge>
                        <span className="text-2xl font-bold text-slate-800">
                          {item.loanCount} 笔
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">贷款金额：</span>
                          <span className="font-mono font-medium">{formatCurrency(item.totalAmount, item.currency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">在贷余额：</span>
                          <span className="font-mono font-medium">{formatCurrency(item.balance, item.currency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">逾期金额：</span>
                          <span className="font-mono font-medium text-red-600">{formatCurrency(item.overdueAmount, item.currency)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 风险评估 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <PieChart className="w-4 h-4" />
                    风险评估分布
                  </h3>
                  <div className="space-y-2">
                    {(stats?.riskAssessment || []).map((item, idx) => {
                      const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-red-500', 'bg-red-700'];
                      const maxAmount = stats?.totalPastdueAmount || 1;
                      const pct = Math.max(5, (item.overdueAmount / maxAmount) * 100);
                      return (
                        <div key={item.riskLevel} className="flex items-center gap-3">
                          <span className="w-16 text-sm text-slate-600">{item.riskLevel}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                            <div
                              className={`${colors[idx] || 'bg-slate-400'} h-full rounded-full flex items-center justify-end pr-2 transition-all`}
                              style={{ width: `${pct}%` }}
                            >
                              <span className="text-xs text-white font-medium">{item.loanCount}笔</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    临近到期分布
                  </h3>
                  <div className="space-y-2">
                    {(stats?.approachingMaturity || []).map((item) => {
                      const totalAmt = item.cnyAmount + item.usdAmount;
                      const maxAmt = stats?.approachingMaturityAmount || 1;
                      return (
                      <div key={item.daysRange} className="flex items-center gap-3">
                        <span className="w-16 text-sm text-slate-600">{item.daysRange}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${Math.max(5, (totalAmt / maxAmt) * 100)}%` }}
                          >
                            <span className="text-xs text-white font-medium">
                              {formatCurrency(totalAmt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ============ 汇丰案件列表 ============ */}
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
                      {visibleColumns.includes('loanReference') && <TableHead className="w-[140px]">贷款编号</TableHead>}
                      {visibleColumns.includes('merchantId') && <TableHead>商户ID</TableHead>}
                      {visibleColumns.includes('borrowerName') && <TableHead className="w-[250px]">借款人名称</TableHead>}
                      {visibleColumns.includes('loanCurrency') && <TableHead className="text-center">币种</TableHead>}
                      {visibleColumns.includes('loanStartDate') && <TableHead className="text-center">贷款日期</TableHead>}
                      {visibleColumns.includes('maturityDate') && <TableHead className="text-center">到期日</TableHead>}
                      {visibleColumns.includes('loanAmount') && <TableHead className="text-right">贷款金额</TableHead>}
                      {visibleColumns.includes('balance') && <TableHead className="text-right">余额</TableHead>}
                      {visibleColumns.includes('pastdueAmount') && <TableHead className="text-right">逾期金额</TableHead>}
                      {visibleColumns.includes('totalRepaid') && <TableHead className="text-right">已还款总额</TableHead>}
                      {visibleColumns.includes('status') && <TableHead className="text-center">状态</TableHead>}
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
                            {formatCurrency(loan.balance, loan.loanCurrency)}
                          </TableCell>
                        )}
                        {visibleColumns.includes('pastdueAmount') && (
                          <TableCell className={`text-right font-mono tabular-nums ${calcPastdueAmount(loan) > 0 ? 'text-red-600 font-semibold' : ''}`}>
                            {formatCurrency(calcPastdueAmount(loan), loan.loanCurrency)}
                          </TableCell>
                        )}
                        {visibleColumns.includes('totalRepaid') && (
                          <TableCell className="text-right font-mono tabular-nums text-blue-600">
                            {formatCurrency(calcTotalRepaid(loan), loan.loanCurrency)}
                          </TableCell>
                        )}
                        {visibleColumns.includes('status') && (
                          <TableCell className="text-center">
                            {calcPastdueAmount(loan) > 0 ? (
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
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-slate-500">
                    共 {filteredLoans.length} 条，第 {currentPage} / {totalPages} 页
                  </span>
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
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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
                    <div className="font-mono">{formatCurrency(selectedLoan.balance, selectedLoan.loanCurrency)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">逾期金额</div>
                    <div className={`font-mono font-semibold ${selectedLoan.pastdueAmount > 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(selectedLoan.pastdueAmount, selectedLoan.loanCurrency)}
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
