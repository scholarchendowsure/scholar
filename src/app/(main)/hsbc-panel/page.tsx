'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { formatCurrency } from '@/lib/constants';
import { calcPastdueAmount, calcBalance, calcOverdueDays, calcDaysToMaturity, calcTotalRepaid, HSBCLoan } from '@/lib/hsbc-loan';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer, LabelList } from 'recharts';
import {
  LayoutDashboard, FileSpreadsheet, Upload, ChevronDown, ChevronUp, Building2, Wallet, AlertTriangle,
  TrendingUp, DollarSign, CreditCard, Calendar as CalendarIcon, Percent, Search, Eye, RefreshCw, X,
  CheckCircle, Clock, FileText, BarChart3, PieChart, Columns, ArrowUpDown, ArrowUp, ArrowDown,
  Loader2, Send, CheckCircle2, AlertCircle, Download, Coins
} from 'lucide-react';

const USD_TO_CNY_RATE = 7;

interface HSBCStats {
  totalLoans: number;
  activeMerchants: number;
  totalLoanAmount: number;
  totalBalance: number;
  totalBalanceUSD: number;
  totalBalanceLoanCount: number;
  totalBalanceMerchantCount: number;
  totalPastdueAmount: number;
  totalPastdueAmountUSD: number;
  overdueRate: number;
  overdueMerchantRate: number;
  warningAmount: number;
  warningAmountUSD: number;
  approachingMaturityAmount: number;
  overdueByDays: {
    over0Days: { amount: number; rate: number; amountUSD: number; loanCount: number; merchantCount: number };
    over30Days: { amount: number; rate: number; amountUSD: number; loanCount: number; merchantCount: number };
    over90Days: { amount: number; rate: number; amountUSD: number; loanCount: number; merchantCount: number };
  };
  warningInfo: {
    amount: number;
    amountUSD: number;
    loanCount: number;
    merchantCount: number;
  };
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

interface RepaymentStats {
  availableMonths: string[];
  currentMonth: string;
  stats: {
    ontimeRepayment: {
      amountUSD: number;
      amountCNY: number;
      amountUSDWan: string;
      amountCNYWan: string;
      totalAmountCNY: number;
      totalAmountUSD: number;
      totalAmountCNYWan: string;
      totalAmountUSDWan: string;
      count: number;
      loanCount: number;
      loanReferences?: string[];
    };
    overdueRepayment: {
      amountUSD: number;
      amountCNY: number;
      amountUSDWan: string;
      amountCNYWan: string;
      totalAmountCNY: number;
      totalAmountUSD: number;
      totalAmountCNYWan: string;
      totalAmountUSDWan: string;
      count: number;
      loanCount: number;
      loanReferences?: string[];
    };
    totalRepayment: {
      amountUSD: number;
      amountCNY: number;
      amountUSDWan: string;
      amountCNYWan: string;
      totalAmountCNY: number;
      totalAmountUSD: number;
      totalAmountCNYWan: string;
      totalAmountUSDWan: string;
      loanReferences?: string[];
    };
  } | null;
  totalLoans: number;
  loansWithRepayment: number;
}

interface CustomWarningMerchant {
  id: string;
  name: string;
  addedAt: string;
}

const ALL_COLUMNS = [
  { key: 'loanReference', label: '贷款编号' },
  { key: 'merchantId', label: '商户ID' },
  { key: 'salesName', label: '销售' },
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

const DEFAULT_VISIBLE_COLUMNS = ALL_COLUMNS.map(col => col.key);

export default function HSBCPanelPage() {
  const [loans, setLoans] = useState<HSBCLoan[]>([]);
  const [allLoans, setAllLoans] = useState<HSBCLoan[]>([]);
  const [stats, setStats] = useState<HSBCStats | null>(null);
  const [repaymentStats, setRepaymentStats] = useState<RepaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dashboard: true,
    loans: false,
    upload: false,
    warningMerchants: false,
  });
  const [expandedCardRows, setExpandedCardRows] = useState<Record<string, boolean>>({
    row1: true,
    row2: true,
    row3: true,
    row4: true,
    row5: true,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [overdueThreshold, setOverdueThreshold] = useState<number>(0);
  const [chartCurrency, setChartCurrency] = useState<'CNY' | 'USD'>('CNY');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedLoan, setSelectedLoan] = useState<HSBCLoan | null>(null);

  const [uploadMode, setUploadMode] = useState<'replace' | 'merge'>('replace');
  const [importPreview, setImportPreview] = useState<HSBCLoan[]>([]);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importBatchDate, setImportBatchDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedBatchDate, setSelectedBatchDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hsbc_selected_batch_date');
      return saved || '';
    }
    return '';
  });
  const [availableBatchDates, setAvailableBatchDates] = useState<string[]>([]);
  const [filePassword, setFilePassword] = useState<string>('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [dashboardCurrency, setDashboardCurrency] = useState<'CNY' | 'USD' | 'ALL'>('CNY');
  const [selectedCalcDate, setSelectedCalcDate] = useState<string>('2026-04-29');
  const [merchantSalesMappings, setMerchantSalesMappings] = useState<any[]>([]);

  const [reminderDays, setReminderDays] = useState<number>(3);
  const [scheduledReminderEnabled, setScheduledReminderEnabled] = useState<boolean>(false);
  const [sendingReminder, setSendingReminder] = useState<boolean>(false);
  const [showReminderSuccess, setShowReminderSuccess] = useState<boolean>(false);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [selectedRepaymentMonth, setSelectedRepaymentMonth] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<string>('');
  const [activeRepaymentCard, setActiveRepaymentCard] = useState<string | null>(null);
  const [filteredLoanReferences, setFilteredLoanReferences] = useState<string[] | null>(null);
  const [deduplicateMerchant, setDeduplicateMerchant] = useState(false);
  const [activeCardFilter, setActiveCardFilter] = useState<string | null>(null);
  const casesListRef = useRef<HTMLDivElement>(null);
  const [customWarningMerchants, setCustomWarningMerchants] = useState<CustomWarningMerchant[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hsbc_custom_warning_merchants');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [warningMerchantInput, setWarningMerchantInput] = useState('');
  const initialLoadRef = useRef(true);

  const toggleCardRow = useCallback((rowKey: string) => {
    setExpandedCardRows(prev => ({
      ...prev,
      [rowKey]: !prev[rowKey]
    }));
  }, []);

  const toggleColumn = useCallback((columnKey: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(k => k !== columnKey)
        : [...prev, columnKey]
    );
  }, []);

  const resetColumns = useCallback(() => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
  }, []);

  const handleMonthChange = useCallback(async (month: string) => {
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
  }, [selectedBatchDate]);

  const handleRepaymentCardClick = useCallback((type: 'ontime' | 'overdue' | 'total') => {
    if (activeRepaymentCard === type) {
      setActiveRepaymentCard(null);
      setFilteredLoanReferences(null);
    } else {
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
    setActiveCardFilter(null);
    setTimeout(() => {
      casesListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    setCurrentPage(1);
  }, [activeRepaymentCard, repaymentStats]);

  const parseMerchantIds = useCallback((input: string): string[] => {
    return input.trim()
      .split(/\s+/)
      .map(id => id.trim())
      .filter(id => id.length > 0);
  }, []);

  const addWarningMerchants = useCallback(() => {
    const merchantIds = parseMerchantIds(warningMerchantInput);
    if (merchantIds.length === 0) {
      return;
    }

    const newMerchants: CustomWarningMerchant[] = [...customWarningMerchants];
    
    merchantIds.forEach(merchantId => {
      const merchant = loans.find(l => l.merchantId === merchantId);
      const merchantName = merchant?.borrowerName || '未知商户';
      
      if (!newMerchants.find(m => m.id === merchantId)) {
        newMerchants.push({
          id: merchantId,
          name: merchantName,
          addedAt: new Date().toISOString()
        });
      }
    });
    
    setCustomWarningMerchants(newMerchants);
    localStorage.setItem('hsbc_custom_warning_merchants', JSON.stringify(newMerchants));
    setWarningMerchantInput('');
  }, [warningMerchantInput, customWarningMerchants, loans, parseMerchantIds]);

  const removeWarningMerchant = useCallback((merchantId: string) => {
    const newMerchants = customWarningMerchants.filter(m => m.id !== merchantId);
    setCustomWarningMerchants(newMerchants);
    localStorage.setItem('hsbc_custom_warning_merchants', JSON.stringify(newMerchants));
  }, [customWarningMerchants]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const getFilterLabel = useCallback((filter: string): string => {
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
  }, []);

  const handleCardClick = useCallback((filterType: string) => {
    if (activeCardFilter === filterType) {
      setActiveCardFilter(null);
    } else {
      setActiveCardFilter(filterType);
    }
    setActiveRepaymentCard(null);
    setFilteredLoanReferences(null);
    setTimeout(() => {
      casesListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    setCurrentPage(1);
  }, [activeCardFilter]);

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  }, [sortField, sortOrder]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const datesRes = await fetch('/api/hsbc/batch-dates');
      let dates: string[] = [];
      if (datesRes.ok) {
        const datesData = await datesRes.json();
        dates = datesData.data || [];
        setAvailableBatchDates(dates);
      }

      const allLoansRes = await fetch('/api/hsbc/loans?includeAll=true&pageSize=999999');
      if (allLoansRes.ok) {
        const allLoansData = await allLoansRes.json();
        setAllLoans(allLoansData.data || []);
      }

      if (dates.length > 0) {
        const latestDate = dates[0];
        setSelectedBatchDate(latestDate);
        const loansRes = await fetch(`/api/hsbc/loans?batchDate=${encodeURIComponent(latestDate)}&pageSize=99999`);
        if (loansRes.ok) {
          const loansData = await loansRes.json();
          setLoans(loansData.data || []);
        }
        const statsRes = await fetch(`/api/hsbc/stats?batchDate=${encodeURIComponent(latestDate)}&calcDate=${encodeURIComponent(selectedCalcDate)}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.data || null);
        }
        const repaymentStatsRes = await fetch(`/api/hsbc/repayment-stats?batchDate=${encodeURIComponent(latestDate)}`);
        if (repaymentStatsRes.ok) {
          const repaymentStatsData = await repaymentStatsRes.json();
          setRepaymentStats(repaymentStatsData.data || null);
        }
      } else {
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
  }, [selectedCalcDate]);

  const fetchBatchDates = useCallback(async () => {
    try {
      const response = await fetch('/api/hsbc/batch-dates');
      if (response.ok) {
        const data = await response.json();
        setAvailableBatchDates(data.data || []);
      }
    } catch (err) {
      console.error('获取批次日期失败:', err);
    }
  }, []);

  const loadLoansByBatchDate = useCallback(async (batchDate: string) => {
    try {
      const response = await fetch(`/api/hsbc/loans?batchDate=${encodeURIComponent(batchDate)}&pageSize=99999`);
      if (response.ok) {
        const data = await response.json();
        setLoans(data.data || []);
        const statsResponse = await fetch(`/api/hsbc/stats?batchDate=${encodeURIComponent(batchDate)}&calcDate=${encodeURIComponent(selectedCalcDate)}`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData.data || null);
        }
        const repaymentStatsRes = await fetch(`/api/hsbc/repayment-stats?batchDate=${encodeURIComponent(batchDate)}`);
        if (repaymentStatsRes.ok) {
          const repaymentStatsData = await repaymentStatsRes.json();
          setRepaymentStats(repaymentStatsData.data || null);
        }
      }
    } catch (err) {
      console.error('按日期加载数据失败:', err);
    }
  }, [selectedCalcDate]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      const input = document.createElement('input');
      input.type = 'file';
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      handleFileUpload({ target: input } as unknown as React.ChangeEvent<HTMLInputElement>);
    } else {
      toast.error('请上传 Excel 或 CSV 文件');
    }
  }, [handleFileUpload]);

  const confirmImport = useCallback(async () => {
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

      await loadData();
      setSelectedBatchDate(importBatchDate);
      await fetchBatchDates();
      setShowImportConfirm(false);
      setImportPreview([]);
      toast.success(`成功导入 ${importPreview.length} 条数据（批次日期: ${importBatchDate}）`);
    } catch (err) {
      console.error('导入错误:', err);
      toast.error('导入失败，请重试');
    }
  }, [importPreview, importBatchDate, uploadMode, loadData, fetchBatchDates]);

  const handleDeleteBatch = useCallback((batchDate: string) => {
    setBatchToDelete(batchDate);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeleteBatch = useCallback(async () => {
    try {
      const response = await fetch(`/api/hsbc/delete-batch?batchDate=${encodeURIComponent(batchToDelete)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '删除失败');
      }

      setSelectedBatchDate('');
      await loadData();
      await fetchBatchDates();
      setShowDeleteConfirm(false);
      setBatchToDelete('');
      toast.success('删除成功');
    } catch (err) {
      console.error('删除错误:', err);
      toast.error(err instanceof Error ? err.message : '删除失败，请重试');
    }
  }, [batchToDelete, loadData, fetchBatchDates]);

  const handleSendFeishuReminder = useCallback(async () => {
    if (!selectedBatchDate) {
      toast.error('请先选择批次日期');
      return;
    }
    setSendingReminder(true);
    try {
      const response = await fetch('/api/feishu-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchDate: selectedBatchDate,
          days: reminderDays,
          calcDate: selectedCalcDate,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '发送提醒失败');
      }
      setShowReminderSuccess(true);
      setTimeout(() => setShowReminderSuccess(false), 3000);
      toast.success('提醒发送成功');
    } catch (err) {
      console.error('发送飞书提醒错误:', err);
      toast.error(err instanceof Error ? err.message : '发送提醒失败，请重试');
    } finally {
      setSendingReminder(false);
    }
  }, [selectedBatchDate, reminderDays, selectedCalcDate]);

  const downloadTemplate = useCallback(() => {
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    fetchBatchDates();
  }, [fetchBatchDates]);

  useEffect(() => {
    const loadMerchantSalesMappings = async () => {
      try {
        const response = await fetch('/api/merchant-sales-mappings');
        if (response.ok) {
          const data = await response.json();
          setMerchantSalesMappings(data.mappings || []);
        }
      } catch (err) {
        console.error('加载商户-销售映射关系失败:', err);
      }
    };
    loadMerchantSalesMappings();
  }, []);

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    if (selectedBatchDate) {
      loadLoansByBatchDate(selectedBatchDate);
    }
  }, [selectedBatchDate, selectedCalcDate, loadLoansByBatchDate]);

  const filteredLoansBeforeDedupe = useMemo(() => {
    return loans.filter((loan: HSBCLoan) => {
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

      let matchCardFilter = true;
      const today = new Date().toISOString().slice(0, 10);
      const maturityDate = loan.maturityDate;
      const balance = calcBalance(loan);
      const pastdueAmount = calcPastdueAmount(loan);
      
      if (activeCardFilter) {
        switch (activeCardFilter) {
          case 'totalBalance':
            matchCardFilter = balance > 0;
            break;
          case 'overdue0':
            matchCardFilter = pastdueAmount > 0;
            break;
          case 'overdue30':
            const overdueDays0 = calcOverdueDays(loan);
            matchCardFilter = overdueDays0 >= 30 && pastdueAmount > 0;
            break;
          case 'overdue90':
            const overdueDays30 = calcOverdueDays(loan);
            matchCardFilter = overdueDays30 >= 90 && pastdueAmount > 0;
            break;
          case 'warning':
            const overdueMerchantIds = new Set<string>();
            loans.forEach(l => {
              if (calcPastdueAmount(l) > 0) {
                overdueMerchantIds.add(l.merchantId);
              }
            });
            const customWarningMerchantIds = new Set(
              customWarningMerchants.map(m => m.id)
            );
            const isOverdueMerchant = overdueMerchantIds.has(loan.merchantId);
            const isLoanOverdue = calcPastdueAmount(loan) > 0;
            const isCustomWarningMerchant = customWarningMerchantIds.has(loan.merchantId);
            const cutoffDate = new Date(selectedCalcDate);
            const maturityDateObj = new Date(loan.maturityDate);
            const isLoanUnmatured = maturityDateObj >= cutoffDate && balance > 0.9;
            
            matchCardFilter = (isOverdueMerchant && !isLoanOverdue && isLoanUnmatured) || 
                              (isCustomWarningMerchant && isLoanUnmatured);
            break;
          case 'due3':
            const days3 = calcDaysToMaturity(loan, new Date(selectedCalcDate));
            matchCardFilter = days3 >= 0 && days3 <= 3;
            break;
          case 'due7':
            const days7 = calcDaysToMaturity(loan, new Date(selectedCalcDate));
            matchCardFilter = days7 >= 0 && days7 <= 7;
            break;
          case 'due15':
            const days15 = calcDaysToMaturity(loan, new Date(selectedCalcDate));
            matchCardFilter = days15 >= 0 && days15 <= 15;
            break;
          case 'due30':
            const days30 = calcDaysToMaturity(loan, new Date(selectedCalcDate));
            matchCardFilter = days30 >= 0 && days30 <= 30;
            break;
          case 'due45':
            const days45 = calcDaysToMaturity(loan, new Date(selectedCalcDate));
            matchCardFilter = days45 >= 0 && days45 <= 45;
            break;
          default:
            matchCardFilter = true;
        }
      }
      
      const matchRepaymentFilter = !filteredLoanReferences || filteredLoanReferences.length === 0 || 
        filteredLoanReferences.includes(loan.loanReference);
      
      const matchDeduplicateFilter = !activeRepaymentCard || 
        (activeRepaymentCard === 'ontime' && loan.loanReference !== 'dummy') ||
        (activeRepaymentCard === 'overdue' && loan.loanReference !== 'dummy') ||
        (activeRepaymentCard === 'total' && loan.loanReference !== 'dummy');
      
      return matchSearch && matchCurrency && matchStatus && matchCardFilter && matchRepaymentFilter && matchDeduplicateFilter;
    });
  }, [loans, searchTerm, currencyFilter, statusFilter, activeCardFilter, filteredLoanReferences, activeRepaymentCard, customWarningMerchants, selectedCalcDate]);

  const warningStats = useMemo(() => {
    const overdueMerchantIds = new Set<string>();
    loans.forEach(l => {
      if (calcPastdueAmount(l) > 0) {
        overdueMerchantIds.add(l.merchantId);
      }
    });
    
    const customWarningMerchantIds = new Set(
      customWarningMerchants.map(m => m.id)
    );
    
    let amountCNY = 0;
    let amountUSD = 0;
    let loanCount = 0;
    const merchantSet = new Set<string>();
    const cutoffDate = new Date(selectedCalcDate);
    
    loans.forEach(loan => {
      const balance = calcBalance(loan);
      const maturityDate = new Date(loan.maturityDate);
      const isOverdueMerchant = overdueMerchantIds.has(loan.merchantId);
      const isLoanOverdue = calcPastdueAmount(loan) > 0;
      const isCustomWarningMerchant = customWarningMerchantIds.has(loan.merchantId);
      const isLoanUnmatured = maturityDate >= cutoffDate && balance > 0.9;
      
      if ((isOverdueMerchant && !isLoanOverdue && isLoanUnmatured) || 
          (isCustomWarningMerchant && isLoanUnmatured)) {
        if (loan.loanCurrency === 'CNY') {
          amountCNY += balance;
          amountUSD += balance / 7;
        } else {
          amountCNY += balance * 7;
          amountUSD += balance;
        }
        loanCount++;
        merchantSet.add(loan.merchantId);
      }
    });
    
    return {
      amountCNY,
      amountUSD,
      loanCount,
      merchantCount: merchantSet.size
    };
  }, [loans, customWarningMerchants, selectedCalcDate]);

  const deduplicatedLoans = useMemo(() => {
    if (!deduplicateMerchant) return filteredLoansBeforeDedupe;
    
    const batchDateFiltered = filteredLoansBeforeDedupe.filter(loan => loan.batchDate === selectedBatchDate);
    
    const seenRefs = new Set<string>();
    const uniqueFilteredLoans = batchDateFiltered.filter(loan => {
      if (!loan.loanReference) return true;
      if (seenRefs.has(loan.loanReference)) {
        return false;
      }
      seenRefs.add(loan.loanReference);
      return true;
    });
    
    const map = new Map<string, {
      loan: HSBCLoan;
      allRepaymentSchedules: HSBCLoan['repaymentSchedule'];
      earliestMaturityDate: string;
    }>();
    
    uniqueFilteredLoans.forEach(loan => {
      if (!map.has(loan.merchantId)) {
        map.set(loan.merchantId, {
          loan: { ...loan },
          allRepaymentSchedules: [...(loan.repaymentSchedule || [])],
          earliestMaturityDate: loan.maturityDate,
        });
      } else {
        const existing = map.get(loan.merchantId)!;
        existing.allRepaymentSchedules = [
          ...existing.allRepaymentSchedules,
          ...(loan.repaymentSchedule || [])
        ];
      }
    });
    
    return Array.from(map.values()).map(item => {
      const merchantLoans = uniqueFilteredLoans.filter(l => l.merchantId === item.loan.merchantId);
      
      const totalLoanAmount = merchantLoans.reduce((sum, l) => sum + l.loanAmount, 0);
      const totalRepaid = merchantLoans.reduce((sum, l) => sum + (l.totalRepaid || 0), 0);
      const balance = Math.max(0, totalLoanAmount - totalRepaid);
      const totalPastdueAmount = merchantLoans.reduce((sum, l) => {
        const loanPastdue = l.pastdueAmount !== undefined && l.pastdueAmount !== null ? Number(l.pastdueAmount) : 0;
        return sum + loanPastdue;
      }, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const validMaturityDates: string[] = [];
      merchantLoans.forEach(loan => {
        const loanBalance = calcBalance(loan);
        if (loanBalance > 0) {
          validMaturityDates.push(loan.maturityDate);
        }
      });
      
      let finalMaturityDate: string;
      if (validMaturityDates.length > 0) {
        validMaturityDates.sort((a, b) => {
          const dateA = new Date(a);
          const dateB = new Date(b);
          const diffA = Math.abs(dateA.getTime() - today.getTime());
          const diffB = Math.abs(dateB.getTime() - today.getTime());
          return diffA - diffB;
        });
        finalMaturityDate = validMaturityDates[0];
      } else {
        finalMaturityDate = item.earliestMaturityDate;
      }
      
      const batchDate = new Date(selectedCalcDate);
      const maturityDate = new Date(finalMaturityDate);
      
      let overdueDays = -1;
      if (finalMaturityDate) {
        const diffDays = Math.floor((batchDate.getTime() - maturityDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 0 && balance > 0.9) {
          overdueDays = diffDays;
        }
      }
      
      const pastdueAmount = totalPastdueAmount;
      const status = totalPastdueAmount > 0 ? 'overdue' : 'normal';
      
      const mergedLoan: HSBCLoan = {
        ...item.loan,
        loanAmount: totalLoanAmount,
        totalRepaid: totalRepaid,
        balance: balance,
        pastdueAmount: pastdueAmount,
        overdueDays: overdueDays,
        status: status,
        maturityDate: finalMaturityDate,
        repaymentSchedule: item.allRepaymentSchedules,
      };
      
      return mergedLoan;
    });
  }, [filteredLoansBeforeDedupe, deduplicateMerchant, selectedCalcDate]);

  const filteredLoans = deduplicatedLoans;

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

  const overdueTrendData = useMemo(() => {
    const batchDateMap = new Map<string, { 
      totalAmountCNY: number;
      totalAmountUSD: number;
      overdueAmountCNY: number;
      overdueAmountUSD: number;
      totalCount: number;
      overdueCount: number;
    }>();
    
    allLoans.forEach(loan => {
      const batchDate = loan.batchDate || '未知批次';
      const existing = batchDateMap.get(batchDate) || { 
        totalAmountCNY: 0, 
        totalAmountUSD: 0, 
        overdueAmountCNY: 0, 
        overdueAmountUSD: 0, 
        totalCount: 0,
        overdueCount: 0
      };
      
      const balance = calcBalance(loan);
      let loanAmountCNY = balance;
      let loanAmountUSD = balance;
      if (loan.loanCurrency === 'USD') {
        loanAmountCNY = balance * USD_TO_CNY_RATE;
      } else {
        loanAmountUSD = balance / USD_TO_CNY_RATE;
      }
      
      existing.totalAmountCNY += loanAmountCNY;
      existing.totalAmountUSD += loanAmountUSD;
      
      const overdueAmount = calcPastdueAmount(loan);
      const overdueDays = calcOverdueDays(loan);
      
      if (overdueAmount > 0 && overdueDays > overdueThreshold) {
        let overdueCNY = overdueAmount;
        let overdueUSD = overdueAmount;
        if (loan.loanCurrency === 'USD') {
          overdueCNY = overdueAmount * USD_TO_CNY_RATE;
        } else {
          overdueUSD = overdueAmount / USD_TO_CNY_RATE;
        }
        
        existing.overdueAmountCNY += overdueCNY;
        existing.overdueAmountUSD += overdueUSD;
        existing.overdueCount += 1;
      }
      
      existing.totalCount += 1;
      
      batchDateMap.set(batchDate, existing);
    });
    
    const data = Array.from(batchDateMap.entries())
      .map(([batchDate, stats]) => {
        const overdueAmountCNY = stats.overdueAmountCNY;
        const totalAmountCNY = stats.totalAmountCNY;
        const overdueRate = totalAmountCNY > 0 ? Math.round((overdueAmountCNY / totalAmountCNY * 100) * 100) / 100 : 0;
        return {
          batchDate,
          totalAmount: chartCurrency === 'CNY' ? Math.round(stats.totalAmountCNY / 10000) : Math.round(stats.totalAmountUSD / 10000),
          overdueAmount: chartCurrency === 'CNY' ? Math.round(stats.overdueAmountCNY / 10000) : Math.round(stats.overdueAmountUSD / 10000),
          overdueRate,
        };
      })
      .sort((a, b) => a.batchDate.localeCompare(b.batchDate));
    
    return data;
  }, [allLoans, overdueThreshold, chartCurrency]);

  const statsLoans = filteredLoansBeforeDedupe;
  const usdStats = useMemo(() => statsLoans.reduce(
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
  ), [statsLoans]);

  const cnyStats = useMemo(() => statsLoans.reduce(
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
  ), [statsLoans]);

  const totalPages = Math.ceil(sortedFilteredLoans.length / pageSize);
  const paginatedLoans = sortedFilteredLoans.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">汇丰贷款管理</h1>
          <p className="text-slate-500 text-sm mt-1">管理汇丰银行贷后案件全流程</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-slate-500" />
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
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-slate-500">
                  <span className="font-semibold">汇丰（香港）数据</span>（汇率1USD=7CNY）
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">数据日期计算日:</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          {selectedCalcDate || '选择日期'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                      </PopoverContent>
                    </Popover>
                    {selectedCalcDate && (
                      <Button variant="ghost" size="sm" onClick={() => setSelectedCalcDate('2026-04-29')}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">月份筛选:</span>
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">到期天数:</span>
                    <select
                      value={reminderDays}
                      onChange={(e) => setReminderDays(parseInt(e.target.value))}
                      className="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>1天</option>
                      <option value={2}>2天</option>
                      <option value={3}>3天</option>
                      <option value={4}>4天</option>
                      <option value={5}>5天</option>
                      <option value={7}>7天</option>
                      <option value={15}>15天</option>
                      <option value={30}>30天</option>
                      <option value={45}>45天</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scheduledReminderEnabled}
                        onChange={(e) => setScheduledReminderEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-500">定时提醒</span>
                    </label>
                  </div>
                  <Button 
                    onClick={handleSendFeishuReminder}
                    disabled={sendingReminder}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    {sendingReminder ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        发送中...
                      </>
                    ) : showReminderSuccess ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        发送成功
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        发送飞书提醒
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => toggleCardRow('row1')}
                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                  >
                    {expandedCardRows.row1 ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                  <span className="text-sm text-slate-500">贷款笔数统计</span>
                </div>
                {expandedCardRows.row1 && (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div 
                    className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white transition-all hover:scale-105 hover:shadow-lg"
                  >
                    <div className="text-base font-bold opacity-90 mb-3">汇丰贷款笔数口径</div>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span>在贷贷款笔数: <span className="font-bold">{stats?.totalBalanceLoanCount || 0}笔</span></span>
                        <span>商户数: <span className="font-bold">{stats?.totalBalanceMerchantCount || 0}个</span></span>
                      </div>
                    </div>
                  </div>

                  <div 
                    className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white transition-all hover:scale-105 hover:shadow-lg"
                  >
                    <div className="text-base font-bold opacity-90 mb-3">逾期天数&gt;0天</div>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span>逾期笔数: <span className="font-bold">{stats?.overdueByDays?.over0Days?.loanCount || 0}笔</span></span>
                        <span>商户数: <span className="font-bold">{stats?.overdueByDays?.over0Days?.merchantCount || 0}个</span></span>
                      </div>
                      <div>逾期率: <span className="font-bold">{((stats?.overdueByDays?.over0Days?.loanCount || 0) / (stats?.totalBalanceLoanCount || 1) * 100).toFixed(2)}%</span></div>
                    </div>
                  </div>

                  <div 
                    className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white transition-all hover:scale-105 hover:shadow-lg"
                  >
                    <div className="text-base font-bold opacity-90 mb-3">逾期天数&gt;30天</div>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span>逾期笔数: <span className="font-bold">{stats?.overdueByDays?.over30Days?.loanCount || 0}笔</span></span>
                        <span>商户数: <span className="font-bold">{stats?.overdueByDays?.over30Days?.merchantCount || 0}个</span></span>
                      </div>
                      <div>逾期率: <span className="font-bold">{((stats?.overdueByDays?.over30Days?.loanCount || 0) / (stats?.totalBalanceLoanCount || 1) * 100).toFixed(1)}%</span></div>
                    </div>
                  </div>

                  <div 
                    className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-4 text-white transition-all hover:scale-105 hover:shadow-lg"
                  >
                    <div className="text-base font-bold opacity-90 mb-3">逾期天数&gt;90天</div>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span>逾期笔数: <span className="font-bold">{stats?.overdueByDays?.over90Days?.loanCount || 0}笔</span></span>
                        <span>商户数: <span className="font-bold">{stats?.overdueByDays?.over90Days?.merchantCount || 0}个</span></span>
                      </div>
                      <div>逾期率: <span className="font-bold">{((stats?.overdueByDays?.over90Days?.loanCount || 0) / (stats?.totalBalanceLoanCount || 1) * 100).toFixed(1)}%</span></div>
                    </div>
                  </div>

                  <div 
                    className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white transition-all hover:scale-105 hover:shadow-lg"
                  >
                    <div className="text-base font-bold opacity-90 mb-3">含预警商户</div>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span>未到期笔数: <span className="font-bold">{stats?.warningInfo?.loanCount || 0}笔</span></span>
                        <span>商户数: <span className="font-bold">{stats?.warningInfo?.merchantCount || 0}个</span></span>
                      </div>
                    </div>
                  </div>
                </div>
                )}
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => toggleCardRow('row2')}
                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                  >
                    {expandedCardRows.row2 ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                  <span className="text-sm text-slate-500">核心指标</span>
                </div>
                {expandedCardRows.row2 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div 
                      className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white transition-all hover:scale-105 hover:shadow-lg cursor-pointer"
                      onClick={() => handleCardClick('totalBalance')}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 className="w-5 h-5 opacity-90" />
                        <span className="text-sm font-medium opacity-90">在贷总额</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {dashboardCurrency === 'CNY' 
                          ? formatCurrency(stats?.totalBalance || 0, 'CNY')
                          : dashboardCurrency === 'USD'
                            ? formatCurrency(stats?.totalBalanceUSD || 0, 'USD')
                            : `${formatCurrency(stats?.totalBalanceUSD || 0, 'USD')} / ${formatCurrency(stats?.totalBalance || 0, 'CNY')}`
                        }
                      </div>
                      <div className="text-sm opacity-80 mt-1">
                        {stats?.totalBalanceLoanCount || 0} 笔贷款 / {stats?.totalBalanceMerchantCount || 0} 商户
                      </div>
                    </div>

                    <div 
                      className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white transition-all hover:scale-105 hover:shadow-lg cursor-pointer"
                      onClick={() => handleCardClick('overdue0')}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 opacity-90" />
                        <span className="text-sm font-medium opacity-90">逾期&gt;0天</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {dashboardCurrency === 'CNY' 
                          ? formatCurrency(stats?.totalPastdueAmount || 0, 'CNY')
                          : dashboardCurrency === 'USD'
                            ? formatCurrency(stats?.totalPastdueAmountUSD || 0, 'USD')
                            : `${formatCurrency(stats?.totalPastdueAmountUSD || 0, 'USD')} / ${formatCurrency(stats?.totalPastdueAmount || 0, 'CNY')}`
                        }
                      </div>
                      <div className="text-sm opacity-80 mt-1">
                        逾期率: {((stats?.overdueRate || 0) * 100).toFixed(2)}%
                      </div>
                    </div>

                    <div 
                      className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-4 text-white transition-all hover:scale-105 hover:shadow-lg cursor-pointer"
                      onClick={() => handleCardClick('warning')}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Wallet className="w-5 h-5 opacity-90" />
                        <span className="text-sm font-medium opacity-90">预警金额</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {dashboardCurrency === 'CNY' 
                          ? formatCurrency(warningStats.amountCNY, 'CNY')
                          : dashboardCurrency === 'USD'
                            ? formatCurrency(warningStats.amountUSD, 'USD')
                            : `${formatCurrency(warningStats.amountUSD, 'USD')} / ${formatCurrency(warningStats.amountCNY, 'CNY')}`
                        }
                      </div>
                      <div className="text-sm opacity-80 mt-1">
                        {warningStats.loanCount} 笔贷款 / {warningStats.merchantCount} 商户
                      </div>
                    </div>

                    <div 
                      className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg p-4 text-white transition-all hover:scale-105 hover:shadow-lg"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-5 h-5 opacity-90" />
                        <span className="text-sm font-medium opacity-90">即将到期</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {formatCurrency(stats?.approachingMaturityAmount || 0, 'CNY')}
                      </div>
                      <div className="text-sm opacity-80 mt-1">
                        30天内到期
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
