'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

// 定义模块权限到路由的映射
const MODULE_TO_ROUTE: Record<string, string> = {
  'module:dashboard': '/dashboard',
  'module:case_management': '/cases',
  'module:case_assignment': '/cases/assignment',
  'module:repayment_records': '/repayments',
  'module:data_export': '/data-export',
  'module:case_import': '/case-import',
  'module:user_management': '/users',
  'module:hsbc_panel': '/hsbc-panel',
  'module:feishu_config': '/feishu-config',
  'module:feishu_messages': '/feishu-messages',
  'module:recycle_bin': '/recycle-bin'
};

// 根据用户权限找到第一个有权限的路由
function getFirstAccessibleRoute(modulePermissions: Record<string, boolean>): string {
  // 优先顺序
  const priorityOrder = [
    'module:dashboard',
    'module:hsbc_panel',
    'module:case_management',
    'module:case_assignment',
    'module:repayment_records',
    'module:data_export',
    'module:case_import',
    'module:user_management',
    'module:feishu_config',
    'module:feishu_messages',
    'module:recycle_bin'
  ];

  for (const module of priorityOrder) {
    if (modulePermissions[module]) {
      return MODULE_TO_ROUTE[module] || '/dashboard';
    }
  }

  // 如果都没有权限，默认跳转到登录页
  return '/login';
}

export default function SimpleLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (result.success) {
        // 设置localStorage并调用AuthProvider的login方法
        const userData = result.user;
        const token = 'temp-token-' + Date.now();
        
        // 确保userData有必要的字段
        const userWithName = {
          ...userData,
          name: userData.realName || userData.username || userData.name
        };
        
        // 设置localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userWithName));
        
        // 调用AuthProvider的login方法
        login(userWithName, token);
        
        // 根据用户权限跳转到第一个有权限的板块
        const targetRoute = getFirstAccessibleRoute(userWithName.modulePermissions || {});
        router.push(targetRoute);
      } else {
        setError(result.message || '登录失败');
      }
    } catch (err) {
      setError('登录失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center p-4"
      style={{
        backgroundImage: 'url(/login-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* 半透明遮罩层 */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      {/* 登录表单 - 居中叠加在背景之上 */}
      <Card className="w-full max-w-md relative z-10 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">
            欢迎回来
          </CardTitle>
          <p className="text-gray-600 mt-2">贷后案件管理系统</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                required
                className="bg-white/80"
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="bg-white/80"
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
