import { Role, SYSTEM_ROLES } from '@/types/user';
import fs from 'fs';
import path from 'path';

// 本地存储文件路径
const ROLE_STORAGE_FILE = path.join(process.cwd(), 'public', 'data', 'roles-v2.json');

// 角色数据缓存
let cachedRoles: Role[] | null = null;

/**
 * 确保角色存储文件存在
 */
function ensureRoleStorageExists() {
  try {
    if (!fs.existsSync(ROLE_STORAGE_FILE)) {
      // 初始化系统角色
      const initialData = [...SYSTEM_ROLES];
      fs.writeFileSync(ROLE_STORAGE_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      cachedRoles = initialData;
    }
  } catch (error) {
    console.error('Failed to initialize role storage:', error);
    // 如果写入失败，使用内存缓存
    if (!cachedRoles) {
      cachedRoles = [...SYSTEM_ROLES];
    }
  }
}

/**
 * 获取所有角色
 */
export function getAllRoles(): Role[] {
  ensureRoleStorageExists();
  
  if (!cachedRoles) {
    try {
      const content = fs.readFileSync(ROLE_STORAGE_FILE, 'utf-8');
      cachedRoles = JSON.parse(content);
    } catch (error) {
      console.error('Failed to read roles from file:', error);
      cachedRoles = [...SYSTEM_ROLES];
    }
  }
  
  return cachedRoles || [...SYSTEM_ROLES];
}

/**
 * 根据ID获取角色
 */
export function getRoleById(id: string): Role | undefined {
  const roles = getAllRoles();
  return roles.find(r => r.id === id);
}

/**
 * 根据编码获取角色
 */
export function getRoleByCode(code: string): Role | undefined {
  const roles = getAllRoles();
  return roles.find(r => r.code === code);
}

/**
 * 创建角色
 */
export function createRole(roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Role {
  const roles = getAllRoles();
  
  // 检查编码是否已存在
  if (getRoleByCode(roleData.code)) {
    throw new Error('角色编码已存在');
  }
  
  const newRole: Role = {
    ...roleData,
    id: `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  roles.push(newRole);
  cachedRoles = roles;
  
  try {
    fs.writeFileSync(ROLE_STORAGE_FILE, JSON.stringify(roles, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write role to file:', error);
  }
  
  return newRole;
}

/**
 * 更新角色
 */
export function updateRole(id: string, updates: Partial<Omit<Role, 'id' | 'createdAt' | 'isSystem'>>): Role | undefined {
  const roles = getAllRoles();
  const index = roles.findIndex(r => r.id === id);
  
  if (index === -1) {
    return undefined;
  }
  
  const role = roles[index];
  
  // 系统内置角色不能修改编码和是否为系统角色
  if (role.isSystem && updates.code) {
    throw new Error('系统内置角色不能修改编码');
  }
  
  // 检查编码是否已被其他角色使用
  if (updates.code && updates.code !== role.code) {
    const existingRole = getRoleByCode(updates.code);
    if (existingRole) {
      throw new Error('角色编码已存在');
    }
  }
  
  const updatedRole: Role = {
    ...role,
    ...updates,
    updatedAt: new Date().toISOString(),
    id: role.id,
    createdAt: role.createdAt,
    isSystem: role.isSystem,
  };
  
  roles[index] = updatedRole;
  cachedRoles = roles;
  
  try {
    fs.writeFileSync(ROLE_STORAGE_FILE, JSON.stringify(roles, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to update role in file:', error);
  }
  
  return updatedRole;
}

/**
 * 删除角色
 */
export function deleteRole(id: string): boolean {
  const roles = getAllRoles();
  const index = roles.findIndex(r => r.id === id);
  
  if (index === -1) {
    return false;
  }
  
  const role = roles[index];
  
  // 系统内置角色不能删除
  if (role.isSystem) {
    throw new Error('系统内置角色不能删除');
  }
  
  roles.splice(index, 1);
  cachedRoles = roles;
  
  try {
    fs.writeFileSync(ROLE_STORAGE_FILE, JSON.stringify(roles, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to delete role from file:', error);
  }
  
  return true;
}

/**
 * 重置角色到系统默认（仅开发调试用）
 */
export function resetRoles(): void {
  cachedRoles = null;
  try {
    if (fs.existsSync(ROLE_STORAGE_FILE)) {
      fs.unlinkSync(ROLE_STORAGE_FILE);
    }
  } catch (error) {
    console.error('Failed to reset roles:', error);
  }
}
