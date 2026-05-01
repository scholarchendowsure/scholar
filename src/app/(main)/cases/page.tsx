'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2, RefreshCw, Download, Upload, FileText, X, Settings, ChevronDown } from 'lucide-react';
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
  const [status, setStatus] = useState<string>('all');
  const [riskLevel, setRiskLevel] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // 列选择状态
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);

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
        page: String(page),
        pageSize: String(pageSize),
        ...(status !== 'all' && { status }),
        ...(riskLevel !== 'all' && { riskLevel }),
        ...(debouncedSearch && { search: debouncedSearch }),
      });

      const res = await fetch(`/api/cases?${params}`);
      const json: { success: boolean; data: Case[]; total: number; totalPages: number } = await res.json();

      if (json.success) {
        setCases(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      }
    } catch (error) {
      toast.error('获取案件列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, riskLevel, debouncedSearch]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // 清除筛选
  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setRiskLevel('all');
    setPage(1);
  };

  // 下载模板 - 超级简单可靠的方式
  const handleDownloadTemplate = () => {
    // 直接生成CSV并触发下载
    const headers = [
      '批次号', '贷款单号', '用户ID', '借款人姓名', '产品名称', '平台', '支付公司', '资金方', 
      '资金分类', '状态', '贷款状态', '锁定情况', '五级分类', '风险等级', '是否展期', 
      '币种', '贷款金额', '总贷款金额', '总在贷余额', '已还款总额', '在贷余额', '逾期金额', 
      '逾期本金', '逾期利息', '已还金额', '已还本金', '已还利息', '代偿总额', '贷款期限', 
      '贷款期限单位', '贷款日期', '到期日', '逾期天数', '逾期开始时间', '首次逾期时间', '代偿日期', 
      '公司名称', '公司地址', '家庭地址', '户籍地址', '借款人手机号', '注册手机号', '联系方式', 
      '所属销售', '所属风控', '所属贷后'
    ];
    
    const exampleRow = [
      '20260501001', 'LD20260501001', 'U001', '张三', '个人消费贷', '支付宝', '支付宝支付', 
      '招商银行', '自有资金', '待分配', '正常', '否', '正常', '低', '否',
      'CNY', '100000', '100000', '80000', '20000', '80000', '0', '0', '0', '20000', '20000',
      '0', '0', '36', '月', '2024-01-01', '2027-01-01', '0', '', '', '', 
      '示例公司', '北京市朝阳区', '北京市海淀区', '北京市西城区', '13800138000', '13900139000', 
      '联系人：李四', '王五', '赵六', '钱七'
    ];
    
    const csv = '\uFEFF' + headers.join(',') + '\n' + exampleRow.join(',');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '案件导入模板.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    toast.success('模板下载成功！');
  };

  // 选择文件
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // 导入案件
  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('请选择要导入的文件');
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      // 读取CSV文件
      const text = await selectedFile.text();
      setImportProgress(30);

      // 解析CSV
      const rows = parseCSV(text);
      if (rows.length < 2) {
        throw new Error('文件格式不正确，至少需要标题行和一条数据');
      }

      setImportProgress(50);

      // 转换数据
      const headers = rows[0];
      const dataRows = rows.slice(1);
      const cases = dataRows.map(row => {
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return convertToCaseFormat(obj);
      });

      setImportProgress(70);

      // 提交导入 - 此功能已迁移到专门的导入页面
      toast.info('请使用专门的案件导入页面进行导入');
      setShowImportDialog(false);
      setSelectedFile(null);
      setImportProgress(100);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导入失败');
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  // 简单CSV解析
  const parseCSV = (text: string): string[][] => {
    const lines = text.trim().split('\n');
    return lines.map(line => {
      // 简单处理，处理带引号的字段
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  // 转换到Case格式（字段名映射）
  const convertToCaseFormat = (obj: any): any => {
    const fieldMap: Record<string, string> = {
      '批次号': 'batchNo',
      '贷款单号': 'loanNo',
      '用户ID': 'userId',
      '借款人姓名': 'borrowerName',
      '状态': 'status',
      '币种': 'currency',
      '逾期天数': 'overdueDays',
      '贷款期限': 'loanTerm',
      '贷款期限单位': 'loanTermUnit',
      '贷款金额': 'loanAmount',
      '总贷款金额': 'totalLoanAmount',
      '总在贷余额': 'totalOutstandingBalance',
      '已还款总额': 'totalRepaidAmount',
      '在贷余额': 'outstandingBalance',
      '逾期金额': 'overdueAmount',
      '逾期本金': 'overduePrincipal',
      '逾期利息': 'overdueInterest',
      '已还金额': 'repaidAmount',
      '已还本金': 'repaidPrincipal',
      '已还利息': 'repaidInterest',
      '公司名称': 'companyName',
      '公司地址': 'companyAddress',
      '家庭地址': 'homeAddress',
      '户籍地址': 'householdAddress',
      '借款人手机号': 'borrowerPhone',
      '注册手机号': 'registeredPhone',
      '联系方式': 'contactInfo',
      '贷款状态': 'loanStatus',
      '锁定情况': 'isLocked',
      '平台': 'platform',
      '支付公司': 'paymentCompany',
      '五级分类': 'fiveLevelClassification',
      '风险等级': 'riskLevel',
      '所属销售': 'assignedSales',
      '所属风控': 'assignedRiskControl',
      '所属贷后': 'assignedPostLoan',
      '资金方': 'funder',
      '贷款日期': 'loanDate',
      '到期日': 'dueDate',
      '产品名称': 'productName',
      '逾期开始时间': 'overdueStartTime',
      '首次逾期时间': 'firstOverdueTime',
      '资金分类': 'fundCategory',
      '代偿总额': 'compensationAmount',
      '代偿日期': 'compensationDate',
      '是否展期': 'isExtended',
    };

    const result: any = {};
    Object.entries(obj).forEach(([key, value]) => {
      const newKey = fieldMap[key] || key;
      result[newKey] = value;
    });

    return result;
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

  const hasFilters = search || status !== 'all' || riskLevel !== 'all';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* 头部 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">案件列表</h1>
            <p className="text-sm text-slate-500 mt-1">
              共 {total} 个案件
            </p>
          </div>
          <div className="flex items-center gap-3">
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

            {/* 简单直接的下载按钮 */}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                const headers = [
                  '批次号', '贷款单号', '用户ID', '借款人姓名', '产品名称', '平台', '支付公司', '资金方', 
                  '资金分类', '状态', '贷款状态', '锁定情况', '五级分类', '风险等级', '是否展期', 
                  '币种', '贷款金额', '总贷款金额', '总在贷余额', '已还款总额', '在贷余额', '逾期金额', 
                  '逾期本金', '逾期利息', '已还金额', '已还本金', '已还利息', '代偿总额', '贷款期限', 
                  '贷款期限单位', '贷款日期', '到期日', '逾期天数', '逾期开始时间', '首次逾期时间', '代偿日期', 
                  '公司名称', '公司地址', '家庭地址', '户籍地址', '借款人手机号', '注册手机号', '联系方式', 
                  '所属销售', '所属风控', '所属贷后'
                ];
                const exampleRow = [
                  '20260501001', 'LD20260501001', 'U001', '张三', '个人消费贷', '支付宝', '支付宝支付', 
                  '招商银行', '自有资金', '待分配', '正常', '否', '正常', '低', '否',
                  'CNY', '100000', '100000', '80000', '20000', '80000', '0', '0', '0', '20000', '20000',
                  '0', '0', '36', '月', '2024-01-01', '2027-01-01', '0', '', '', '', 
                  '示例公司', '北京市朝阳区', '北京市海淀区', '北京市西城区', '13800138000', '13900139000', 
                  '联系人：李四', '王五', '赵六', '钱七'
                ];
                const csv = '\uFEFF' + headers.join(',') + '\n' + exampleRow.join(',');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = '案件导入模板.csv';
                link.click();
                URL.revokeObjectURL(url);
                toast.success('模板下载成功！');
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              下载模板
            </a>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(true)}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              导入案件
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              筛选
              {hasFilters && (
                <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700">
                  {[
                    search && '搜索',
                    status !== 'all' && '状态',
                    riskLevel !== 'all' && '风险',
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

      {/* 导入对话框 */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">导入案件</h3>
              <button
                onClick={() => setShowImportDialog(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  选择文件
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                >
                  {selectedFile ? (
                    <div>
                      <FileText className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">点击或拖拽文件到此处</p>
                      <p className="text-xs text-slate-400 mt-1">支持 CSV、Excel 格式</p>
                    </div>
                  )}
                </div>
              </div>

              {importing && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
                    <span>导入中...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowImportDialog(false);
                    setSelectedFile(null);
                  }}
                  disabled={importing}
                >
                  取消
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!selectedFile || importing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {importing ? '导入中...' : '开始导入'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 筛选面板 */}
      <div className="px-6">
        {showFilters && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in slide-in-from-top-2">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-slate-700 mb-2 block">搜索</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="用户ID/姓名/电话"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div className="w-40">
                <label className="text-sm font-medium text-slate-700 mb-2 block">状态</label>
                <Select
                  value={status}
                  onValueChange={(value) => {
                    setStatus(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-40">
                <label className="text-sm font-medium text-slate-700 mb-2 block">风险等级</label>
                <Select
                  value={riskLevel}
                  onValueChange={(value) => {
                    setRiskLevel(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部等级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部等级</SelectItem>
                    {Object.entries(RISK_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="text-slate-600"
                >
                  清除筛选
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 表格区域 */}
      <div className="px-6 py-6">
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400" />
                  <p className="mt-2 text-slate-500">加载中...</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      {ALL_COLUMNS.filter(column => visibleColumns.includes(column.key)).map((column) => (
                        <TableHead key={column.key} className="font-medium">
                          {column.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={visibleColumns.length} className="text-center py-12 text-slate-500">
                          暂无案件数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      cases.map((caseItem) => (
                        <TableRow key={caseItem.id} className="hover:bg-slate-50">
                          {ALL_COLUMNS.filter(column => visibleColumns.includes(column.key)).map((column) => (
                            <TableCell key={column.key}>
                              {renderCell(caseItem, column.key)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 分页控制 */}
        <div className="mt-6 flex items-center justify-between bg-white border border-slate-200 rounded-lg px-6 py-4">
          <div className="flex items-center gap-4 text-slate-600">
            <span className="text-lg">共 <span className="font-bold text-slate-900">{total.toLocaleString()}</span> 条</span>
            <span className="text-lg">第 <span className="font-bold text-slate-900">{page}</span> / <span className="font-bold text-slate-900">{totalPages}</span> 页</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 上一页 */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className={page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100'}
            >
              上一页
            </Button>
            
            {/* 下一页 */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className={page === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100'}
            >
              下一页
            </Button>
            
            {/* 每页条数选择 */}
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-10 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-lg"
              >
                <option value={10}>10条/页</option>
                <option value={20}>20条/页</option>
                <option value={50}>50条/页</option>
                <option value={100}>100条/页</option>
                <option value={500}>500条/页</option>
                <option value={1000}>1000条/页</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
