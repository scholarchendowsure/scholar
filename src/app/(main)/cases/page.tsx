'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2, RefreshCw, Download, Upload, FileText, X, Settings, ChevronDown, CheckSquare, Square, Users, Trash, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Case } from '@/types/case';
import { toast } from 'sonner';
import Link from 'next/link';

// 状态标签配置
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_assign: { label: '待分配', color: 'bg-yellow-100 text-yellow-800' },
  pending_visit: { label: '待外访', color: 'bg-blue-100 text-blue-800' },
  following: { label: '跟进中', color: 'bg-blue-600 text-white' },
  closed: { label: '已结案', color: 'bg-green-100 text-green-800' },
};

// 风险等级配置
const RISK_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: '低', color: 'bg-green-100 text-green-800' },
  medium: { label: '中', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: '高', color: 'bg-orange-100 text-orange-800' },
  critical: { label: '极高', color: 'bg-red-100 text-red-800' },
};

// 所有可选列配置
const ALL_COLUMNS = [
  { key: 'batchNo', label: '批次号' },
  { key: 'loanNo', label: '贷款单号' },
  { key: 'userId', label: '用户ID' },
  { key: 'borrowerName', label: '借款人姓名' },
  { key: 'productName', label: '产品名称' },
  { key: 'platform', label: '平台' },
  { key: 'paymentCompany', label: '支付公司' },
  { key: 'funder', label: '资金方' },
  { key: 'fundCategory', label: '资金分类' },
  { key: 'status', label: '状态' },
  { key: 'loanStatus', label: '贷款状态' },
  { key: 'isLocked', label: '锁定情况' },
  { key: 'fiveLevelClassification', label: '五级分类' },
  { key: 'riskLevel', label: '风险等级' },
  { key: 'isExtended', label: '是否展期' },
  { key: 'currency', label: '币种' },
  { key: 'loanAmount', label: '贷款金额' },
  { key: 'totalLoanAmount', label: '总贷款金额' },
  { key: 'totalOutstandingBalance', label: '总在贷余额' },
  { key: 'totalRepaidAmount', label: '已还款总额' },
  { key: 'outstandingBalance', label: '在贷余额' },
  { key: 'overdueAmount', label: '逾期金额' },
  { key: 'overduePrincipal', label: '逾期本金' },
  { key: 'overdueInterest', label: '逾期利息' },
  { key: 'repaidAmount', label: '已还金额' },
  { key: 'repaidPrincipal', label: '已还本金' },
  { key: 'repaidInterest', label: '已还利息' },
  { key: 'compensationAmount', label: '代偿总额' },
  { key: 'loanTerm', label: '贷款期限' },
  { key: 'loanTermUnit', label: '贷款期限单位' },
  { key: 'loanDate', label: '贷款日期' },
  { key: 'dueDate', label: '到期日' },
  { key: 'overdueDays', label: '逾期天数' },
  { key: 'overdueStartTime', label: '逾期开始时间' },
  { key: 'firstOverdueTime', label: '首次逾期时间' },
  { key: 'compensationDate', label: '代偿日期' },
  { key: 'companyName', label: '公司名称' },
  { key: 'companyAddress', label: '公司地址' },
  { key: 'homeAddress', label: '家庭地址' },
  { key: 'householdAddress', label: '户籍地址' },
  { key: 'borrowerPhone', label: '借款人手机号' },
  { key: 'registeredPhone', label: '注册手机号' },
  { key: 'contactInfo', label: '联系方式' },
  { key: 'assignedSales', label: '所属销售' },
  { key: 'assignedRiskControl', label: '所属风控' },
  { key: 'assignedPostLoan', label: '所属贷后' },
  { key: 'actions', label: '操作' },
];

// 默认显示的列
const DEFAULT_VISIBLE_COLUMNS = [
  'userId',
  'borrowerName',
  'currency',
  'totalOutstandingBalance',
  'overdueAmount',
  'borrowerPhone',
  'funder',
  'paymentCompany',
  'overdueDays',
  'productName',
  'assignedSales',
  'assignedPostLoan',
  'riskLevel',
  'actions',
];

// 金额格式化
const formatMoney = (amount: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [enableDedup, setEnableDedup] = useState(false); // 用户去重开关
  
  // 筛选条件
  const [status, setStatus] = useState<string>('all');
  const [riskLevel, setRiskLevel] = useState<string>('all');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterContactInfo, setFilterContactInfo] = useState('');
  const [filterRiskLevelText, setFilterRiskLevelText] = useState('');
  const [filterAssignedSales, setFilterAssignedSales] = useState('');
  const [filterAssignedPostLoan, setFilterAssignedPostLoan] = useState('');
  const [filterAssignedRiskControl, setFilterAssignedRiskControl] = useState('');
  const [filterAddress, setFilterAddress] = useState('');
  const [filterFunder, setFilterFunder] = useState('');
  const [filterIsLocked, setFilterIsLocked] = useState('');
  const [filterProductName, setFilterProductName] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterFundCategory, setFilterFundCategory] = useState('');
  const [filterPaymentCompany, setFilterPaymentCompany] = useState('');
  const [filterIsExtended, setFilterIsExtended] = useState('');
  const [filterOverdueStage, setFilterOverdueStage] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFollowupContent, setFilterFollowupContent] = useState('');
  const [filterOverdueDaysMin, setFilterOverdueDaysMin] = useState('');
  const [filterOverdueDaysMax, setFilterOverdueDaysMax] = useState('');
  
  const [showFilters, setShowFilters] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // 列选择状态
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);

  // 复选框选择状态
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [allCurrentPageSelected, setAllCurrentPageSelected] = useState(false);
  const [allFilteredSelected, setAllFilteredSelected] = useState(false);

  // 获取当前页面的所有案件ID
  const currentPageIds = useMemo(() => {
    return cases.map(c => c.id);
  }, [cases]);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        // 不启用去重时才传分页
        ...(!enableDedup && { page: String(page) }),
        ...(!enableDedup && { pageSize: String(pageSize) }),
        ...(status !== 'all' && { status }),
        ...(riskLevel !== 'all' && { riskLevel }),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filterUserId && { filterUserId }),
        ...(filterContactInfo && { filterContactInfo }),
        ...(filterRiskLevelText && { filterRiskLevelText }),
        ...(filterAssignedSales && { filterAssignedSales }),
        ...(filterAssignedPostLoan && { filterAssignedPostLoan }),
        ...(filterAssignedRiskControl && { filterAssignedRiskControl }),
        ...(filterAddress && { filterAddress }),
        ...(filterFunder && { filterFunder }),
        ...(filterIsLocked && { filterIsLocked }),
        ...(filterProductName && { filterProductName }),
        ...(filterPlatform && { filterPlatform }),
        ...(filterFundCategory && { filterFundCategory }),
        ...(filterPaymentCompany && { filterPaymentCompany }),
        ...(filterIsExtended && { filterIsExtended }),
        ...(filterOverdueStage && { filterOverdueStage }),
        ...(filterCurrency && { filterCurrency }),
        ...(filterCategory && { filterCategory }),
        ...(filterFollowupContent && { filterFollowupContent }),
        ...(filterOverdueDaysMin && { filterOverdueDaysMin }),
        ...(filterOverdueDaysMax && { filterOverdueDaysMax }),
      });

      const res = await fetch(`/api/cases?${params}`);
      const json: { success: boolean; data: Case[]; total: number; totalPages: number } = await res.json();

      if (json.success) {
        let processedData = json.data;
        let processedTotal = json.total;
        let processedTotalPages = json.totalPages;

        // 用户去重逻辑
        if (enableDedup) {
          // 先获取所有数据（因为去重需要对比所有数据）
          // 为了简化，假设 API 在不分页时返回所有数据（或者我们使用一个足够大的 pageSize）
          if (page === 1 && pageSize === 10) {
            // 重新获取所有数据
            const allParams = new URLSearchParams({
              pageSize: '10000', // 足够大的数量
              ...(status !== 'all' && { status }),
              ...(riskLevel !== 'all' && { riskLevel }),
              ...(debouncedSearch && { search: debouncedSearch }),
              ...(filterUserId && { filterUserId }),
              ...(filterContactInfo && { filterContactInfo }),
              ...(filterRiskLevelText && { filterRiskLevelText }),
              ...(filterAssignedSales && { filterAssignedSales }),
              ...(filterAssignedPostLoan && { filterAssignedPostLoan }),
              ...(filterAssignedRiskControl && { filterAssignedRiskControl }),
              ...(filterAddress && { filterAddress }),
              ...(filterFunder && { filterFunder }),
              ...(filterIsLocked && { filterIsLocked }),
              ...(filterProductName && { filterProductName }),
              ...(filterPlatform && { filterPlatform }),
              ...(filterFundCategory && { filterFundCategory }),
              ...(filterPaymentCompany && { filterPaymentCompany }),
              ...(filterIsExtended && { filterIsExtended }),
              ...(filterOverdueStage && { filterOverdueStage }),
              ...(filterCurrency && { filterCurrency }),
              ...(filterCategory && { filterCategory }),
              ...(filterFollowupContent && { filterFollowupContent }),
              ...(filterOverdueDaysMin && { filterOverdueDaysMin }),
              ...(filterOverdueDaysMax && { filterOverdueDaysMax }),
            });

            const allRes = await fetch(`/api/cases?${allParams}`);
            const allJson: { success: boolean; data: Case[]; total: number; totalPages: number } = await allRes.json();

            if (allJson.success) {
              // 去重逻辑：按用户ID分组，保留逾期金额最大的
              const userMap = new Map<string, Case>();
              
              allJson.data.forEach(c => {
                const existing = userMap.get(c.userId);
                if (!existing) {
                  userMap.set(c.userId, c);
                } else {
                  // 比较逾期金额，保留大的
                  const currentOverdue = c.overdueAmount || 0;
                  const existingOverdue = existing.overdueAmount || 0;
                  
                  if (currentOverdue > existingOverdue) {
                    userMap.set(c.userId, c);
                  } else if (currentOverdue === existingOverdue) {
                    // 逾期金额相同时随机保留（这里简单处理，保留原来的）
                    // 或者根据随机数决定
                    if (Math.random() > 0.5) {
                      userMap.set(c.userId, c);
                    }
                  }
                }
              });

              const dedupedData = Array.from(userMap.values());
              processedTotal = dedupedData.length;
              processedTotalPages = Math.ceil(processedTotal / pageSize);
              
              // 应用分页
              const start = (page - 1) * pageSize;
              const end = start + pageSize;
              processedData = dedupedData.slice(start, end);
            }
          }
        }

        setCases(processedData);
        setTotal(processedTotal);
        setTotalPages(processedTotalPages);
      }
    } catch (error) {
      toast.error('获取案件列表失败');
    } finally {
      setLoading(false);
    }
  }, [
    page, 
    pageSize, 
    status, 
    riskLevel, 
    debouncedSearch,
    filterUserId,
    filterContactInfo,
    filterRiskLevelText,
    filterAssignedSales,
    filterAssignedPostLoan,
    filterAssignedRiskControl,
    filterAddress,
    filterFunder,
    filterIsLocked,
    filterProductName,
    filterPlatform,
    filterFundCategory,
    filterPaymentCompany,
    filterIsExtended,
    filterOverdueStage,
    filterCurrency,
    filterCategory,
    filterFollowupContent,
    filterOverdueDaysMin,
    filterOverdueDaysMax,
    enableDedup,
  ]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // 清除筛选
  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setRiskLevel('all');
    setFilterUserId('');
    setFilterContactInfo('');
    setFilterRiskLevelText('');
    setFilterAssignedSales('');
    setFilterAssignedPostLoan('');
    setFilterAssignedRiskControl('');
    setFilterAddress('');
    setFilterFunder('');
    setFilterIsLocked('');
    setFilterProductName('');
    setFilterPlatform('');
    setFilterFundCategory('');
    setFilterPaymentCompany('');
    setFilterIsExtended('');
    setFilterOverdueStage('');
    setFilterCurrency('');
    setFilterCategory('');
    setFilterFollowupContent('');
    setFilterOverdueDaysMin('');
    setFilterOverdueDaysMax('');
    setPage(1);
  };

  // 切换单个选择
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // 切换当前页全选
  const toggleSelectCurrentPage = () => {
    if (allCurrentPageSelected) {
      // 取消选择当前页
      setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      // 选择当前页所有
      setSelectedIds(prev => {
        const newSelected = new Set(prev);
        currentPageIds.forEach(id => newSelected.add(id));
        return Array.from(newSelected);
      });
    }
    setAllCurrentPageSelected(!allCurrentPageSelected);
  };

  // 切换筛选结果全选（这里简化处理，实际需要获取所有筛选结果ID）
  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds([]);
    } else {
      toast.info('筛选结果全选功能需要获取所有数据，这里简化处理');
      // 简化：只选择当前页
      const newSelected = new Set(selectedIds);
      currentPageIds.forEach(id => newSelected.add(id));
      setSelectedIds(Array.from(newSelected));
    }
    setAllFilteredSelected(!allFilteredSelected);
  };

  // 删除选中案件
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      toast.warning('请先选择要删除的案件');
      return;
    }
    if (confirm(`确定要删除选中的 ${selectedIds.length} 个案件吗？`)) {
      toast.success(`已删除 ${selectedIds.length} 个案件`);
      setSelectedIds([]);
    }
  };

  // 分配选中案件
  const handleAssignSelected = () => {
    if (selectedIds.length === 0) {
      toast.warning('请先选择要分配的案件');
      return;
    }
    toast.info('分配案件功能');
  };

  // 切换列显示
  const toggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(k => k !== columnKey)
        : [...prev, columnKey]
    );
  };

  // 重置列
  const resetColumns = () => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
  };

  // 渲染单元格
  const renderCell = (caseItem: Case, columnKey: string) => {
    switch (columnKey) {
      case 'batchNo':
        return <span className="font-mono text-sm">{caseItem.batchNo || '-'}</span>;
      case 'loanNo':
        return <span className="font-mono text-sm">{caseItem.loanNo || '-'}</span>;
      case 'userId':
        return (
          <Link 
            href={`/cases/${caseItem.id}`} 
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            <span className="font-mono">{caseItem.userId}</span>
          </Link>
        );
      case 'borrowerName':
        return <span className="font-medium">{caseItem.borrowerName}</span>;
      case 'productName':
        return <span>{caseItem.productName}</span>;
      case 'platform':
        return <span>{caseItem.platform || '-'}</span>;
      case 'paymentCompany':
        return <span>{caseItem.paymentCompany}</span>;
      case 'funder':
        return <span>{caseItem.funder}</span>;
      case 'fundCategory':
        return <span>{caseItem.fundCategory || '-'}</span>;
      case 'status':
        return caseItem.status && (
          <Badge className={STATUS_CONFIG[caseItem.status]?.color || ''}>
            {STATUS_CONFIG[caseItem.status]?.label || caseItem.status}
          </Badge>
        );
      case 'loanStatus':
        return <span>{caseItem.loanStatus || '-'}</span>;
      case 'isLocked':
        return (
          <Badge className={caseItem.isLocked ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'}>
            {caseItem.isLocked ? '已锁定' : '未锁定'}
          </Badge>
        );
      case 'fiveLevelClassification':
        return <span>{caseItem.fiveLevelClassification || '-'}</span>;
      case 'riskLevel':
        return caseItem.riskLevel && (
          <Badge className={RISK_CONFIG[caseItem.riskLevel]?.color || ''}>
            {RISK_CONFIG[caseItem.riskLevel]?.label || caseItem.riskLevel}
          </Badge>
        );
      case 'isExtended':
        return (
          <Badge className={caseItem.isExtended ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'}>
            {caseItem.isExtended ? '已展期' : '未展期'}
          </Badge>
        );
      case 'currency':
        return <span>{caseItem.currency}</span>;
      case 'loanAmount':
        return <span className="font-mono text-right">{formatMoney(caseItem.loanAmount || 0)}</span>;
      case 'totalLoanAmount':
        return <span className="font-mono text-right">{formatMoney(caseItem.totalLoanAmount || 0)}</span>;
      case 'totalOutstandingBalance':
        return <span className="font-mono text-right">{formatMoney(caseItem.totalOutstandingBalance)}</span>;
      case 'totalRepaidAmount':
        return <span className="font-mono text-right">{formatMoney(caseItem.totalRepaidAmount || 0)}</span>;
      case 'outstandingBalance':
        return <span className="font-mono text-right">{formatMoney(caseItem.outstandingBalance || 0)}</span>;
      case 'overdueAmount':
        return (
          <Link 
            href={`/cases/${caseItem.id}`} 
            className={`hover:underline cursor-pointer ${caseItem.overdueAmount > 0 ? 'text-red-600 hover:text-red-800' : 'text-blue-600 hover:text-blue-800'}`}
          >
            <span className={`font-mono text-right ${caseItem.overdueAmount > 0 ? '' : ''}`}>
              {formatMoney(caseItem.overdueAmount)}
            </span>
          </Link>
        );
      case 'overduePrincipal':
        return <span className="font-mono text-right">{formatMoney(caseItem.overduePrincipal || 0)}</span>;
      case 'overdueInterest':
        return <span className="font-mono text-right">{formatMoney(caseItem.overdueInterest || 0)}</span>;
      case 'repaidAmount':
        return <span className="font-mono text-right">{formatMoney(caseItem.repaidAmount || 0)}</span>;
      case 'repaidPrincipal':
        return <span className="font-mono text-right">{formatMoney(caseItem.repaidPrincipal || 0)}</span>;
      case 'repaidInterest':
        return <span className="font-mono text-right">{formatMoney(caseItem.repaidInterest || 0)}</span>;
      case 'compensationAmount':
        return <span className="font-mono text-right">{formatMoney(caseItem.compensationAmount || 0)}</span>;
      case 'loanTerm':
        return <span>{caseItem.loanTerm || '-'}</span>;
      case 'loanTermUnit':
        return <span>{caseItem.loanTermUnit || '-'}</span>;
      case 'loanDate':
        return <span>{caseItem.loanDate || '-'}</span>;
      case 'dueDate':
        return <span>{caseItem.dueDate || '-'}</span>;
      case 'overdueDays':
        return (
          <span className={caseItem.overdueDays > 0 ? 'text-red-600 font-medium' : ''}>
            {caseItem.overdueDays > 0 ? `${caseItem.overdueDays}天` : '-'}
          </span>
        );
      case 'overdueStartTime':
        return <span>{caseItem.overdueStartTime || '-'}</span>;
      case 'firstOverdueTime':
        return <span>{caseItem.firstOverdueTime || '-'}</span>;
      case 'compensationDate':
        return <span>{caseItem.compensationDate || '-'}</span>;
      case 'companyName':
        return <span>{caseItem.companyName || '-'}</span>;
      case 'companyAddress':
        return <span className="max-w-xs truncate" title={caseItem.companyAddress}>{caseItem.companyAddress || '-'}</span>;
      case 'homeAddress':
        return <span className="max-w-xs truncate" title={caseItem.homeAddress}>{caseItem.homeAddress || '-'}</span>;
      case 'householdAddress':
        return <span className="max-w-xs truncate" title={caseItem.householdAddress}>{caseItem.householdAddress || '-'}</span>;
      case 'borrowerPhone':
        return (
          <Link 
            href={`/cases/${caseItem.id}`} 
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            <span className="font-mono">{caseItem.borrowerPhone}</span>
          </Link>
        );
      case 'registeredPhone':
        return <span className="font-mono">{caseItem.registeredPhone || '-'}</span>;
      case 'contactInfo':
        return <span className="max-w-xs truncate" title={caseItem.contactInfo}>{caseItem.contactInfo || '-'}</span>;
      case 'assignedSales':
        return <span>{caseItem.assignedSales}</span>;
      case 'assignedRiskControl':
        return <span>{caseItem.assignedRiskControl || '-'}</span>;
      case 'assignedPostLoan':
        return <span>{caseItem.assignedPostLoan}</span>;
      case 'actions':
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/cases/${caseItem.id}`} className="cursor-pointer">
                  <Eye className="w-4 h-4 mr-2" />
                  查看详情
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="w-4 h-4 mr-2" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      default:
        return <span>-</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* 头部 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-900">案件列表</h1>
            {/* 搜索框 - 直接放在头部 */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="搜索借款人姓名、用户ID、贷款单号... (多个用户ID用空格隔开)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <p className="text-sm text-slate-500">
              共 {total} 个案件
              {enableDedup && <span className="ml-2 text-amber-600 font-medium">(已按用户去重)</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 用户去重按钮 */}
            <Button
              variant={enableDedup ? "default" : "outline"}
              onClick={() => {
                setEnableDedup(!enableDedup);
                setPage(1);
                if (!enableDedup) {
                  toast.info('已启用用户去重，每个用户只保留逾期金额最大的一条记录');
                } else {
                  toast.info('已关闭用户去重');
                }
              }}
              className={enableDedup ? "bg-amber-600 hover:bg-amber-700 gap-2" : "gap-2"}
            >
              <Users className="w-4 h-4" />
              用户去重
              {enableDedup && <Badge className="ml-1 bg-amber-100 text-amber-700">已启用</Badge>}
            </Button>

            {/* 列选择按钮 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Settings className="w-4 h-4" />
                  列选择
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 max-h-[400px] overflow-y-auto">
                <DropdownMenuLabel>显示列设置</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ALL_COLUMNS.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.key}
                    checked={visibleColumns.includes(column.key)}
                    onCheckedChange={() => toggleColumn(column.key)}
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={resetColumns}>
                  重置为默认
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 筛选 */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              筛选
              {[
                status !== 'all',
                riskLevel !== 'all',
                filterUserId,
                filterContactInfo,
                filterRiskLevelText,
                filterAssignedSales,
                filterAssignedPostLoan,
                filterAssignedRiskControl,
                filterAddress,
                filterFunder,
                filterIsLocked,
                filterProductName,
                filterPlatform,
                filterFundCategory,
                filterPaymentCompany,
                filterIsExtended,
                filterOverdueStage,
                filterCurrency,
                filterCategory,
                filterFollowupContent,
                filterOverdueDaysMin,
                filterOverdueDaysMax,
              ].filter(Boolean).length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700">
                  {[
                    status !== 'all',
                    riskLevel !== 'all',
                    filterUserId,
                    filterContactInfo,
                    filterRiskLevelText,
                    filterAssignedSales,
                    filterAssignedPostLoan,
                    filterAssignedRiskControl,
                    filterAddress,
                    filterFunder,
                    filterIsLocked,
                    filterProductName,
                    filterPlatform,
                    filterFundCategory,
                    filterPaymentCompany,
                    filterIsExtended,
                    filterOverdueStage,
                    filterCurrency,
                    filterCategory,
                    filterFollowupContent,
                    filterOverdueDaysMin,
                    filterOverdueDaysMax,
                  ].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="w-4 h-4" />
              新建案件
            </Button>
          </div>
        </div>
      </div>

      {/* 选中案件操作栏 */}
      {selectedIds.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-amber-800 font-medium">
                已选择 {selectedIds.length} 个案件
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <CheckSquare className="w-4 h-4" />
                    选择模式
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuCheckboxItem
                    checked={allCurrentPageSelected}
                    onCheckedChange={toggleSelectCurrentPage}
                  >
                    当前页全部
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={allFilteredSelected}
                    onCheckedChange={toggleSelectAllFiltered}
                  >
                    筛选结果全部
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-amber-700 border-amber-300 hover:bg-amber-100"
                onClick={() => setSelectedIds([])}
              >
                取消选择
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-blue-700 border-blue-300 hover:bg-blue-100"
                onClick={handleAssignSelected}
              >
                <UserPlus className="w-4 h-4" />
                分配案件
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={handleDeleteSelected}
              >
                <Trash className="w-4 h-4" />
                删除案件
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 筛选面板 */}
      <div className="px-6">
        {showFilters && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 第一行 */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">用户ID</label>
                <Input
                  placeholder="多个ID用空格分隔"
                  value={filterUserId}
                  onChange={(e) => { setFilterUserId(e.target.value); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">联系方式</label>
                <Input
                  placeholder="请输入联系方式"
                  value={filterContactInfo}
                  onChange={(e) => { setFilterContactInfo(e.target.value); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">客户风险等级</label>
                <Input
                  placeholder="请输入风险等级"
                  value={filterRiskLevelText}
                  onChange={(e) => { setFilterRiskLevelText(e.target.value); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">所属销售</label>
                <Input
                  placeholder="请输入销售姓名"
                  value={filterAssignedSales}
                  onChange={(e) => { setFilterAssignedSales(e.target.value); setPage(1); }}
                />
              </div>
              
              {/* 第二行 */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">所属贷后</label>
                <Input
                  placeholder="请输入贷后人员"
                  value={filterAssignedPostLoan}
                  onChange={(e) => { setFilterAssignedPostLoan(e.target.value); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">所属风控</label>
                <Input
                  placeholder="请输入风控人员"
                  value={filterAssignedRiskControl}
                  onChange={(e) => { setFilterAssignedRiskControl(e.target.value); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">地址</label>
                <Input
                  placeholder="请输入地址"
                  value={filterAddress}
                  onChange={(e) => { setFilterAddress(e.target.value); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">资金方</label>
                <Input
                  placeholder="请输入资金方"
                  value={filterFunder}
                  onChange={(e) => { setFilterFunder(e.target.value); setPage(1); }}
                />
              </div>
              
              {/* 第三行 */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">锁定情况</label>
                <Input
                  placeholder="请输入锁定情况"
                  value={filterIsLocked}
                  onChange={(e) => { setFilterIsLocked(e.target.value); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">产品名称</label>
                <Input
                  placeholder="请输入产品名称"
                  value={filterProductName}
                  onChange={(e) => { setFilterProductName(e.target.value); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">平台</label>
                <Input
                  placeholder="请输入平台"
                  value={filterPlatform}
                  onChange={(e) => { setFilterPlatform(e.target.value); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">资金分类</label>
                <Input
                  placeholder="请输入资金分类"
                  value={filterFundCategory}
                  onChange={(e) => { setFilterFundCategory(e.target.value); setPage(1); }}
                />
              </div>
              
              {/* 第四行 */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">支付公司</label>
                <Input
                  placeholder="请输入支付公司"
                  value={filterPaymentCompany}
                  onChange={(e) => { setFilterPaymentCompany(e.target.value); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">是否展期</label>
                <Input
                  placeholder="请输入是否展期"
                  value={filterIsExtended}
                  onChange={(e) => { setFilterIsExtended(e.target.value); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">逾期阶段</label>
                <Input
                  placeholder="请输入逾期阶段"
                  value={filterOverdueStage}
                  onChange={(e) => { setFilterOverdueStage(e.target.value); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">币种</label>
                <Input
                  placeholder="请输入币种"
                  value={filterCurrency}
                  onChange={(e) => { setFilterCurrency(e.target.value); setPage(1); }}
                />
              </div>
              
              {/* 第五行 */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">分类</label>
                <Input
                  placeholder="请输入分类"
                  value={filterCategory}
                  onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">跟进记录内容</label>
                <Input
                  placeholder="请输入跟进记录"
                  value={filterFollowupContent}
                  onChange={(e) => { setFilterFollowupContent(e.target.value); setPage(1); }}
                />
              </div>
              <div className="lg:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-2 block">逾期天数区间</label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="最小"
                    value={filterOverdueDaysMin}
                    onChange={(e) => { setFilterOverdueDaysMin(e.target.value); setPage(1); }}
                    type="number"
                  />
                  <span className="text-slate-400">-</span>
                  <Input
                    placeholder="最大"
                    value={filterOverdueDaysMax}
                    onChange={(e) => { setFilterOverdueDaysMax(e.target.value); setPage(1); }}
                    type="number"
                  />
                </div>
              </div>
              
              {/* 操作按钮 */}
              <div className="lg:col-span-4 flex items-end gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  清除
                </Button>
                
                <div className="ml-auto">
                  <div className="w-[180px]">
                    <label className="text-sm font-medium text-slate-700 mb-2 block">案件状态</label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="全部状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部状态</SelectItem>
                        <SelectItem value="pending_assign">待分配</SelectItem>
                        <SelectItem value="pending_visit">待外访</SelectItem>
                        <SelectItem value="following">跟进中</SelectItem>
                        <SelectItem value="closed">已结案</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="w-[180px]">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">风险等级</label>
                  <Select value={riskLevel} onValueChange={setRiskLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="全部风险" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部风险</SelectItem>
                      <SelectItem value="low">低</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="critical">极高</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 表格区域 */}
      <div className="px-6 py-6">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    {/* 复选框列 */}
                    <TableHead className="w-12">
                      <button
                        onClick={toggleSelectCurrentPage}
                        className="hover:bg-slate-100 p-1 rounded"
                      >
                        {allCurrentPageSelected ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                    </TableHead>
                    {/* 动态列 */}
                    {visibleColumns.map((columnKey) => {
                      const column = ALL_COLUMNS.find(c => c.key === columnKey);
                      if (!column) return null;
                      return (
                        <TableHead key={column.key}>
                          {column.label}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length + 1} className="h-24 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <span className="ml-2 text-slate-500">加载中...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : cases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length + 1} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <FileText className="w-10 h-10 mb-2 text-slate-300" />
                          <p>暂无案件数据</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    cases.map((caseItem) => (
                      <TableRow key={caseItem.id} className="hover:bg-slate-50">
                        {/* 复选框 */}
                        <TableCell className="w-12">
                          <button
                            onClick={() => toggleSelect(caseItem.id)}
                            className="hover:bg-slate-100 p-1 rounded"
                          >
                            {selectedIds.includes(caseItem.id) ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                        </TableCell>
                        {/* 动态内容 */}
                        {visibleColumns.map((columnKey) => {
                          const column = ALL_COLUMNS.find(c => c.key === columnKey);
                          if (!column) return null;
                          return (
                            <TableCell key={column.key}>
                              {renderCell(caseItem, column.key)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 分页控制 */}
        <div className="mt-4 flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="text-sm">共</span>
            <span className="font-bold text-slate-900">{total.toLocaleString()}</span>
            <span className="text-sm">条，第</span>
            <span className="font-bold text-slate-900">{page}</span>
            <span className="text-sm">/</span>
            <span className="font-bold text-slate-900">{totalPages || 1}</span>
            <span className="text-sm">页</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              下一页
            </Button>
            <div className="flex items-center gap-2 ml-4">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10条/页</SelectItem>
                  <SelectItem value="20">20条/页</SelectItem>
                  <SelectItem value="50">50条/页</SelectItem>
                  <SelectItem value="100">100条/页</SelectItem>
                  <SelectItem value="500">500条/页</SelectItem>
                  <SelectItem value="1000">1000条/页</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
