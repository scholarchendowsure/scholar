// 用户存储 - 基于内存的 mock 存储
// 参考 src/app/api/users/route.ts 中的 mockUsers

// 用户类型
export interface User {
  id: string;
  sequence: number;
  name: string;
  username: string;
  email: string;
  password: string;
  department: string;
  role: 'admin' | 'manager' | 'agent';
  status: 'active' | 'inactive';
  lastLoginTime: string;
  createdAt: string;
  phone?: string;
  realName?: string;
  isActive?: boolean;
}

// Mock用户数据
let mockUsers: User[] = [
  { 
    id: '1', 
    sequence: 1, 
    name: '张三', 
    username: 'zhangsan', 
    email: 'zhangsan@example.com', 
    password: 'admin123', 
    department: '外访部', 
    role: 'agent', 
    status: 'active', 
    lastLoginTime: '2024-01-20T09:00:00Z', 
    createdAt: '2024-01-01T00:00:00Z',
    realName: '张三',
    isActive: true,
    phone: ''
  },
  { 
    id: '2', 
    sequence: 2, 
    name: '李四', 
    username: 'lisi', 
    email: 'lisi@example.com', 
    password: 'admin123', 
    department: '外访部', 
    role: 'agent', 
    status: 'active', 
    lastLoginTime: '2024-01-19T18:00:00Z', 
    createdAt: '2024-01-01T00:00:00Z',
    realName: '李四',
    isActive: true,
    phone: ''
  },
  { 
    id: '3', 
    sequence: 3, 
    name: '王五', 
    username: 'wangwu', 
    email: 'wangwu@example.com', 
    password: 'admin123', 
    department: '管理部', 
    role: 'manager', 
    status: 'active', 
    lastLoginTime: '2024-01-20T08:30:00Z', 
    createdAt: '2024-01-01T00:00:00Z',
    realName: '王五',
    isActive: true,
    phone: ''
  },
  { 
    id: '4', 
    sequence: 4, 
    name: '管理员', 
    username: 'admin', 
    email: 'admin@example.com', 
    password: 'admin123', 
    department: '管理部', 
    role: 'admin', 
    status: 'active', 
    lastLoginTime: '2024-01-20T10:00:00Z', 
    createdAt: '2024-01-01T00:00:00Z',
    realName: '管理员',
    isActive: true,
    phone: ''
  },
];

export const userStorage = {
  /**
   * 根据用户名查找用户
   */
  findByUsername: (username: string): User | undefined => {
    return mockUsers.find(u => u.username === username);
  },

  /**
   * 根据ID查找用户
   */
  findById: (id: string): User | undefined => {
    return mockUsers.find(u => u.id === id);
  },

  /**
   * 更新用户
   */
  update: (id: string, updates: Partial<User>): void => {
    const index = mockUsers.findIndex(u => u.id === id);
    if (index !== -1) {
      mockUsers[index] = { ...mockUsers[index], ...updates };
    }
  },

  /**
   * 获取所有用户
   */
  findAll: (): User[] => {
    return [...mockUsers];
  }
};
