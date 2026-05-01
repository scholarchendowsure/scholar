'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
  department?: string;
  realName?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        // 确保必要字段存在，增强容错性
        if (user && user.id && user.username) {
          // 如果没有name字段但有realName，兼容处理
          if (!user.name && user.realName) {
            user.name = user.realName;
          }
          // 如果还是没有name，使用username作为后备
          if (!user.name) {
            user.name = user.username;
          }
          setUser(user);
          setIsAuthenticated(true);
        } else {
          // 用户数据不完整，清除
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('解析用户数据失败:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData: User, token: string) => {
    // 确保userData有name字段
    const processedUser = { ...userData };
    if (!processedUser.name && processedUser.realName) {
      processedUser.name = processedUser.realName;
    }
    if (!processedUser.name) {
      processedUser.name = processedUser.username;
    }
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(processedUser));
    setUser(processedUser);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}