'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { KeyRound, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold">两次输入的新密码不一致</div>
          <div className="text-sm text-muted-foreground">请确保确认密码与新密码完全相同</div>
        </div>,
        { duration: 4000 }
      );
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold">新密码长度过短</div>
          <div className="text-sm text-muted-foreground">密码长度必须在6-30位之间，当前长度：{formData.newPassword.length}位</div>
        </div>,
        { duration: 4000 }
      );
      return;
    }

    if (formData.newPassword.length > 30) {
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold">新密码长度过长</div>
          <div className="text-sm text-muted-foreground">密码长度必须在6-30位之间，当前长度：{formData.newPassword.length}位</div>
        </div>,
        { duration: 4000 }
      );
      return;
    }

    setLoading(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('密码修改成功');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        let errorMessage = result.error || '密码修改失败';
        let helpMessage = '';

        // 根据错误类型提供更详细的帮助信息
        if (errorMessage.includes('当前密码不正确')) {
          helpMessage = '请检查输入的当前密码是否正确，如忘记密码请联系管理员重置';
        } else if (errorMessage.includes('密码长度')) {
          helpMessage = '请确保新密码长度在6-30位之间';
        } else if (errorMessage.includes('密码必须包含')) {
          helpMessage = '请确保新密码同时包含大写字母、小写字母、数字和特殊符号（如 !@#$%^&*）';
        } else if (errorMessage.includes('使用过的密码')) {
          helpMessage = '请使用新密码，禁止使用初始密码或最近3次使用过的密码';
        } else if (errorMessage.includes('修改密码次数过多')) {
          helpMessage = '请稍后再试，或联系管理员';
        }

        // 组合错误信息和帮助信息
        if (helpMessage) {
          toast.error(
            <div className="space-y-2">
              <div className="font-semibold">{errorMessage}</div>
              <div className="text-sm text-muted-foreground">{helpMessage}</div>
            </div>,
            { duration: 6000 }
          );
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error('Change password error:', error);
      toast.error('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">修改密码</h1>
          <p className="text-muted-foreground">
            为您的账户设置新密码
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <KeyRound className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>账户安全</CardTitle>
              <CardDescription>
                请输入当前密码和新密码
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
            <h3 className="font-semibold text-foreground mb-2">密码规则要求</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>密码长度：6-30位字符</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>必须包含：大写字母、小写字母、数字、特殊符号（如 !@#$%^&amp;*）</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>禁止使用：初始密码、最近3次使用过的密码</span>
              </li>
            </ul>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">当前密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={handleChange}
                  className="pl-10 pr-10"
                  placeholder="请输入当前密码"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">新密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={handleChange}
                  className="pl-10 pr-10"
                  placeholder="请输入新密码（6-30位，包含大小写字母、数字、特殊符号）"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10 pr-10"
                  placeholder="请再次输入新密码，确保与上面一致"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? '修改中...' : '修改密码'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
              >
                取消
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
