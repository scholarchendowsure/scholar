'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Save, Users, Settings, Link, Trash2 } from 'lucide-react';

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

  // 加载配置
  useEffect(() => {
    loadConfig();
    loadFeishuUsers();
    loadMappings();
    loadMerchantMappings();
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
      </Tabs>
    </div>
  );
}
