'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Loader2, RefreshCw, Save, Users, Settings, Link, Trash2, 
  MessageSquare, Search, Send, Database, ArrowRightLeft, 
  Cloud, Download, Upload, Activity 
} from 'lucide-react';
import { FeishuBitableConfig, BitableSyncRecord, DEFAULT_BITABLE_FIELDS } from '@/types/feishu-bitable';

// 类型定义
interface FeishuUser {
  id: string;
  userId: string;
  name: string;
  email?: string;
  mobile?: string;
  status: 'active' | 'inactive';
}

interface MerchantSalesMapping {
  id: string;
  merchantId: string;
  salesFeishuName: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface MerchantSalesFeishuMapping {
  id: string;
  merchantId: string;
  salesName: string;
  feishuUserId?: string;
  feishuUserName?: string;
}

export default function FeishuConfigPage() {
  const [activeTab, setActiveTab] = useState('app-config');
  const [loading, setLoading] = useState(false);
  
  // 应用配置状态
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [sendMode, setSendMode] = useState<'private' | 'webhook'>('private');
  
  // 飞书用户状态
  const [feishuUsers, setFeishuUsers] = useState<FeishuUser[]>([]);
  const [syncingUsers, setSyncingUsers] = useState(false);
  
  // 商户-销售映射状态
  const [mappings, setMappings] = useState<MerchantSalesFeishuMapping[]>([]);
  const [merchantMappings, setMerchantMappings] = useState<MerchantSalesMapping[]>([]);

  // 消息测试状态
  const [colleagueSearch, setColleagueSearch] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchResults, setSearchResults] = useState<FeishuUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<FeishuUser | null>(null);
  const [directUserId, setDirectUserId] = useState('');
  const [useDirectUserId, setUseDirectUserId] = useState(false);
  const [idType, setIdType] = useState<'user_id' | 'open_id' | 'union_id'>('open_id');

  // 多维表格配置状态
  const [bitableConfigs, setBitableConfigs] = useState<FeishuBitableConfig[]>([]);
  const [bitableAppId, setBitableAppId] = useState('');
  const [bitableAppToken, setBitableAppToken] = useState('');
  const [bitableTableId, setBitableTableId] = useState('');
  const [bitableSyncEnabled, setBitableSyncEnabled] = useState(true);
  const [bitableSyncDirection, setBitableSyncDirection] = useState<'bidirectional' | 'to-coze' | 'to-feishu'>('bidirectional');
  const [bitableFieldMapping, setBitableFieldMapping] = useState<Record<string, string>>({});
  const [syncingBitable, setSyncingBitable] = useState(false);
  const [syncRecords, setSyncRecords] = useState<BitableSyncRecord[]>([]);
  const [selectedBitableConfig, setSelectedBitableConfig] = useState<FeishuBitableConfig | null>(null);

  // 加载配置
  useEffect(() => {
    loadConfig();
    loadFeishuUsers();
    loadMappings();
    loadMerchantMappings();
    loadBitableConfigs();
  }, []);

  // 加载应用配置
  const loadConfig = async () => {
    try {
      const response = await fetch('/api/feishu-config');
      const data = await response.json();
      if (data.success) {
        setAppId(data.config.appId || '');
        setWebhookUrl(data.config.webhookUrl || '');
        setSendMode(data.config.sendMode || 'private');
      }
    } catch (error) {
      console.error('加载飞书配置失败:', error);
    }
  };

  // 加载飞书用户
  const loadFeishuUsers = async () => {
    try {
      const response = await fetch('/api/feishu-users');
      const data = await response.json();
      if (data.success) {
        setFeishuUsers(data.users || []);
      }
    } catch (error) {
      console.error('加载飞书用户失败:', error);
    }
  };

  // 加载映射
  const loadMappings = async () => {
    try {
      const response = await fetch('/api/feishu-mappings');
      const data = await response.json();
      if (data.success) {
        setMappings(data.mappings || []);
      }
    } catch (error) {
      console.error('加载映射失败:', error);
    }
  };

  // 加载商户-销售映射
  const loadMerchantMappings = async () => {
    try {
      const response = await fetch('/api/merchant-sales-mappings?page=1&pageSize=1000');
      const data = await response.json();
      if (data.success) {
        setMerchantMappings(data.mappings || []);
      }
    } catch (error) {
      console.error('加载商户-销售映射失败:', error);
    }
  };

  // 加载多维表格配置
  const loadBitableConfigs = async () => {
    try {
      const response = await fetch('/api/feishu-bitable');
      const data = await response.json();
      if (data.success) {
        setBitableConfigs(data.configs || []);
        if (data.configs && data.configs.length > 0) {
          const config = data.configs[0];
          setSelectedBitableConfig(config);
          setBitableAppId(config.appId);
          setBitableAppToken(config.appToken);
          setBitableTableId(config.tableId);
          setBitableSyncEnabled(config.syncEnabled);
          setBitableSyncDirection(config.syncDirection);
          setBitableFieldMapping(config.fieldMapping || {});
          
          // 加载同步记录
          loadSyncRecords(config.id);
        }
      }
    } catch (error) {
      console.error('加载多维表格配置失败:', error);
    }
  };

  // 加载同步记录
  const loadSyncRecords = async (configId: string) => {
    try {
      const response = await fetch(`/api/feishu-bitable/${configId}/sync-records`);
      const data = await response.json();
      if (data.success) {
        setSyncRecords(data.records || []);
      }
    } catch (error) {
      console.error('加载同步记录失败:', error);
    }
  };

  // 保存应用配置
  const saveAppConfig = async () => {
    if (!appId && !webhookUrl) {
      toast.error('请至少配置App ID或Webhook URL');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/feishu-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId,
          appSecret,
          webhookUrl,
          sendMode,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('配置保存成功');
        if (appSecret) {
          setAppSecret('');
        }
      } else {
        toast.error(data.message || '保存失败');
      }
    } catch (error) {
      toast.error('保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 同步飞书用户
  const syncFeishuUsers = async () => {
    if (!appId) {
      toast.error('请先配置App ID和App Secret');
      return;
    }

    setSyncingUsers(true);
    try {
      const response = await fetch('/api/feishu-users/sync', {
        method: 'POST',
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(`成功同步 ${data.count} 个用户`);
        await loadFeishuUsers();
      } else {
        toast.error(data.message || '同步失败');
      }
    } catch (error) {
      toast.error('同步用户失败');
    } finally {
      setSyncingUsers(false);
    }
  };

  // 更新映射的飞书用户
  const updateMappingFeishuUser = async (
    mappingId: string, 
    feishuUserId: string, 
    feishuUserName: string
  ) => {
    try {
      const mapping = mappings.find(m => m.id === mappingId);
      if (!mapping) return;

      const response = await fetch('/api/feishu-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: mapping.merchantId,
          salesName: mapping.salesName,
          feishuUserId,
          feishuUserName,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('映射更新成功');
        await loadMappings();
      } else {
        toast.error(data.message || '更新失败');
      }
    } catch (error) {
      toast.error('更新映射失败');
    }
  };

  // 从商户映射创建飞书映射
  const createMappingFromMerchant = async (merchantMapping: MerchantSalesMapping) => {
    try {
      const response = await fetch('/api/feishu-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: merchantMapping.merchantId,
          salesName: merchantMapping.salesFeishuName,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('映射创建成功');
        await loadMappings();
      } else {
        toast.error(data.message || '创建失败');
      }
    } catch (error) {
      toast.error('创建映射失败');
    }
  };

  // 删除映射
  const deleteMapping = async (mappingId: string) => {
    if (!confirm('确定要删除这个映射吗？')) return;
    
    try {
      const response = await fetch(`/api/feishu-mappings?id=${mappingId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('映射删除成功');
        await loadMappings();
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch (error) {
      toast.error('删除映射失败');
    }
  };

  // 搜索同事（实时搜索飞书并自动保存）
  const handleSearchColleague = async () => {
    if (!colleagueSearch.trim()) {
      setSearchResults([]);
      setSelectedUser(null);
      return;
    }

    setSendingMessage(true); // 复用发送状态表示搜索中
    try {
      // 使用实时搜索API搜索并保存
      const response = await fetch(
        `/api/feishu-search-save?action=search-and-save&keyword=${encodeURIComponent(colleagueSearch)}`
      );
      
      const data = await response.json();
      
      if (data.success) {
        console.log('🔍 搜索结果:', data);
        setSearchResults(data.users || []);
        
        // 刷新已保存的用户列表
        await loadFeishuUsers();
        
        if (data.count === 0) {
          toast.warning('未找到匹配的同事，请尝试其他关键词');
        } else if (data.count === 1) {
          setSelectedUser(data.users[0]);
          toast.success(`找到并保存了 ${data.count} 个用户`);
        } else {
          toast.success(`找到并保存了 ${data.count} 个用户，请选择一个`);
        }
      } else {
        toast.error(data.message || '搜索失败');
      }
    } catch (error) {
      console.error('搜索同事失败:', error);
      toast.error('搜索失败，请稍后重试');
      
      // 搜索失败时，fallback到本地搜索
      const localResults = feishuUsers.filter(user => 
        user.name.includes(colleagueSearch)
      );
      setSearchResults(localResults);
      
      if (localResults.length > 0) {
        toast.info('已从本地缓存中找到用户');
      }
    } finally {
      setSendingMessage(false);
    }
  };

  // 发送测试消息
  const sendTestMessage = async () => {
    const targetUserId = useDirectUserId ? directUserId : selectedUser?.userId;
    
    if (!targetUserId) {
      toast.error(useDirectUserId ? '请输入飞书User ID' : '请先选择要发送消息的同事');
      return;
    }
    if (!testMessage.trim()) {
      toast.error('请输入测试消息内容');
      return;
    }

    setSendingMessage(true);
    try {
      const response = await fetch('/api/feishu-send-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          message: testMessage,
          idType: idType,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('测试消息发送成功！');
        setTestMessage('');
      } else {
        toast.error(data.message || '发送失败');
      }
    } catch (error) {
      toast.error('发送消息失败');
    } finally {
      setSendingMessage(false);
    }
  };

  // 保存多维表格配置
  const saveBitableConfig = async () => {
    if (!bitableAppId || !bitableAppToken || !bitableTableId) {
      toast.error('请填写完整的多维表格信息');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/feishu-bitable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: bitableAppId,
          appToken: bitableAppToken,
          tableId: bitableTableId,
          syncEnabled: bitableSyncEnabled,
          syncDirection: bitableSyncDirection,
          fieldMapping: bitableFieldMapping,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('多维表格配置保存成功');
        await loadBitableConfigs();
      } else {
        toast.error(data.message || '保存失败');
      }
    } catch (error) {
      toast.error('保存多维表格配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 执行同步
  const executeSync = async (direction: 'to-coze' | 'to-feishu' | 'bidirectional') => {
    if (!selectedBitableConfig) {
      toast.error('请先配置多维表格');
      return;
    }

    setSyncingBitable(true);
    try {
      const response = await fetch('/api/feishu-bitable/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configId: selectedBitableConfig.id,
          direction,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(data.message || '同步成功');
        await loadSyncRecords(selectedBitableConfig.id);
        await loadBitableConfigs();
      } else {
        toast.error(data.message || '同步失败');
      }
    } catch (error) {
      toast.error('同步失败');
    } finally {
      setSyncingBitable(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">飞书配置</h1>
          <p className="text-muted-foreground mt-1">
            配置飞书企业应用，管理用户和消息发送
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="app-config">
            <Settings className="w-4 h-4 mr-2" />
            应用配置
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            用户管理
          </TabsTrigger>
          <TabsTrigger value="mappings">
            <Link className="w-4 h-4 mr-2" />
            映射配置
          </TabsTrigger>
          <TabsTrigger value="message-test">
            <MessageSquare className="w-4 h-4 mr-2" />
            消息测试
          </TabsTrigger>
          <TabsTrigger value="bitable-sync">
            <Database className="w-4 h-4 mr-2" />
            多维表格同步
          </TabsTrigger>
        </TabsList>

        {/* 应用配置 */}
        <TabsContent value="app-config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>飞书企业应用配置</CardTitle>
              <CardDescription>
                配置飞书自建企业应用的 App ID 和 App Secret
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="appId">App ID</Label>
                <Input
                  id="appId"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="请输入飞书应用的 App ID"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="appSecret">App Secret</Label>
                <Input
                  id="appSecret"
                  type="password"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder="请输入飞书应用的 App Secret（留空则不修改）"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sendMode">消息发送模式</Label>
                <Select value={sendMode} onValueChange={(v: 'private' | 'webhook') => setSendMode(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">私聊消息（通过企业应用）</SelectItem>
                    <SelectItem value="webhook">群聊消息（通过Webhook）</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {sendMode === 'webhook' && (
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="请输入飞书群聊机器人 Webhook URL"
                  />
                </div>
              )}

              <Button onClick={saveAppConfig} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    保存配置
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 用户管理 */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>飞书用户</CardTitle>
                  <CardDescription>
                    从飞书企业同步用户列表，用于消息发送
                  </CardDescription>
                </div>
                <Button onClick={syncFeishuUsers} disabled={syncingUsers || !appId}>
                  {syncingUsers ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      同步中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      同步用户
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {feishuUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无用户，请先配置应用并同步用户
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>邮箱</TableHead>
                      <TableHead>手机号</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feishuUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email || '-'}</TableCell>
                        <TableCell>{user.mobile || '-'}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.status === 'active' ? '活跃' : '未激活'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 映射配置 */}
        <TabsContent value="mappings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>商户-销售-飞书用户映射</CardTitle>
              <CardDescription>
                配置商户、销售人员和飞书用户的映射关系
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 待配置的商户映射 */}
              {merchantMappings.filter(mm => !mappings.find(m => m.merchantId === mm.merchantId)).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3">待配置的商户</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>商户ID</TableHead>
                        <TableHead>销售人员</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {merchantMappings
                        .filter(mm => !mappings.find(m => m.merchantId === mm.merchantId))
                        .map((mapping) => (
                          <TableRow key={mapping.id}>
                            <TableCell>{mapping.merchantId}</TableCell>
                            <TableCell>{mapping.salesFeishuName}</TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                onClick={() => createMappingFromMerchant(mapping)}
                              >
                                添加配置
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* 已配置的映射 */}
              {mappings.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3">已配置的映射</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>商户ID</TableHead>
                        <TableHead>销售人员</TableHead>
                        <TableHead>飞书用户</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappings.map((mapping) => (
                        <TableRow key={mapping.id}>
                          <TableCell>{mapping.merchantId}</TableCell>
                          <TableCell>{mapping.salesName}</TableCell>
                          <TableCell>
                            <Select
                              value={mapping.feishuUserId || ''}
                              onValueChange={(value) => {
                                const user = feishuUsers.find(u => u.userId === value || u.id === value);
                                if (user) {
                                  updateMappingFeishuUser(mapping.id, user.userId, user.name);
                                }
                              }}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="选择飞书用户" />
                              </SelectTrigger>
                              <SelectContent>
                                {feishuUsers.map((user) => (
                                  <SelectItem key={user.id} value={user.userId}>
                                    {user.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteMapping(mapping.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {mappings.length === 0 && merchantMappings.filter(mm => !mappings.find(m => m.merchantId === mm.merchantId)).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  暂无映射配置，请先在商户-销售映射中添加数据
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 消息测试 */}
        <TabsContent value="message-test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>消息测试</CardTitle>
              <CardDescription>
                搜索同事或直接输入User ID发送测试消息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 选择发送方式 */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    variant={!useDirectUserId ? 'default' : 'secondary'}
                    onClick={() => setUseDirectUserId(false)}
                  >
                    搜索同事
                  </Button>
                  <Button
                    variant={useDirectUserId ? 'default' : 'secondary'}
                    onClick={() => setUseDirectUserId(true)}
                  >
                    直接输入User ID
                  </Button>
                </div>

                {!useDirectUserId ? (
                  /* 搜索同事模式 */
                  <div className="space-y-4">
                    <div className="flex gap-4 items-end">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="colleagueSearch">同事花名</Label>
                        <div className="flex gap-2">
                          <Input
                            id="colleagueSearch"
                            value={colleagueSearch}
                            onChange={(e) => setColleagueSearch(e.target.value)}
                            placeholder="请输入同事花名中的汉字（如：晨忻）"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSearchColleague();
                              }
                            }}
                          />
                          <Button onClick={handleSearchColleague} disabled={sendingMessage}>
                            <Search className="w-4 h-4 mr-2" />
                            {sendingMessage ? '搜索中...' : '搜索并保存'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* 搜索结果 */}
                    {searchResults.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>搜索结果（已自动保存到用户管理）</Label>
                          <span className="text-sm text-muted-foreground">
                            找到 {searchResults.length} 位同事
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {searchResults.map((user) => (
                            <Button
                              key={user.id}
                              variant={selectedUser?.id === user.id ? 'default' : 'secondary'}
                              className="justify-start text-left"
                              onClick={() => setSelectedUser(user)}
                            >
                              {user.name}
                              {user.userId && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  ID: {user.userId}
                                </span>
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 选中的用户 */}
                    {selectedUser && (
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{selectedUser.name}</p>
                            <p className="text-sm text-muted-foreground">
                              User ID: {selectedUser.userId || selectedUser.id}
                            </p>
                            {selectedUser.email && (
                              <p className="text-sm text-muted-foreground">
                                {selectedUser.email}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedUser(null)}
                          >
                            清除
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* 直接输入ID模式 */
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="directUserId">User ID</Label>
                      <div className="flex gap-2">
                        <Select value={idType} onValueChange={(v: any) => setIdType(v)}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user_id">User ID</SelectItem>
                            <SelectItem value="open_id">Open ID</SelectItem>
                            <SelectItem value="union_id">Union ID</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          id="directUserId"
                          value={directUserId}
                          onChange={(e) => setDirectUserId(e.target.value)}
                          placeholder="请输入飞书User ID"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 测试消息 */}
                <div className="space-y-2">
                  <Label htmlFor="testMessage">测试消息内容</Label>
                  <textarea
                    id="testMessage"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="请输入测试消息内容"
                    className="w-full p-3 border rounded-md resize-none"
                    rows={4}
                  />
                </div>

                {/* 发送按钮 */}
                <Button onClick={sendTestMessage} disabled={sendingMessage}>
                  {sendingMessage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      发送中...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      发送测试消息
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 多维表格同步 */}
        <TabsContent value="bitable-sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>飞书多维表格双向同步</CardTitle>
              <CardDescription>
                配置飞书多维表格与扣子贷后系统的双向实时同步
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 多维表格配置 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bitableAppId">App ID</Label>
                  <Input
                    id="bitableAppId"
                    value={bitableAppId}
                    onChange={(e) => setBitableAppId(e.target.value)}
                    placeholder="请输入飞书多维表格的 App ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bitableAppToken">App Token</Label>
                  <Input
                    id="bitableAppToken"
                    value={bitableAppToken}
                    onChange={(e) => setBitableAppToken(e.target.value)}
                    placeholder="请输入多维表格的 App Token"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bitableTableId">Table ID</Label>
                  <Input
                    id="bitableTableId"
                    value={bitableTableId}
                    onChange={(e) => setBitableTableId(e.target.value)}
                    placeholder="请输入多维表格的 Table ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label>同步方向</Label>
                  <Select 
                    value={bitableSyncDirection} 
                    onValueChange={(v: any) => setBitableSyncDirection(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bidirectional">双向同步</SelectItem>
                      <SelectItem value="to-coze">飞书 → 扣子</SelectItem>
                      <SelectItem value="to-feishu">扣子 → 飞书</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch 
                    id="syncEnabled" 
                    checked={bitableSyncEnabled} 
                    onCheckedChange={setBitableSyncEnabled} 
                  />
                  <Label htmlFor="syncEnabled">启用同步</Label>
                </div>
                {selectedBitableConfig && (
                  <div className="text-sm text-muted-foreground">
                    已同步 {selectedBitableConfig.syncCount} 次
                    {selectedBitableConfig.lastSyncTime && (
                      <span className="ml-2">
                        · 最后同步: {new Date(selectedBitableConfig.lastSyncTime).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <Button onClick={saveBitableConfig} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    保存配置
                  </>
                )}
              </Button>

              {/* 同步操作按钮 */}
              {selectedBitableConfig && (
                <div className="pt-6 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">同步操作</h3>
                  </div>
                  <div className="flex gap-4">
                    <Button 
                      onClick={() => executeSync('to-coze')} 
                      disabled={syncingBitable || !bitableSyncEnabled}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      从飞书同步到扣子
                    </Button>
                    <Button 
                      onClick={() => executeSync('to-feishu')} 
                      disabled={syncingBitable || !bitableSyncEnabled}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      从扣子同步到飞书
                    </Button>
                    <Button 
                      onClick={() => executeSync('bidirectional')} 
                      disabled={syncingBitable || !bitableSyncEnabled}
                    >
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                      双向同步
                    </Button>
                  </div>
                </div>
              )}

              {/* 同步记录 */}
              {syncRecords.length > 0 && (
                <div className="pt-6 border-t">
                  <h3 className="font-medium mb-4">同步记录</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>方向</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>同步时间</TableHead>
                        <TableHead>错误信息</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {record.direction === 'to-coze' ? '飞书→扣子' : 
                               record.direction === 'to-feishu' ? '扣子→飞书' : '双向'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                record.status === 'success' ? 'bg-green-100 text-green-800' :
                                record.status === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }
                            >
                              {record.status === 'success' ? '成功' :
                               record.status === 'failed' ? '失败' : '同步中'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(record.syncTime).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {record.errorMessage || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
