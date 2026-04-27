// 案件状态枚举
export const CASE_STATUS = {
  PENDING_ASSIGN: 'pending_assign',
  PENDING_VISIT: 'pending_visit',
  FOLLOWING: 'following',
  CLOSED: 'closed',
} as const;

export type CaseStatus = typeof CASE_STATUS[keyof typeof CASE_STATUS];

// 案件状态映射
export const CASE_STATUS_CONFIG: Record<CaseStatus, { label: string; color: string; bgColor: string }> = {
  [CASE_STATUS.PENDING_ASSIGN]: { label: '待分配', color: 'hsl(35 90% 45%)', bgColor: 'bg-[hsl(35_90%_45%)]' },
  [CASE_STATUS.PENDING_VISIT]: { label: '待外访', color: 'hsl(210 70% 50%)', bgColor: 'bg-[hsl(210_70%_50%)]' },
  [CASE_STATUS.FOLLOWING]: { label: '跟进中', color: 'hsl(210 95% 40%)', bgColor: 'bg-[hsl(210_95%_40%)]' },
  [CASE_STATUS.CLOSED]: { label: '已结案', color: 'hsl(145 65% 38%)', bgColor: 'bg-[hsl(145_65%_38%)]' },
};

// 结案类型
export const CLOSURE_TYPE = {
  FULL_REPAYMENT: 'full_repayment',
  PARTIAL_REPAYMENT: 'partial_repayment',
  NO_REPAYMENT: 'no_repayment',
  OTHER: 'other',
} as const;

export type ClosureType = typeof CLOSURE_TYPE[keyof typeof CLOSURE_TYPE];

export const CLOSURE_TYPE_CONFIG: Record<ClosureType, { label: string }> = {
  [CLOSURE_TYPE.FULL_REPAYMENT]: { label: '全额回款' },
  [CLOSURE_TYPE.PARTIAL_REPAYMENT]: { label: '部分回款' },
  [CLOSURE_TYPE.NO_REPAYMENT]: { label: '无回款' },
  [CLOSURE_TYPE.OTHER]: { label: '其他' },
};

// 用户角色
export const USER_ROLE = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  AGENT: 'agent',
} as const;

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];

export const USER_ROLE_CONFIG: Record<UserRole, { label: string }> = {
  [USER_ROLE.ADMIN]: { label: '管理员' },
  [USER_ROLE.MANAGER]: { label: '经理' },
  [USER_ROLE.AGENT]: { label: '外访员' },
};

// 用户状态
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

// 审核状态
export const AUDIT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type AuditStatus = typeof AUDIT_STATUS[keyof typeof AUDIT_STATUS];

export const AUDIT_STATUS_CONFIG: Record<AuditStatus, { label: string; color: string }> = {
  [AUDIT_STATUS.PENDING]: { label: '待审核', color: 'hsl(35 90% 45%)' },
  [AUDIT_STATUS.APPROVED]: { label: '已通过', color: 'hsl(145 65% 38%)' },
  [AUDIT_STATUS.REJECTED]: { label: '已拒绝', color: 'hsl(0 75% 50%)' },
};

// 风险等级
export const RISK_LEVEL = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  VERY_HIGH: 'very_high',
  EXTREME: 'extreme',
} as const;

export type RiskLevel = typeof RISK_LEVEL[keyof typeof RISK_LEVEL];

export const RISK_LEVEL_CONFIG: Record<RiskLevel, { label: string; color: string }> = {
  [RISK_LEVEL.LOW]: { label: '低风险', color: 'hsl(145 65% 38%)' },
  [RISK_LEVEL.MEDIUM]: { label: '中风险', color: 'hsl(35 90% 45%)' },
  [RISK_LEVEL.HIGH]: { label: '高风险', color: 'hsl(30 80% 50%)' },
  [RISK_LEVEL.VERY_HIGH]: { label: '很高风险', color: 'hsl(0 75% 50%)' },
  [RISK_LEVEL.EXTREME]: { label: '极高风险', color: 'hsl(0 60% 40%)' },
};

// 跟进类型
export const FOLLOWUP_TYPE = {
  PHONE: 'phone',
  VISIT: 'visit',
  DOCUMENT: 'document',
  OTHER: 'other',
} as const;

export type FollowupType = typeof FOLLOWUP_TYPE[keyof typeof FOLLOWUP_TYPE];

export const FOLLOWUP_TYPE_CONFIG: Record<FollowupType, { label: string }> = {
  [FOLLOWUP_TYPE.PHONE]: { label: '电话跟进' },
  [FOLLOWUP_TYPE.VISIT]: { label: '上门外访' },
  [FOLLOWUP_TYPE.DOCUMENT]: { label: '文件跟进' },
  [FOLLOWUP_TYPE.OTHER]: { label: '其他' },
};

// 汇丰风险标签
export const HSBC_RISK_LABELS = {
  LOW_RISK: '低风险(0-30天)',
  MEDIUM_RISK: '中风险(31-60天)',
  HIGH_RISK: '高风险(61-90天)',
  VERY_HIGH_RISK: '严重风险(91-180天)',
  EXTREME_RISK: '极高风险(181天+)',
} as const;

// 货币类型
export const CURRENCY = {
  CNY: 'CNY',
  USD: 'USD',
} as const;

export const USD_TO_CNY_RATE = 7;

// 颜色常量
export const COLORS = {
  PRIMARY: 'hsl(210 95% 40%)',
  BACKGROUND: 'hsl(215 25% 97%)',
  CARD: 'hsl(0 0% 100%)',
  BORDER: 'hsl(220 20% 88%)',
  SUCCESS: 'hsl(145 65% 38%)',
  WARNING: 'hsl(35 90% 45%)',
  DANGER: 'hsl(0 75% 50%)',
  INFO: 'hsl(210 70% 50%)',
};

// 分页默认值
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
