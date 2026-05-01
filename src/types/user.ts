// 用户管理系统完整类型定义

export type UserStatus = 'active' | 'inactive' | 'locked';
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'agent' | string;

export interface Role {
  id: string;
  name: string;               // 角色名称
  code: string;               // 角色编码（唯一）
  description?: string;       // 角色描述
  permissions: string[];       // 权限列表
  isSystem: boolean;          // 是否为系统内置角色（不可删除）
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  sequence: number;
  username: string;           // 登录用户名
  realName: string;           // 真实姓名
  email?: string;
  phone?: string;             // 联系方式
  password: string;           // 加密后的密码
  passwordSalt: string;       // 密码盐
  department?: string;        // 所属部门
  position?: string;          // 岗位
  role: UserRole;             // 角色
  status: UserStatus;         // 用户状态
  lastLoginTime?: string;     // 最后登录时间
  lastLoginIp?: string;       // 最后登录IP
  createdAt: string;          // 创建时间
  updatedAt: string;          // 更新时间
  createdBy?: string;         // 创建人
  mustChangePassword: boolean; // 是否必须修改密码（首次登录）
  passwordChangedAt?: string;  // 密码修改时间
  passwordHistory: string[];   // 历史密码（前3次）
  loginAttempts: number;       // 登录失败次数
  lockedUntil?: string;         // 锁定到期时间
  allowedIps?: string[];       // 允许的IP列表（空表示无限制）
}

export interface UserOperationLog {
  id: string;
  userId: string;
  username: string;
  action: string;              // 操作动作
  module: string;              // 模块
  description: string;         // 操作描述
  ip?: string;                 // 操作IP
  userAgent?: string;          // 浏览器信息
  params?: Record<string, unknown>; // 请求参数
  createdAt: string;
}

export interface PasswordRule {
  minLength: number;           // 最小长度
  maxLength: number;           // 最大长度
  requireUppercase: boolean;   // 需要大写字母
  requireLowercase: boolean;   // 需要小写字母
  requireNumbers: boolean;     // 需要数字
  requireSpecialChars: boolean; // 需要特殊符号
  specialChars: string;         // 允许的特殊符号
  passwordExpiryDays: number;   // 密码过期天数
  historyCount: number;         // 禁止使用历史密码次数
}

export const DEFAULT_PASSWORD_RULE: PasswordRule = {
  minLength: 6,
  maxLength: 30,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  passwordExpiryDays: 180,
  historyCount: 3,
};

export const INITIAL_PASSWORD = 'Admin@123'; // 初始密码

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  super_admin: '超级管理员',
  admin: '系统管理员',
  manager: '经理',
  agent: '外访员',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: '正常',
  inactive: '停用',
  locked: '锁定',
};

export const USER_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ['*'],
  admin: [
    'user:create', 'user:read', 'user:update', 'user:delete',
    'user:reset_password', 'user:unlock',
    'case:create', 'case:read', 'case:update', 'case:delete',
    'case:export', 'log:read',
  ],
  manager: [
    'user:read',
    'case:create', 'case:read', 'case:update', 'case:export',
  ],
  agent: [
    'case:read', 'case:update',
  ],
};

// 预定义系统角色
export const SYSTEM_ROLES: Role[] = [
  {
    id: 'role_super_admin',
    name: '超级管理员',
    code: 'super_admin',
    description: '拥有所有系统权限',
    permissions: ['*'],
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'role_admin',
    name: '系统管理员',
    code: 'admin',
    description: '管理用户和案件',
    permissions: [
      'user:create', 'user:read', 'user:update', 'user:delete',
      'user:reset_password', 'user:unlock',
      'case:create', 'case:read', 'case:update', 'case:delete',
      'case:export', 'log:read',
    ],
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'role_manager',
    name: '经理',
    code: 'manager',
    description: '查看用户和管理案件',
    permissions: [
      'user:read',
      'case:create', 'case:read', 'case:update', 'case:export',
    ],
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'role_agent',
    name: '外访员',
    code: 'agent',
    description: '查看和更新案件',
    permissions: [
      'case:read', 'case:update',
    ],
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 所有可用的权限选项
export const ALL_PERMISSION_OPTIONS = [
  { key: 'user:create', label: '创建用户' },
  { key: 'user:read', label: '查看用户' },
  { key: 'user:update', label: '编辑用户' },
  { key: 'user:delete', label: '删除用户' },
  { key: 'user:reset_password', label: '重置用户密码' },
  { key: 'user:unlock', label: '解锁用户' },
  { key: 'case:create', label: '创建案件' },
  { key: 'case:read', label: '查看案件' },
  { key: 'case:update', label: '编辑案件' },
  { key: 'case:delete', label: '删除案件' },
  { key: 'case:export', label: '导出案件' },
  { key: 'log:read', label: '查看操作日志' },
  { key: 'role:create', label: '创建角色' },
  { key: 'role:read', label: '查看角色' },
  { key: 'role:update', label: '编辑角色' },
  { key: 'role:delete', label: '删除角色' },
];
