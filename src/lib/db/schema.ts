// 简化版数据库 Schema - 用于类型定义
// 实际使用 Mock 数据

export const userStatusEnum = ['active', 'inactive'] as const;
export const userRoleEnum = ['admin', 'manager', 'agent'] as const;
export const caseStatusEnum = ['pending_assign', 'pending_visit', 'following', 'closed'] as const;
export const closureTypeEnum = ['full_repayment', 'partial_repayment', 'no_repayment', 'other'] as const;
export const auditStatusEnum = ['pending', 'approved', 'rejected'] as const;
export const serviceStatusEnum = ['active', 'inactive', 'error'] as const;
export const serviceTypeEnum = ['mysql', 'postgresql', 'mongodb', 'http'] as const;

export type UserStatus = typeof userStatusEnum[number];
export type UserRole = typeof userRoleEnum[number];
export type CaseStatus = typeof caseStatusEnum[number];
export type ClosureType = typeof closureTypeEnum[number];
export type AuditStatus = typeof auditStatusEnum[number];
export type ServiceStatus = typeof serviceStatusEnum[number];
export type ServiceType = typeof serviceTypeEnum[number];
