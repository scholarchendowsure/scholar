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
  Link, AlertTriangle, Clock, ShieldCheck, Unlink
} from 'lucide-react';
import { FeishuPersonalAccount, FeishuPersonalConfig, PersonalSendMode } from '@/types/feishu-personal';
import { CozeApiConfig } from '@/types/coze-api';
import { FeishuOAuthToken } from '@/types/feishu-oauth';

export default function FeishuMessagePage() {
  const [activeTab, setActiveTab] = useState('personal-account');
  const [loading, setLoading] = useState(false);

  // OAuth授权状态
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthToken, setOauthToken] = useState<FeishuOAuthToken | null>(null);
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

    // 定期检查授权状态（每30秒检查一次）
    const statusInterval = setInterval(() => {
      loadOAuthStatus();
    }, 30000);

    return () => clearInterval(statusInterval);
  }, []);



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

  // lark-cli授权相关函数
  const loadOAuthStatus = async () => {
    setCheckingStatus(true);
    try {
      const response = await fetch('/api/lark-cli/status');
      const data = await response.json();
      if (data.success) {
        if (data.isAuthenticated) {
          // 模拟一个token对象用于UI展示
          setOauthToken({
            accessToken: 'lark-cli-token',
            tokenType: 'Bearer',
            expiresAt: Date.now() + 86400000 * 365, // 模拟1年有效期
            refreshToken: 'lark-cli-refresh',
            userId: data.userInfo?.user_id,
            userName: data.userInfo?.name || 'lark-cli用户',
            userEmail: data.userInfo?.email,
            userAvatar: data.userInfo?.avatar_url,
            createdAt: Date.now(),
          });
        } else {
          setOauthToken(null);
        }
      }
    } catch (error) {
      console.error('加载lark-cli状态失败:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const startOAuth = async () => {
    setOauthLoading(true);
    try {
      const response = await fetch('/api/lark-cli/auth', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message || '已启动授权流程，请在浏览器中完成授权');
        // 等待一下后刷新状态
        setTimeout(() => {
          loadOAuthStatus();
        }, 3000);
      } else {
        toast.error(data.error || '启动授权失败');
        if (data.hint) {
          toast.info(data.hint);
        }
      }
    } catch (error) {
      toast.error('启动授权失败');
    } finally {
      setOauthLoading(false);
    }
  };

  const refreshOAuth = async () => {
    toast.info('lark-cli会自动维护令牌有效性，无需手动刷新');
    // 重新检查状态
    loadOAuthStatus();
  };

  const revokeOAuth = async () => {
    if (!confirm('确定要解除授权吗？\n\n注意：这需要手动执行 lark-cli auth logout 命令')) {
      return;
    }
    toast.info('请在终端执行: lark-cli auth logout');
    setOauthToken(null);
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
    setPersonalDirectUserId(user.open_id);
    setSearchQuery(user.localized_name || user.name || '');
    setShowSearchResults(false);
    toast.success(`已选择: ${user.localized_name || user.name}`);
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
          <TabsTrigger value="coze-message">
            <MessageSquare className="w-4 h-4 mr-2" />
            扣子AI消息
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
                            <div className="font-medium">{user.localized_name || user.name}</div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              {user.department && (
                                <div>部门：{user.department}</div>
                              )}
                              {user.enterprise_email && (
                                <div>邮箱：{user.enterprise_email}</div>
                              )}
                              <div className="font-mono text-xs">Open ID: {user.open_id}</div>
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

        {/* 扣子AI消息 */}
        <TabsContent value="coze-message" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：扣子AI消息发送 */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-indigo-600" />
                    Coze API 配置
                  </CardTitle>
                  <CardDescription>
                    配置 Coze API Key 和 Bot ID
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="coze-api-key">API Key</Label>
                    <Input
                      id="coze-api-key"
                      type="password"
                      value={cozeApiKey}
                      onChange={(e) => setCozeApiKey(e.target.value)}
                      placeholder="请输入 Coze API Key"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coze-bot-id">Bot ID</Label>
                    <Input
                      id="coze-bot-id"
                      value={cozeBotId}
                      onChange={(e) => setCozeBotId(e.target.value)}
                      placeholder="请输入 Bot ID"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="coze-enabled"
                      checked={cozeEnabled}
                      onCheckedChange={setCozeEnabled}
                    />
                    <Label htmlFor="coze-enabled">启用 Coze 消息</Label>
                  </div>

                  <Button onClick={saveCozeConfig} disabled={loading}>
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    保存配置
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-indigo-600" />
                    消息测试
                  </CardTitle>
                  <CardDescription>
                    发送普通消息给飞书同事
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="coze-receive-id">接收人 ID</Label>
                    <Input
                      id="coze-receive-id"
                      value={cozeReceiveId}
                      onChange={(e) => setCozeReceiveId(e.target.value)}
                      placeholder="请输入接收人的 Open ID"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coze-message">消息内容</Label>
                    <Textarea
                      id="coze-message"
                      value={cozeMessage}
                      onChange={(e) => setCozeMessage(e.target.value)}
                      placeholder="请输入要发送的消息内容"
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={sendCozeMessage}
                    disabled={cozeSending || !cozeReceiveId || !cozeMessage}
                    className="w-full"
                  >
                    {cozeSending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    发送消息
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* 右侧：贷后提醒测试 */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="w-5 h-5 mr-2 text-orange-600" />
                    贷后提醒测试
                  </CardTitle>
                  <CardDescription>
                    发送贷后提醒给飞书同事
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="coze-reminder-receive-id">接收人 ID</Label>
                    <Input
                      id="coze-reminder-receive-id"
                      value={cozeReceiveId}
                      onChange={(e) => setCozeReceiveId(e.target.value)}
                      placeholder="请输入接收人的 Open ID"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coze-reminder-type">提醒类型</Label>
                    <Select value={cozeReminderType} onValueChange={(value: any) => setCozeReminderType(value)}>
                      <SelectTrigger id="coze-reminder-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="overdue">🔴 逾期催收提醒</SelectItem>
                        <SelectItem value="due">🟠 还款到期提醒</SelectItem>
                        <SelectItem value="followup">🔵 跟进任务提醒</SelectItem>
                        <SelectItem value="custom">🟣 自定义消息</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {cozeReminderType !== 'custom' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="coze-case-id">案件 ID</Label>
                        <Input
                          id="coze-case-id"
                          value={cozeCaseId}
                          onChange={(e) => setCozeCaseId(e.target.value)}
                          placeholder="请输入案件 ID"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="coze-customer-name">客户姓名</Label>
                        <Input
                          id="coze-customer-name"
                          value={cozeCustomerName}
                          onChange={(e) => setCozeCustomerName(e.target.value)}
                          placeholder="请输入客户姓名"
                        />
                      </div>

                      {cozeReminderType === 'overdue' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="coze-overdue-amount">逾期金额</Label>
                            <Input
                              id="coze-overdue-amount"
                              type="number"
                              value={cozeOverdueAmount}
                              onChange={(e) => setCozeOverdueAmount(e.target.value)}
                              placeholder="请输入逾期金额"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="coze-overdue-days">逾期天数</Label>
                            <Input
                              id="coze-overdue-days"
                              type="number"
                              value={cozeOverdueDays}
                              onChange={(e) => setCozeOverdueDays(e.target.value)}
                              placeholder="请输入逾期天数"
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {cozeReminderType === 'custom' && (
                    <div className="space-y-2">
                      <Label htmlFor="coze-custom-message">自定义消息</Label>
                      <Textarea
                        id="coze-custom-message"
                        value={cozeMessage}
                        onChange={(e) => setCozeMessage(e.target.value)}
                        placeholder="请输入自定义消息内容"
                        rows={4}
                      />
                    </div>
                  )}

                  <Button
                    onClick={sendCozeReminder}
                    disabled={cozeSending || !cozeReceiveId}
                    className="w-full"
                  >
                    {cozeSending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Bell className="w-4 h-4 mr-2" />
                    )}
                    发送提醒
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Key className="w-5 h-5 mr-2 text-gray-600" />
                    API 调用文档
                  </CardTitle>
                  <CardDescription>
                    贷后系统调用示例
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-gray-300">
{`// 发送逾期催收提醒
POST /api/coze-api/send-reminder
{
  "receiveId": "接收人ID",
  "reminderType": "overdue",
  "caseId": "CASE001",
  "customerName": "张三",
  "overdueAmount": 5000,
  "overdueDays": 30
}

// 发送还款到期提醒
POST /api/coze-api/send-reminder
{
  "receiveId": "接收人ID",
  "reminderType": "due",
  "caseId": "CASE002",
  "customerName": "李四"
}

// 发送自定义消息
POST /api/coze-api/send-reminder
{
  "receiveId": "接收人ID",
  "customMessage": "自定义消息内容"
}`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* lark-cli授权卡片 */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Terminal className="w-5 h-5 mr-2 text-primary" />
                飞书个人授权 (lark-cli)
              </CardTitle>
              <CardDescription>
                使用 lark-cli 进行个人用户授权，支持自动刷新令牌、永久保存
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

                  {/* lark-cli信息 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center">
                          <Settings className="w-4 h-4 mr-2 text-gray-500" />
                          lark-cli 状态
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm space-y-1">
                          <div className="text-green-600 flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            <span>自动刷新已启用</span>
                          </div>
                          <div className="text-gray-600">
                            每50分钟自动刷新令牌
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center">
                          <Save className="w-4 h-4 mr-2 text-gray-500" />
                          配置存储
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm space-y-1">
                          <div className="text-gray-600">
                            令牌永久保存到本地配置文件
                          </div>
                          <div className="text-gray-500 text-xs">
                            支持跨会话保持登录状态
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-3">
                    <Button
                      onClick={refreshOAuth}
                      disabled={oauthLoading}
                      className="flex-1"
                    >
                      {oauthLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      检查状态
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
                    <Terminal className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">尚未授权</h3>
                  <p className="text-gray-500 mb-6">
                    使用 lark-cli 进行个人用户授权，支持自动刷新令牌、永久保存到本地配置文件
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
                    <div className="text-xs text-gray-400">
                      需要先安装 lark-cli：
                      <a href="https://github.com/larksuite/lark-cli" target="_blank" rel="noopener noreferrer" 
                         className="text-primary hover:underline ml-1">
                        查看安装说明
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}
