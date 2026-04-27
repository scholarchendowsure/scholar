// 案件状态配置
export const CASE_STATUS_CONFIG = {
  pending_assign: {
    label: '待分配',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    bgColor: 'bg-amber-500',
  },
  pending_visit: {
    label: '待外访',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    bgColor: 'bg-blue-500',
  },
  following: {
    label: '跟进中',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    bgColor: 'bg-indigo-500',
  },
  closed: {
    label: '已结案',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    bgColor: 'bg-emerald-500',
  },
} as const;

// 风险等级配置
export const RISK_LEVEL_CONFIG = {
  low: { label: '低风险', color: 'bg-green-100 text-green-800 border-green-200' },
  medium: { label: '中风险', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  high: { label: '高风险', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  critical: { label: '严重风险', color: 'bg-red-100 text-red-800 border-red-200' },
  extreme: { label: '极高风险', color: 'bg-rose-100 text-rose-800 border-rose-200' },
} as const;

// 汇丰风险标签
export const HSBC_RISK_LABELS = [
  { label: '低风险(0-30天)', color: 'bg-green-100 text-green-800' },
  { label: '中风险(31-60天)', color: 'bg-yellow-100 text-yellow-800' },
  { label: '高风险(61-90天)', color: 'bg-orange-100 text-orange-800' },
  { label: '严重风险(91-180天)', color: 'bg-red-100 text-red-800' },
  { label: '极高风险(181天+)', color: 'bg-rose-100 text-rose-800' },
] as const;

// 结案类型配置
export const CLOSURE_TYPE_CONFIG = {
  full_repayment: { label: '全额回款', color: 'text-emerald-600' },
  partial_repayment: { label: '部分回款', color: 'text-blue-600' },
  no_repayment: { label: '无回款', color: 'text-gray-600' },
  other: { label: '其他', color: 'text-gray-600' },
} as const;

// 审核状态配置
export const AUDIT_STATUS_CONFIG = {
  pending: { label: '待审核', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '已通过', color: 'bg-green-100 text-green-800' },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
} as const;

// 分页配置
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_PAGE_SIZE = 20;

// 导航菜单
export const NAV_ITEMS = [
  { label: '仪表盘', href: '/', icon: 'LayoutDashboard' },
  { label: '案件列表', href: '/cases', icon: 'FileText' },
  { label: '我的案件', href: '/my-cases', icon: 'User' },
  { label: '汇丰管理', href: '/hsbc-panel', icon: 'Building2' },
  { label: '还款记录', href: '/repayment-records', icon: 'Receipt' },
  { label: '案件分配', href: '/assignment', icon: 'Users' },
  { label: '数据导出', href: '/data-export', icon: 'Download' },
  { label: '回收站', href: '/recycle-bin', icon: 'Trash2' },
  { label: '贷后统计', href: '/post-loan-stats', icon: 'BarChart3' },
  { label: '用户管理', href: '/users', icon: 'Settings' },
  { label: 'MCP数据仓库', href: '/mcp-warehouse', icon: 'Database' },
] as const;

// 用户角色
export const USER_ROLES = [
  { value: 'admin', label: '管理员' },
  { value: 'manager', label: '经理' },
  { value: 'agent', label: '外访员' },
] as const;
