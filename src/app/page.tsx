'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User, 
  Lock, 
  Smartphone, 
  Image as ImageIcon, 
  Eye, 
  EyeOff, 
  RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [captchaBg, setCaptchaBg] = useState('');
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    phone: '',
    smsCode: '',
    imageCode: ''
  });

  // 生成随机图形验证码
  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(result);
    
    // 生成随机背景色
    const bg = `linear-gradient(45deg, 
      hsl(${Math.random() * 60 + 200}, 70%, 60%), 
      hsl(${Math.random() * 60 + 260}, 70%, 60%)
    )`;
    setCaptchaBg(bg);
  };

  // 客户端初始化
  useEffect(() => {
    setMounted(true);
    generateCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 模拟登录请求
    setTimeout(() => {
      setLoading(false);
      toast.error('用户名或密码错误');
    }, 1500);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">学者管理系统</h1>
          <p className="text-slate-600">请登录以继续使用系统</p>
        </div>

        {/* 登录卡片 */}
        <Card className="border-slate-200 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-800">用户登录</CardTitle>
            <CardDescription>输入您的账户信息进行登录</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 用户名 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">用户名</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="请输入用户名"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* 密码 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="请输入密码"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 手机号码 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">手机号码</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="tel"
                    placeholder="请输入手机号码"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="pl-10"
                    maxLength={11}
                  />
                </div>
              </div>

              {/* 短信验证码 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">短信验证码</label>
                <div className="flex gap-3">
                  <Input
                    type="text"
                    placeholder="请输入验证码"
                    value={form.smsCode}
                    onChange={(e) => setForm({ ...form, smsCode: e.target.value })}
                    className="flex-1"
                    maxLength={6}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => toast.success('验证码已发送')}
                    className="whitespace-nowrap"
                  >
                    获取验证码
                  </Button>
                </div>
              </div>

              {/* 图形验证码 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">图形验证码</label>
                <div className="flex gap-3">
                  <Input
                    type="text"
                    placeholder="请输入验证码"
                    value={form.imageCode}
                    onChange={(e) => setForm({ ...form, imageCode: e.target.value })}
                    className="flex-1"
                    maxLength={4}
                  />
                  <button
                    type="button"
                    onClick={generateCaptcha}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors select-none font-mono text-xl font-bold"
                    style={{ background: captchaBg }}
                  >
                    <span className="text-white tracking-widest">{captcha}</span>
                    <RefreshCw className="w-4 h-4 text-white/80" />
                  </button>
                </div>
              </div>

              {/* 登录按钮 */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {loading ? '登录中...' : '登录'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 底部提示 */}
        <div className="text-center mt-6">
          <p className="text-sm text-slate-500">
            忘记密码？请联系系统管理员重置密码
          </p>
        </div>
      </div>
    </div>
  );
}
