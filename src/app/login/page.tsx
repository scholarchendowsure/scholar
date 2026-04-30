'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, User, Loader2, Shield, RefreshCw, Image as ImageIcon } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaData, setCaptchaData] = useState<{ id: string; image: string } | null>(null);

  // 获取验证码
  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const res = await fetch('/api/auth/captcha');
      const json = await res.json();
      if (json.success) {
        setCaptchaData(json.data);
      }
    } catch (error) {
      toast.error('获取验证码失败');
    } finally {
      setCaptchaLoading(false);
    }
  };

  // 页面加载时获取验证码
  useEffect(() => {
    fetchCaptcha();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    console.log('handleSubmit called, values:', { username, password, captcha });
    console.log('captchaData:', captchaData);
    
    if (!username || !password) {
      toast.error('请输入用户名和密码');
      return;
    }

    if (!captcha) {
      console.log('captcha is empty:', captcha);
      toast.error('请输入验证码');
      return;
    }

    if (!captchaData) {
      toast.error('请先获取验证码');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        username,
        password,
        captcha,
        captchaId: captchaData.id,
      };
      console.log('Sending login request with data:', requestData);
      
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const json = await res.json();

      if (json.success) {
        toast.success('登录成功');
        localStorage.setItem('token', json.data.token);
        localStorage.setItem('user', JSON.stringify(json.data.user));
        router.push('/');
      } else {
        toast.error(json.error || '登录失败');
        // 登录失败时刷新验证码
        if (json.error?.includes('验证码')) {
          fetchCaptcha();
          setCaptcha('');
        }
      }
    } catch (error) {
      toast.error('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-90 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-90">
            贷后案件管理系统
          </CardTitle>
          <p className="text-slate-500 text-sm">
            请登录您的账户以继续
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700 font-medium">
                用户名
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-11 h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">
                密码
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="captcha" className="text-slate-700 font-medium">
                验证码
              </Label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="captcha"
                    type="text"
                    placeholder="请输入验证码"
                    value={captcha}
                    onChange={(e) => {
                      console.log('captcha input changed:', e.target.value);
                      setCaptcha(e.target.value);
                    }}
                    className="pl-11 h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    autoComplete="off"
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchCaptcha}
                  disabled={captchaLoading}
                  className="h-12 px-4 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  {captchaLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                  ) : captchaData ? (
                    <img
                      src={captchaData.image}
                      alt="验证码"
                      className="h-10 w-auto object-contain"
                    />
                  ) : (
                    <RefreshCw className="w-5 h-5 text-slate-500" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                点击图片刷新验证码
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg shadow-blue-500/25 transition-all"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  登录中...
                </>
              ) : (
                '登 录'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
