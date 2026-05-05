'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Loader2, RefreshCw, Save, Users, MessageSquare, Send, 
  Bell, Key, CheckCircle, Terminal, Settings, 
  AlertTriangle, Clock, ShieldCheck, Unlink, Search, 
  Database, Trash2, Download
} from 'lucide-react';
import { FeishuPersonalAccount, FeishuPersonalConfig, PersonalSendMode } from '@/types/feishu-personal';
import { CozeApiConfig } from '@/types/coze-api';
import { FeishuWebOAuthToken } from '@/types/feishu-web-oauth';

export default function FeishuMessagePage() {
  const [activeTab, setActiveTab] = useState('personal-account');
  const [loading, setLoading] = useState(false);

  // 当标签页切换到用户存储时加载用户列表
  useEffect(() => {
    if (activeTab === 'user-storage') {
      loadSavedUsers();
    }
  }, [activeTab]);

  // OAuth授权状态
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthToken, setOauthToken] = useState<FeishuWebOAuthToken | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // 个人账号绑定状态
  const [personalAccounts, setPersonalAccounts] = useState<FeishuPersonalAccount[]>([]);
  const [personalConfig, setPersonalConfig] = useState<FeishuPersonalConfig | null>(null);
  const [cliPath, setCliPath] = useState('lark');
  const [personalSendMode, setPersonalSendMode] = useState<PersonalSendMode>('cli');
  const [testingCli, setTestingCli] = useState(false);
  const [cliAvailable, setCliAvailable] = useState(false);
  const [personalTestMessage, setPersonalTestMessage] = useState('');
  const [personalSendingMessage, setPersonalSendingMessage] = useState(false);
  const [personalDirectUserId, setPersonalDirectUserId] = useState('');
  
  // 用户搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // 已保存的用户列表
  const [savedUsers, setSavedUsers] = useState<any[]>([]);
  const [loadingSavedUsers, setLoadingSavedUsers] = useState(false);

  // Coze API 状态
  const [cozeConfig, setCozeConfig] = useState<CozeApiConfig | null>(null);
  const [cozeApiKey, setCozeApiKey] = useState('');
  const [cozeBotId, setCozeBotId] = useState('');
  const [cozeEnabled, setCozeEnabled] = useState(false);
  const [cozeReceiveId, setCozeReceiveId] = useState('');
  const [cozeMessage, setCozeMessage] = useState('');
  const [cozeSending, setCozeSending] = useState(false);
  const [cozeCaseId, setCozeCaseId] = useState('');
  const [cozeReminderType, setCozeReminderType] = useState<'overdue' | 'due' | 'followup' | 'custom'>('overdue');
  const [cozeCustomerName, setCozeCustomerName] = useState('');
  const [cozeOverdueAmount, setCozeOverdueAmount] = useState('');
  const [cozeOverdueDays, setCozeOverdueDays] = useState('');

  // 加载配置
  useEffect(() => {
    loadPersonalConfig();
    loadPersonalAccounts();
    loadCozeConfig();
    loadOAuthStatus();

    // 检查URL中的oauth参数
    const urlParams = new URLSearchParams(window.location.search);
    const oauthStatus = urlParams.get('oauth');
    if (oauthStatus === 'success') {
      toast.success('飞书授权成功');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (oauthStatus === 'error') {
      toast.error('飞书授权失败');
      window.history.replaceState({}, '', window.location.pathname);
    }

    // 定期检查授权状态已关闭
    // const statusInterval = setInterval(() => {
    //   loadOAuthStatus();
    // }, 60000);

    // return () => clearInterval(statusInterval);
  }, []);

  // 加载已保存的用户
  const loadSavedUsers = async () => {
    setLoadingSavedUsers(true);
    try {
      const response = await fetch('/api/feishu-users');
      const data = await response.json();
      if (data.success) {
        setSavedUsers(data.data);
      }
    } catch (error) {
      console.error('加载已保存用户失败:', error);
    } finally {
      setLoadingSavedUsers(false);
    }
  };

  // 删除已保存的用户
  const deleteSavedUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/feishu-users?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('删除成功');
        loadSavedUsers();
      } else {
        toast.error('删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 导出用户数据
  const handleExport = async () => {
    try {
      const response = await fetch('/api/feishu-users?action=export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `feishu-users-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('导出成功');
      } else {
        toast.error('导出失败');
      }
    } catch (error) {
      toast.error('导出失败');
    }
  };

  // 导入用户数据
  const handleImport = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/feishu-users', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || '导入成功');
        loadSavedUsers();
      } else {
        toast.error(data.error || '导入失败');
      }
    } catch (error) {
      toast.error('导入失败');
    }
  };



  // 加载个人账号配置
  const loadPersonalConfig = async () => {
    try {
      const response = await fetch('/api/feishu-personal/config');
      const data = await response.json();
      if (data.success) {
        setPersonalConfig(data.config);
        setCliPath(data.config.cliPath || 'lark');
        setPersonalSendMode(data.config.sendMode || 'cli');
      }
    } catch (error) {
      console.error('加载个人账号配置失败:', error);
    }
  };

  // 加载个人账号列表
  const loadPersonalAccounts = async () => {
    try {
      const response = await fetch('/api/feishu-personal/accounts');
      const data = await response.json();
      if (data.success) {
        setPersonalAccounts(data.accounts);
      }
    } catch (error) {
      console.error('加载个人账号列表失败:', error);
    }
  };

  // 保存个人账号配置
  const savePersonalConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/feishu-personal/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliPath,
          sendMode: personalSendMode
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('个人账号配置保存成功');
        setPersonalConfig(data.config);
      } else {
        toast.error(data.message || '保存失败');
      }
    } catch (error) {
      toast.error('保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 测试lark-cli
  const testCli = async () => {
    setTestingCli(true);
    try {
      const response = await fetch('/api/feishu-personal/test-cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliPath }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(data.message || 'lark-cli可用');
        setCliAvailable(true);
      } else {
        toast.error(data.error || 'lark-cli不可用');
        setCliAvailable(false);
      }
    } catch (error) {
      toast.error('测试lark-cli失败');
      setCliAvailable(false);
    } finally {
      setTestingCli(false);
    }
  };

  // 飞书网页应用OAuth授权相关函数
  const loadOAuthStatus = async () => {
    setCheckingStatus(true);
    try {
      const response = await fetch('/api/feishu-web-oauth/status');
      const data = await response.json();
      if (data.success) {
        setOauthToken(data.token);
      }
    } catch (error) {
      console.error('加载OAuth状态失败:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const startOAuth = async () => {
    setOauthLoading(true);
    try {
      console.log('🚀 开始OAuth授权...');
      const response = await fetch('/api/feishu-web-oauth/authorize');
      console.log('📡 API响应状态:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API响应错误:', response.status, errorText);
        toast.error(`API错误: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      console.log('📦 API返回数据:', data);
      
      if (data.success && data.authUrl) {
        console.log('🔗 准备跳转到:', data.authUrl);
        window.location.href = data.authUrl;
      } else {
        console.error('❌ 获取授权链接失败:', data);
        toast.error(data.error || '获取授权链接失败');
      }
    } catch (error) {
      console.error('💥 启动授权异常:', error);
      toast.error(`启动授权失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setOauthLoading(false);
    }
  };

  const refreshOAuth = async () => {
    if (!oauthToken?.refreshToken) {
      toast.error('没有可刷新的token');
      return;
    }
    setOauthLoading(true);
    try {
      const response = await fetch('/api/feishu-web-oauth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: oauthToken.refreshToken }),
      });
      const data = await response.json();
      if (data.success) {
        setOauthToken(data.token);
        toast.success('授权刷新成功');
      } else {
        toast.error(data.error || '刷新授权失败');
      }
    } catch (error) {
      toast.error('刷新授权失败');
    } finally {
      setOauthLoading(false);
    }
  };

  const revokeOAuth = async () => {
    if (!confirm('确定要解除授权吗？')) {
      return;
    }
    setOauthLoading(true);
    try {
      const response = await fetch('/api/feishu-web-oauth/revoke', {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setOauthToken(null);
        toast.success('已解除授权');
      } else {
        toast.error(data.error || '解除授权失败');
      }
    } catch (error) {
      toast.error('解除授权失败');
    } finally {
      setOauthLoading(false);
    }
  };

  // 搜索飞书用户
  const searchFeishuUser = async () => {
    if (!searchQuery.trim()) {
      toast.error('请输入要搜索的同事名称');
      return;
    }

    setSearching(true);
    setShowSearchResults(false);
    try {
      const response = await fetch('/api/feishu-personal/search-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });
      
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.users || []);
        setShowSearchResults(true);
        if (data.users && data.users.length > 0) {
          toast.success(`找到 ${data.users.length} 个用户`);
        } else {
          toast.info('未找到匹配的用户');
        }
      } else {
        toast.error(data.error || '搜索失败');
        setSearchResults([]);
      }
    } catch (error) {
      toast.error('搜索用户失败');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // 选择搜索结果中的用户
  const selectUser = (user: any) => {
    // 从用户信息中提取Open ID
    const openId = user.openId || user.open_id || user.user_id || user.userId || '';
    setPersonalDirectUserId(openId);
    setSearchQuery(user.name || user.localized_name || '');
    setShowSearchResults(false);
    toast.success(`已选择: ${user.name || user.localized_name || user.enName}`);
  };

  // 发送个人消息
  const sendPersonalMessage = async () => {
    if (!personalDirectUserId || !personalTestMessage) {
      toast.error('请填写接收人ID和消息内容');
      return;
    }

    setPersonalSendingMessage(true);
    try {
      const response = await fetch('/api/feishu-personal/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiveId: personalDirectUserId,
          text: personalTestMessage
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(data.message || '消息发送成功');
        if (data.note) {
          toast.info(data.note);
        }
      } else {
        toast.error(data.error || '消息发送失败');
      }
    } catch (error) {
      toast.error('发送消息失败');
    } finally {
      setPersonalSendingMessage(false);
    }
  };

  // 加载 Coze API 配置
  const loadCozeConfig = async () => {
    try {
      const response = await fetch('/api/coze-api/config');
      const data = await response.json();
      if (data.success) {
        setCozeConfig(data.config);
        setCozeApiKey(data.config.apiKey || '');
        setCozeBotId(data.config.botId || '');
        setCozeEnabled(data.config.isEnabled || false);
      }
    } catch (error) {
      console.error('加载Coze API配置失败:', error);
    }
  };

  // 保存 Coze API 配置
  const saveCozeConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/coze-api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: cozeApiKey,
          botId: cozeBotId,
          isEnabled: cozeEnabled
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Coze API 配置保存成功');
        setCozeConfig(data.config);
      } else {
        toast.error(data.message || '保存失败');
      }
    } catch (error) {
      toast.error('保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 发送 Coze 消息
  const sendCozeMessage = async () => {
    if (!cozeReceiveId || !cozeMessage) {
      toast.error('接收人ID和消息内容不能为空');
      return;
    }

    setCozeSending(true);
    try {
      const response = await fetch('/api/coze-api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiveId: cozeReceiveId,
          message: cozeMessage
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('消息发送成功');
        setCozeMessage('');
      } else {
        toast.error(data.error || '发送失败');
      }
    } catch (error) {
      toast.error('发送消息失败');
    } finally {
      setCozeSending(false);
    }
  };

  // 发送 Coze 提醒
  const sendCozeReminder = async () => {
    if (!cozeReceiveId) {
      toast.error('接收人ID不能为空');
      return;
    }

    setCozeSending(true);
    try {
      const requestBody: any = {
        receiveId: cozeReceiveId,
        reminderType: cozeReminderType === 'custom' ? undefined : cozeReminderType
      };
      
      if (cozeCaseId) requestBody.caseId = cozeCaseId;
      if (cozeCustomerName) requestBody.customerName = cozeCustomerName;
      if (cozeOverdueAmount) requestBody.overdueAmount = parseFloat(cozeOverdueAmount);
      if (cozeOverdueDays) requestBody.overdueDays = parseInt(cozeOverdueDays);
      if (cozeReminderType === 'custom' && cozeMessage) {
        requestBody.customMessage = cozeMessage;
      }
      
      const response = await fetch('/api/coze-api/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('提醒发送成功');
        if (cozeReminderType === 'custom') {
          setCozeMessage('');
        }
      } else {
        toast.error(data.error || '发送失败');
      }
    } catch (error) {
      toast.error('发送提醒失败');
    } finally {
      setCozeSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">飞书消息</h1>
          <p className="text-muted-foreground mt-1">
            通过您的个人飞书账号发送私人消息和Coze AI消息
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="personal-account">
            <Users className="w-4 h-4 mr-2" />
            个人账号绑定
          </TabsTrigger>
          {/* <TabsTrigger value="coze-message">
            <MessageSquare className="w-4 h-4 mr-2" />
            扣子AI消息
          </TabsTrigger> */}
          <TabsTrigger value="user-storage">
            <Database className="w-4 h-4 mr-2" />
            数据存储表
          </TabsTrigger>
        </TabsList>

        {/* 个人账号绑定 */}
        <TabsContent value="personal-account" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：个人账号绑定 */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Terminal className="w-5 h-5 mr-2 text-blue-600" />
                    飞书账号授权
                  </CardTitle>
                  <CardDescription>
                    按照以下步骤在服务器终端完成 lark-cli 授权配置
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm font-medium text-blue-900 mb-2">
                      授权步骤：
                    </div>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                      <li>在服务器终端执行：<code className="bg-blue-100 px-2 py-1 rounded font-mono">lark-cli config init --new</code></li>
                      <li>在服务器终端执行：<code className="bg-blue-100 px-2 py-1 rounded font-mono">lark-cli auth login --recommend</code></li>
                      <li>在浏览器中打开显示的验证链接完成授权</li>
                      <li>在服务器终端执行：<code className="bg-blue-100 px-2 py-1 rounded font-mono">lark-cli auth status</code></li>
                      <li>在服务器终端执行：<code className="bg-blue-100 px-2 py-1 rounded font-mono">lark-cli doctor</code></li>
                    </ol>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="cli-path">lark-cli 路径</Label>
                      <div className="flex gap-2">
                        <Input
                          id="cli-path"
                          value={cliPath}
                          onChange={(e) => setCliPath(e.target.value)}
                          placeholder="lark"
                        />
                        <Button
                          onClick={testCli}
                          disabled={testingCli}
                        >
                          {testingCli ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          测试
                        </Button>
                      </div>
                      {cliAvailable && (
                        <div className="flex items-center text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          lark-cli 可用
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="personal-send-mode">发送模式</Label>
                      <Select value={personalSendMode} onValueChange={(value: PersonalSendMode) => setPersonalSendMode(value)}>
                        <SelectTrigger id="personal-send-mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cli">lark-cli 发送</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button onClick={savePersonalConfig} disabled={loading}>
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      保存配置
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-green-600" />
                    消息测试
                  </CardTitle>
                  <CardDescription>
                    输入飞书同事名称，自动搜索找到对应的 Open ID
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="search-query">搜索同事</Label>
                    <div className="flex gap-2">
                      <Input
                        id="search-query"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="请输入同事名称（如：晨忻、木槿）"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            searchFeishuUser();
                          }
                        }}
                      />
                      <Button
                        onClick={searchFeishuUser}
                        disabled={searching || !searchQuery.trim()}
                      >
                        {searching ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Users className="w-4 h-4 mr-2" />
                        )}
                        搜索
                      </Button>
                    </div>
                  </div>

                  {/* 搜索结果 */}
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="border rounded-lg p-3 bg-muted/50">
                      <div className="text-sm font-medium mb-2">搜索结果（点击选择）</div>
                      <div className="space-y-2">
                        {searchResults.map((user, index) => (
                          <div
                            key={index}
                            onClick={() => selectUser(user)}
                            className="p-3 bg-card border rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                          >
                            <div className="font-medium">
                              {user.name || user.localized_name || '未知用户'}
                              {user.enName && (
                                <span className="text-muted-foreground ml-2">| {user.enName}</span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1 mt-1">
                              {user.company && (
                                <div>公司：{user.company}</div>
                              )}
                              {user.email && (
                                <div>邮箱：{user.email}</div>
                              )}
                              {user.mobile && (
                                <div>手机：{user.mobile}</div>
                              )}
                              {user.chatId && (
                                <div className="font-mono text-xs">聊天ID: {user.chatId}</div>
                              )}
                              <div className="font-mono text-xs">
                                Open ID: {user.openId || user.open_id || user.user_id || user.userId}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="personal-direct-user-id">接收人 Open ID</Label>
                    <Input
                      id="personal-direct-user-id"
                      value={personalDirectUserId}
                      onChange={(e) => setPersonalDirectUserId(e.target.value)}
                      placeholder="搜索后自动填充，或手动输入 Open ID"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="personal-test-message">消息内容</Label>
                    <Textarea
                      id="personal-test-message"
                      value={personalTestMessage}
                      onChange={(e) => setPersonalTestMessage(e.target.value)}
                      placeholder="请输入要发送的消息内容"
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={sendPersonalMessage}
                    disabled={personalSendingMessage || !personalDirectUserId || !personalTestMessage}
                    className="w-full"
                  >
                    {personalSendingMessage ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    发送消息
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2 text-purple-600" />
                    已绑定账号
                  </CardTitle>
                  <CardDescription>
                    查看已绑定的飞书个人账号
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {personalAccounts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无已绑定账号
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {personalAccounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{account.feishuName}</div>
                            <div className="text-sm text-muted-foreground">{account.feishuUserId}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 扣子AI消息 - 已删除
        <TabsContent value="coze-message" className="space-y-6">
          ...
        </TabsContent>
        */}

        {/* 飞书网页应用OAuth授权卡片 */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShieldCheck className="w-5 h-5 mr-2 text-primary" />
                飞书个人授权 (网页应用OAuth)
              </CardTitle>
              <CardDescription>
                使用飞书网页应用OAuth进行个人用户授权，安全、简单、无需安装任何工具
              </CardDescription>
            </CardHeader>
            <CardContent>
              {checkingStatus ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2 text-gray-500" />
                  <span className="text-gray-500">检查授权状态中...</span>
                </div>
              ) : oauthToken ? (
                <div className="space-y-4">
                  {/* 授权状态 */}
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      <div>
                        <div className="font-medium text-green-800">已授权</div>
                        {oauthToken.userName && (
                          <div className="text-sm text-green-700">
                            用户: {oauthToken.userName}
                            {oauthToken.userEmail && ` (${oauthToken.userEmail})`}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-600">有效</Badge>
                  </div>

                  {/* Token有效期 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-gray-500" />
                          Access Token
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm space-y-1">
                          <div className="text-gray-600">
                            过期时间: {new Date(oauthToken.expiresAt).toLocaleString()}
                          </div>
                          {oauthToken.expiresAt < Date.now() + 3600000 ? (
                            <div className="flex items-center text-amber-600">
                              <AlertTriangle className="w-4 h-4 mr-1" />
                              <span>即将过期</span>
                            </div>
                          ) : (
                            <div className="text-green-600">有效期内</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center">
                          <RefreshCw className="w-4 h-4 mr-2 text-gray-500" />
                          Refresh Token
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm space-y-1">
                          {oauthToken.refreshTokenExpiresAt ? (
                            <div className="text-gray-600">
                              过期时间: {new Date(oauthToken.refreshTokenExpiresAt).toLocaleString()}
                            </div>
                          ) : (
                            <div className="text-gray-600">长期有效</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-3">
                    <Button
                      onClick={refreshOAuth}
                      disabled={oauthLoading || !oauthToken.refreshToken}
                      className="flex-1"
                    >
                      {oauthLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      刷新授权
                    </Button>
                    <Button
                      onClick={revokeOAuth}
                      disabled={oauthLoading}
                      variant="destructive"
                      className="flex-1"
                    >
                      {oauthLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Unlink className="w-4 h-4 mr-2" />
                      )}
                      解除授权
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Key className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">尚未授权</h3>
                  <p className="text-gray-500 mb-6">
                    使用飞书网页应用OAuth进行个人用户授权，安全、简单、无需安装任何工具
                  </p>
                  <div className="space-y-4">
                    <Button
                      onClick={startOAuth}
                      disabled={oauthLoading}
                      size="lg"
                    >
                      {oauthLoading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Key className="w-5 h-5 mr-2" />
                      )}
                      一键授权
                    </Button>
                    
                    {/* 直接测试链接 */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800 mb-2 font-medium">
                        🔗 或者直接点击下方链接测试：
                      </p>
                      <a
                        href="https://open.feishu.cn/open-apis/oauth2/authorize?app_id=cli_a9652497d7389bd6&redirect_uri=https%3A%2F%2Fbdb3c66d-9731-4e87-ac56-61da97d57fff.dev.coze.site%2Fapi%2Ffeishu-web-oauth%2Fcallback&response_type=code&state=direct_test_123&scope=user%3Aprofile"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-blue-600 hover:text-blue-800 underline break-all"
                      >
                        https://open.feishu.cn/open-apis/oauth2/authorize?app_id=cli_a9652497d7389bd6&amp;redirect_uri=https%3A%2F%2Fbdb3c66d-9731-4e87-ac56-61da97d57fff.dev.coze.site%2Fapi%2Ffeishu-web-oauth%2Fcallback&amp;response_type=code&amp;state=direct_test_123&amp;scope=user%3Aprofile
                      </a>
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      需要先配置飞书网页应用的 App ID 和 App Secret
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 用户数据存储表 */}
        <TabsContent value="user-storage" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2 text-purple-600" />
                  已保存的飞书用户
                </CardTitle>
                <CardDescription>
                  所有搜索过的用户都会自动保存到这里
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSavedUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2 text-gray-500" />
                    <span className="text-gray-500">加载用户数据中...</span>
                  </div>
                ) : savedUsers.length === 0 ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">暂无保存的用户</h3>
                    <p className="text-gray-500 mb-6">
                      在"个人账号绑定"中搜索同事后，用户信息会自动保存到这里
                    </p>
                    <Button onClick={loadSavedUsers} className="w-full">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      刷新
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        共 {savedUsers.length} 个用户
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="file"
                          id="import-file"
                          accept=".json"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImport(file);
                              e.target.value = '';
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => document.getElementById('import-file')?.click()}
                        >
                          <Database className="w-4 h-4 mr-2" />
                          导入
                        </Button>
                        <Button size="sm" variant="secondary" onClick={handleExport}>
                          <Download className="w-4 h-4 mr-2" />
                          导出
                        </Button>
                        <Button onClick={loadSavedUsers} size="sm">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          刷新
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border rounded-lg overflow-hidden">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">姓名</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">公司</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Open ID</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">聊天ID</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {savedUsers.map((user) => (
                            <tr key={user.id || user.openId || user.userId} className="hover:bg-muted/50">
                              <td className="px-4 py-3">
                                <div className="font-medium">
                                  {user.name}
                                  {user.enName && (
                                    <span className="text-muted-foreground ml-2">| {user.enName}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {user.company || '-'}
                              </td>
                              <td className="px-4 py-3">
                                <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                  {user.openId || user.open_id || user.userId || user.user_id || '-'}
                                </code>
                              </td>
                              <td className="px-4 py-3">
                                <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                  {user.chatId || '-'}
                                </code>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                      // 快速选择此用户
                                      const openId = user.openId || user.open_id || user.userId || user.user_id || '';
                                      setPersonalDirectUserId(openId);
                                      setActiveTab('personal-account');
                                      toast.success(`已选择: ${user.name}`);
                                    }}
                                  >
                                    <Send className="w-3 h-3 mr-1" />
                                    选择
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteSavedUser(user.id || user.openId || user.userId)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
