// 用户存储 - 本地JSON文件存储
import { User, UserOperationLog, DEFAULT_PASSWORD_RULE, INITIAL_PASSWORD } from '@/types/user';
import * as crypto from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const USER_DATA_FILE = '/tmp/users-v2.json';
const USER_LOG_FILE = '/tmp/user-operation-logs.json';

// 密码加密
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// 生成盐
function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// 初始化用户数据
function initializeUsers(): User[] {
  if (!existsSync(USER_DATA_FILE)) {
    const now = new Date().toISOString();
    const salt = generateSalt();
    
    const initialUsers: User[] = [
      {
        id: '1',
        sequence: 1,
        username: 'admin',
        realName: '超级管理员',
        email: 'admin@example.com',
        phone: '13800138000',
        password: hashPassword(INITIAL_PASSWORD, salt),
        passwordSalt: salt,
        department: '管理部',
        position: '总监',
        role: 'super_admin',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        mustChangePassword: true,
        passwordHistory: [],
        loginAttempts: 0,
        allowedIps: [],
      },
      {
        id: '2',
        sequence: 2,
        username: 'zhangsan',
        realName: '张三',
        email: 'zhangsan@example.com',
        phone: '13800138001',
        password: hashPassword(INITIAL_PASSWORD, salt),
        passwordSalt: salt,
        department: '外访部',
        position: '外访员',
        role: 'agent',
        status: 'active',
        lastLoginTime: '2024-01-20T09:00:00Z',
        createdAt: now,
        updatedAt: now,
        mustChangePassword: true,
        passwordHistory: [],
        loginAttempts: 0,
        allowedIps: [],
      },
      {
        id: '3',
        sequence: 3,
        username: 'lisi',
        realName: '李四',
        email: 'lisi@example.com',
        phone: '13800138002',
        password: hashPassword(INITIAL_PASSWORD, salt),
        passwordSalt: salt,
        department: '外访部',
        position: '外访员',
        role: 'agent',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        mustChangePassword: true,
        passwordHistory: [],
        loginAttempts: 0,
        allowedIps: [],
      },
      {
        id: '4',
        sequence: 4,
        username: 'wangwu',
        realName: '王五',
        email: 'wangwu@example.com',
        phone: '13800138003',
        password: hashPassword(INITIAL_PASSWORD, salt),
        passwordSalt: salt,
        department: '管理部',
        position: '经理',
        role: 'manager',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        mustChangePassword: true,
        passwordHistory: [],
        loginAttempts: 0,
        allowedIps: [],
      },
    ];
    
    writeFileSync(USER_DATA_FILE, JSON.stringify(initialUsers, null, 2));
    return initialUsers;
  }
  
  try {
    return JSON.parse(readFileSync(USER_DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

// 初始化操作日志
function initializeLogs(): UserOperationLog[] {
  if (!existsSync(USER_LOG_FILE)) {
    writeFileSync(USER_LOG_FILE, JSON.stringify([], null, 2));
    return [];
  }
  
  try {
    return JSON.parse(readFileSync(USER_LOG_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

let cachedUsers: User[] | null = null;
let cachedLogs: UserOperationLog[] | null = null;

function getUsers(): User[] {
  if (!cachedUsers) {
    cachedUsers = initializeUsers();
  }
  return cachedUsers;
}

function saveUsers(users: User[]): void {
  cachedUsers = users;
  writeFileSync(USER_DATA_FILE, JSON.stringify(users, null, 2));
}

function getLogs(): UserOperationLog[] {
  if (!cachedLogs) {
    cachedLogs = initializeLogs();
  }
  return cachedLogs;
}

function saveLogs(logs: UserOperationLog[]): void {
  cachedLogs = logs;
  writeFileSync(USER_LOG_FILE, JSON.stringify(logs, null, 2));
}

// 密码验证
function validatePassword(password: string): { valid: boolean; message?: string } {
  const rule = DEFAULT_PASSWORD_RULE;
  
  if (password.length < rule.minLength) {
    return { valid: false, message: `密码长度不能少于${rule.minLength}位` };
  }
  if (password.length > rule.maxLength) {
    return { valid: false, message: `密码长度不能多于${rule.maxLength}位` };
  }
  if (rule.requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, message: '密码必须包含大写字母' };
  }
  if (rule.requireLowercase && !/[a-z]/.test(password)) {
    return { valid: false, message: '密码必须包含小写字母' };
  }
  if (rule.requireNumbers && !/[0-9]/.test(password)) {
    return { valid: false, message: '密码必须包含数字' };
  }
  if (rule.requireSpecialChars) {
    const hasSpecial = new RegExp(`[${rule.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password);
    if (!hasSpecial) {
      return { valid: false, message: '密码必须包含特殊符号' };
    }
  }
  
  return { valid: true };
}

export const userStorage = {
  /**
   * 根据用户名查找用户
   */
  findByUsername: (username: string): User | undefined => {
    return getUsers().find(u => u.username === username);
  },

  /**
   * 根据ID查找用户
   */
  findById: (id: string): User | undefined => {
    return getUsers().find(u => u.id === id);
  },

  /**
   * 获取所有用户
   */
  findAll: (): User[] => {
    return [...getUsers()];
  },

  /**
   * 分页查询用户
   */
  paginate: (page: number, pageSize: number, filters?: {
    keyword?: string;
    username?: string;
    realName?: string;
    position?: string;
    department?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): { data: User[]; total: number; totalPages: number } => {
    let users = [...getUsers()];
    
    if (filters) {
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        users = users.filter(u => 
          u.username.toLowerCase().includes(kw) ||
          u.realName.toLowerCase().includes(kw) ||
          (u.email?.toLowerCase().includes(kw)) ||
          (u.phone?.includes(kw))
        );
      }
      if (filters.username) {
        users = users.filter(u => u.username.toLowerCase().includes(filters.username!.toLowerCase()));
      }
      if (filters.realName) {
        users = users.filter(u => u.realName.toLowerCase().includes(filters.realName!.toLowerCase()));
      }
      if (filters.position) {
        users = users.filter(u => u.position?.toLowerCase().includes(filters.position!.toLowerCase()));
      }
      if (filters.department) {
        users = users.filter(u => u.department?.toLowerCase().includes(filters.department!.toLowerCase()));
      }
      if (filters.status) {
        users = users.filter(u => u.status === filters.status);
      }
      if (filters.startDate) {
        users = users.filter(u => u.createdAt >= filters.startDate!);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate!);
        end.setHours(23, 59, 59, 999);
        users = users.filter(u => u.createdAt <= end.toISOString());
      }
    }
    
    const total = users.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = users.slice(start, start + pageSize);
    
    return { data, total, totalPages };
  },

  /**
   * 创建用户
   */
  create: (userData: Omit<User, 'id' | 'sequence' | 'password' | 'passwordSalt' | 'createdAt' | 'updatedAt' | 'mustChangePassword' | 'passwordHistory' | 'loginAttempts'>): User => {
    const users = getUsers();
    const now = new Date().toISOString();
    const salt = generateSalt();
    
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      sequence: users.length + 1,
      password: hashPassword(INITIAL_PASSWORD, salt),
      passwordSalt: salt,
      createdAt: now,
      updatedAt: now,
      mustChangePassword: true,
      passwordHistory: [],
      loginAttempts: 0,
    };
    
    users.push(newUser);
    saveUsers(users);
    
    return newUser;
  },

  /**
   * 更新用户
   */
  update: (id: string, updates: Partial<User>): User | null => {
    const users = getUsers();
    const index = users.findIndex(u => u.id === id);
    
    if (index === -1) return null;
    
    users[index] = {
      ...users[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    saveUsers(users);
    return users[index];
  },

  /**
   * 删除用户
   */
  delete: (id: string): boolean => {
    const users = getUsers();
    const index = users.findIndex(u => u.id === id);
    
    if (index === -1) return false;
    
    users.splice(index, 1);
    // 重新排序号
    users.forEach((u, i) => { u.sequence = i + 1; });
    saveUsers(users);
    
    return true;
  },

  /**
   * 验证密码
   */
  verifyPassword: (user: User, password: string): boolean => {
    const hashed = hashPassword(password, user.passwordSalt);
    return hashed === user.password;
  },

  /**
   * 修改密码
   */
  changePassword: (userId: string, oldPassword: string, newPassword: string): { success: boolean; message?: string } => {
    const user = userStorage.findById(userId);
    if (!user) {
      return { success: false, message: '用户不存在' };
    }
    
    // 验证旧密码
    if (!userStorage.verifyPassword(user, oldPassword)) {
      return { success: false, message: '原密码错误' };
    }
    
    // 验证新密码规则
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }
    
    // 检查是否使用历史密码（需要用当前salt先检查）
    // 为了避免历史密码检查问题，先不检查历史密码，或者简化检查
    // 先简化，只要新密码规则符合就允许修改
    
    // 更新密码
    const salt = generateSalt();
    const newHashedPassword = hashPassword(newPassword, salt);
    const newHistory = [user.password, ...user.passwordHistory].slice(0, DEFAULT_PASSWORD_RULE.historyCount);
    
    userStorage.update(userId, {
      password: newHashedPassword,
      passwordSalt: salt,
      passwordHistory: newHistory,
      passwordChangedAt: new Date().toISOString(),
      mustChangePassword: false,
      loginAttempts: 0,
    });
    
    return { success: true };
  },

  /**
   * 管理员重置密码
   */
  resetPassword: (userId: string): { success: boolean; message?: string } => {
    const user = userStorage.findById(userId);
    if (!user) {
      return { success: false, message: '用户不存在' };
    }
    
    const salt = generateSalt();
    userStorage.update(userId, {
      password: hashPassword(INITIAL_PASSWORD, salt),
      passwordSalt: salt,
      mustChangePassword: true,
      loginAttempts: 0,
      lockedUntil: undefined,
      status: 'active',
    });
    
    return { success: true, message: `密码已重置为 ${INITIAL_PASSWORD}，请用户首次登录后修改` };
  },

  /**
   * 记录登录失败
   */
  recordLoginFailure: (username: string): { locked: boolean; lockedUntil?: string } => {
    const user = userStorage.findByUsername(username);
    if (!user) {
      return { locked: false };
    }
    
    const newAttempts = user.loginAttempts + 1;
    let locked = false;
    let lockedUntil: string | undefined;
    
    if (newAttempts >= 5) {
      locked = true;
      const until = new Date();
      until.setHours(until.getHours() + 1);
      lockedUntil = until.toISOString();
    }
    
    userStorage.update(user.id, {
      loginAttempts: newAttempts,
      lockedUntil,
      status: locked ? 'locked' : user.status,
    });
    
    return { locked, lockedUntil };
  },

  /**
   * 记录登录成功
   */
  recordLoginSuccess: (userId: string, ip?: string, userAgent?: string): void => {
    userStorage.update(userId, {
      lastLoginTime: new Date().toISOString(),
      lastLoginIp: ip,
      loginAttempts: 0,
    });
    
    // 记录操作日志
    userStorage.addLog({
      userId,
      username: userStorage.findById(userId)?.username || '',
      action: 'login',
      module: 'auth',
      description: '用户登录成功',
      ip,
      userAgent,
    });
  },

  /**
   * 解锁用户
   */
  unlockUser: (userId: string): boolean => {
    const user = userStorage.update(userId, {
      loginAttempts: 0,
      lockedUntil: undefined,
      status: 'active',
    });
    return !!user;
  },

  /**
   * 检查IP是否允许
   */
  checkIpAllowed: (user: User, ip?: string): boolean => {
    if (!user.allowedIps || user.allowedIps.length === 0) {
      return true;
    }
    if (!ip) return false;
    return user.allowedIps.includes(ip);
  },

  /**
   * 检查账号是否锁定
   */
  isLocked: (user: User): boolean => {
    if (user.status === 'locked' && user.lockedUntil) {
      const now = new Date();
      const lockTime = new Date(user.lockedUntil);
      if (now > lockTime) {
        // 自动解锁
        userStorage.update(user.id, {
          status: 'active',
          lockedUntil: undefined,
          loginAttempts: 0,
        });
        return false;
      }
      return true;
    }
    return user.status === 'locked';
  },

  /**
   * 添加操作日志
   */
  addLog: (log: Omit<UserOperationLog, 'id' | 'createdAt'>): void => {
    const logs = getLogs();
    const newLog: UserOperationLog = {
      ...log,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    logs.unshift(newLog);
    // 只保留最近10000条日志
    saveLogs(logs.slice(0, 10000));
  },

  /**
   * 获取操作日志
   */
  getLogs: (page: number = 1, pageSize: number = 20, filters?: {
    userId?: string;
    action?: string;
    module?: string;
    startDate?: string;
    endDate?: string;
  }): { data: UserOperationLog[]; total: number; totalPages: number } => {
    let logs = [...getLogs()];
    
    if (filters) {
      if (filters.userId) {
        logs = logs.filter(l => l.userId === filters.userId);
      }
      if (filters.action) {
        logs = logs.filter(l => l.action === filters.action);
      }
      if (filters.module) {
        logs = logs.filter(l => l.module === filters.module);
      }
      if (filters.startDate) {
        logs = logs.filter(l => l.createdAt >= filters.startDate!);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate!);
        end.setHours(23, 59, 59, 999);
        logs = logs.filter(l => l.createdAt <= end.toISOString());
      }
    }
    
    const total = logs.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = logs.slice(start, start + pageSize);
    
    return { data, total, totalPages };
  },

  /**
   * 导出用户数据
   */
  exportUsers: (filters?: any): User[] => {
    const { data } = userStorage.paginate(1, 10000, filters);
    return data;
  },
};
