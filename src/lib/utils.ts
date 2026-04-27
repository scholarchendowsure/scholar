import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { USD_TO_CNY_RATE } from './constants';

// 合并 Tailwind 类名
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 格式化金额
export function formatCurrency(amount: string | number | null | undefined, currency: string = 'CNY'): string {
  if (amount === null || amount === undefined) return '-';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '-';
  const formatted = num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === 'USD' ? `$${formatted}` : `¥${formatted}`;
}

// 格式化日期
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// 格式化日期时间
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 转换为 CNY
export function convertToCNY(amount: string | number, fromCurrency: string = 'USD'): number {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 0;
  if (fromCurrency === 'USD') {
    return num * USD_TO_CNY_RATE;
  }
  return num;
}

// 计算逾期天数
export function calculateOverdueDays(maturityDate: Date | string): number {
  const maturity = typeof maturityDate === 'string' ? new Date(maturityDate) : maturityDate;
  const today = new Date();
  const diffTime = today.getTime() - maturity.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

// 验证身份证号
export function validateIdCard(idCard: string): boolean {
  const reg = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
  return reg.test(idCard);
}

// 验证手机号
export function validatePhone(phone: string): boolean {
  const reg = /^1[3-9]\d{9}$/;
  return reg.test(phone);
}

// 生成唯一ID
export function generateId(): string {
  return crypto.randomUUID();
}

// 生成案件编号
export function generateCaseNo(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `CASE${year}${month}${day}${random}`;
}

// 生成批次号
export function generateBatchNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `BATCH${year}${month}${random}`;
}

// 加密密码 (简化版本，实际应该使用 bcrypt)
export function hashPassword(password: string): string {
  // 实际使用时应该使用 bcrypt
  return Buffer.from(password).toString('base64');
}

// 验证密码
export function verifyPassword(password: string, hash: string): boolean {
  return Buffer.from(password).toString('base64') === hash;
}

// 延迟函数
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 分页参数
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 分页工具
export function paginate<T>(data: T[], total: number, page: number, pageSize: number): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// 防抖
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// 节流
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// 对象过滤空值
export function filterEmptyValues<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== null && value !== undefined && value !== '')
  ) as Partial<T>;
}

// 深度克隆
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
