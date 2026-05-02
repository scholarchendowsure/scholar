'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Loader2, RefreshCw, Save, Users, Settings, Link as LinkIcon, Trash2, 
  MessageSquare, Search, Send, Database, ArrowRightLeft, 
  Cloud, Download, Upload, Activity, Bell, Key, CheckCircle,
  Terminal
} from 'lucide-react';
import { FeishuBitableConfig, BitableSyncRecord, DEFAULT_BITABLE_FIELDS } from '@/types/feishu-bitable';
import { FeishuPersonalAccount, FeishuPersonalConfig, PersonalSendMode } from '@/types/feishu-personal';
import { CozeApiConfig } from '@/types/coze-api';

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

  // 个人账号绑定状态
  const [personalAccounts, setPersonalAccounts] = useState<FeishuPersonalAccount[]>([]);
  const [personalConfig, setPersonalConfig] = useState<FeishuPersonalConfig | null>(null);
  const [cliPath, setCliPath] = useState('lark');
  const [personalSendMode, setPersonalSendMode] = useState<PersonalSendMode>('cli');
  const [testingCli, setTestingCli] = useState(false);
  const [cliAvailable, setCliAvailable] = useState(false);
  const [personalColleagueSearch, setPersonalColleagueSearch] = useState('');
  const [personalTestMessage, setPersonalTestMessage] = useState('');
  const [personalSendingMessage, setPersonalSendingMessage] = useState(false);
  const [personalDirectUserId, setPersonalDirectUserId] = useState('');

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

  // 不需要 lark-cli 授权状态了

  // 加载配置
  useEffect(() => {
    loadConfig();
    loadFeishuUsers();
    loadMappings();
    loadMerchantMappings();
    loadBitableConfigs();
    loadPersonalConfig();
    loadPersonalAccounts();
    loadCozeConfig();
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

  // 不需要 lark-cli 授权函数了

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
            <LinkIcon className="w-4 h-4 mr-2" />
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
          <TabsTrigger value="personal-account">
            <Users className="w-4 h-4 mr-2" />
            个人账号绑定
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

        {/* 个人账号绑定 */}
        <TabsContent value="personal-account" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：飞书个人账号绑定 */}
            <Card>
              <CardHeader>
                <CardTitle>飞书个人账号绑定</CardTitle>
                <CardDescription>
                  使用飞书官方CLI工具（lark-cli），通过您的个人账号发送私人消息
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 授权引导 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">步骤 1：完成授权</h3>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 rounded-full p-2">
                        <Terminal className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-900 mb-1">飞书账号授权</h4>
                        <p className="text-sm text-blue-700 mb-3">
                          请在服务器终端执行以下命令完成授权：
                        </p>
                        
                        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm">
                          <div className="text-gray-400 mb-2"># 1. 初始化配置</div>
                          <div className="mb-2">lark-cli config init --new</div>
                          <div className="text-gray-400 mb-2 mt-4"># 2. 登录授权（会在浏览器中打开验证链接）</div>
                          <div className="mb-2">lark-cli auth login --recommend</div>
                          <div className="text-gray-400 mb-2 mt-4"># 3. 验证授权状态</div>
                          <div className="mb-2">lark-cli auth status</div>
                          <div className="text-gray-400 mb-2 mt-4"># 4. 健康检查</div>
                          <div>lark-cli doctor</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CLI配置 */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium">CLI 配置</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cliPath">lark-cli 路径</Label>
                    <div className="flex gap-2">
                      <Input
                        id="cliPath"
                        value={cliPath}
                        onChange={(e) => setCliPath(e.target.value)}
                        placeholder="请输入 lark-cli 路径（默认为 lark）"
                      />
                      <Button onClick={testCli} disabled={testingCli}>
                        {testingCli ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            测试中...
                          </>
                        ) : (
                          <>
                            <Activity className="w-4 h-4 mr-2" />
                            测试CLI
                          </>
                        )}
                      </Button>
                    </div>
                    {cliAvailable && (
                      <div className="text-sm text-green-600">
                        ✓ lark-cli 可用
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="personalSendMode">发送模式</Label>
                    <Select value={personalSendMode} onValueChange={(v: PersonalSendMode) => setPersonalSendMode(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cli">lark-cli 发送</SelectItem>
                        <SelectItem value="personal-app">个人自建应用（开发中）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={savePersonalConfig} disabled={loading}>
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
                </div>

                <div className="pt-6 border-t">
                  <h3 className="text-sm font-medium mb-4">消息测试</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="personalDirectUserId">接收人 Open ID / User ID</Label>
                      <Input
                        id="personalDirectUserId"
                        value={personalDirectUserId}
                        onChange={(e) => setPersonalDirectUserId(e.target.value)}
                        placeholder="请输入接收人的 Open ID（例如：ou_a6c1929d297c616fbdff10da8472e263）"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="personalTestMessage">测试消息内容</Label>
                      <Input
                        id="personalTestMessage"
                        value={personalTestMessage}
                        onChange={(e) => setPersonalTestMessage(e.target.value)}
                        placeholder="请输入测试消息内容"
                      />
                    </div>

                    <Button 
                      onClick={sendPersonalMessage} 
                      disabled={personalSendingMessage || !personalDirectUserId || !personalTestMessage}
                    >
                      {personalSendingMessage ? (
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
                </div>

                {/* 个人账号列表 */}
                <div className="pt-6 border-t">
                  <h3 className="text-sm font-medium mb-4">已绑定账号</h3>
                  {personalAccounts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无绑定的个人账号
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>系统用户</TableHead>
                          <TableHead>飞书昵称</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>绑定时间</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {personalAccounts.map((account) => (
                          <TableRow key={account.id}>
                            <TableCell className="font-medium">{account.userId}</TableCell>
                            <TableCell>{account.feishuName || '-'}</TableCell>
                            <TableCell>
                              <Badge 
                                className={account.isBound ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                              >
                                {account.isBound ? '已绑定' : '未绑定'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(account.createdAt).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 右侧：扣子AI消息发送 */}
            <Card>
              <CardHeader>
                <CardTitle>扣子AI API 消息发送</CardTitle>
                <CardDescription>
                  通过 Coze API 调用发送消息，支持贷后系统主动推送提醒
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Coze API 配置 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">API 配置</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cozeApiKey">API Key</Label>
                    <Input
                      id="cozeApiKey"
                      type="password"
                      value={cozeApiKey}
                      onChange={(e) => setCozeApiKey(e.target.value)}
                      placeholder="请输入 Coze API Key"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cozeBotId">Bot ID</Label>
                    <Input
                      id="cozeBotId"
                      value={cozeBotId}
                      onChange={(e) => setCozeBotId(e.target.value)}
                      placeholder="请输入 Coze Bot ID"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch 
                      id="cozeEnabled"
                      checked={cozeEnabled}
                      onCheckedChange={setCozeEnabled}
                    />
                    <Label htmlFor="cozeEnabled">启用 Coze API</Label>
                  </div>

                  <Button onClick={saveCozeConfig} disabled={loading}>
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
                </div>

                {/* 消息测试 */}
                <div className="pt-6 border-t">
                  <h3 className="text-sm font-medium mb-4">消息测试</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cozeReceiveId">接收人 ID</Label>
                      <Input
                        id="cozeReceiveId"
                        value={cozeReceiveId}
                        onChange={(e) => setCozeReceiveId(e.target.value)}
                        placeholder="请输入接收人的 ID"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cozeMessage">消息内容</Label>
                      <Textarea
                        id="cozeMessage"
                        value={cozeMessage}
                        onChange={(e) => setCozeMessage(e.target.value)}
                        placeholder="请输入消息内容"
                        rows={3}
                      />
                    </div>

                    <Button 
                      onClick={sendCozeMessage} 
                      disabled={cozeSending || !cozeReceiveId || !cozeMessage}
                    >
                      {cozeSending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          发送中...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          发送消息
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* 提醒测试 */}
                <div className="pt-6 border-t">
                  <h3 className="text-sm font-medium mb-4">贷后提醒测试</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cozeReceiveId2">接收人 ID</Label>
                      <Input
                        id="cozeReceiveId2"
                        value={cozeReceiveId}
                        onChange={(e) => setCozeReceiveId(e.target.value)}
                        placeholder="请输入接收人的 ID"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cozeReminderType">提醒类型</Label>
                      <Select 
                        value={cozeReminderType} 
                        onValueChange={(value) => setCozeReminderType(value as 'overdue' | 'due' | 'followup' | 'custom')}
                      >
                        <SelectTrigger id="cozeReminderType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="overdue">逾期催收提醒</SelectItem>
                          <SelectItem value="due">还款到期提醒</SelectItem>
                          <SelectItem value="followup">跟进任务提醒</SelectItem>
                          <SelectItem value="custom">自定义消息</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {cozeReminderType !== 'custom' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cozeCaseId">案件 ID</Label>
                          <Input
                            id="cozeCaseId"
                            value={cozeCaseId}
                            onChange={(e) => setCozeCaseId(e.target.value)}
                            placeholder="案件 ID"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cozeCustomerName">客户姓名</Label>
                          <Input
                            id="cozeCustomerName"
                            value={cozeCustomerName}
                            onChange={(e) => setCozeCustomerName(e.target.value)}
                            placeholder="客户姓名"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cozeOverdueAmount">逾期金额</Label>
                          <Input
                            id="cozeOverdueAmount"
                            value={cozeOverdueAmount}
                            onChange={(e) => setCozeOverdueAmount(e.target.value)}
                            placeholder="逾期金额"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cozeOverdueDays">逾期天数</Label>
                          <Input
                            id="cozeOverdueDays"
                            value={cozeOverdueDays}
                            onChange={(e) => setCozeOverdueDays(e.target.value)}
                            placeholder="逾期天数"
                          />
                        </div>
                      </div>
                    )}

                    {cozeReminderType === 'custom' && (
                      <div className="space-y-2">
                        <Label htmlFor="cozeMessage2">自定义消息</Label>
                        <Textarea
                          id="cozeMessage2"
                          value={cozeMessage}
                          onChange={(e) => setCozeMessage(e.target.value)}
                          placeholder="请输入自定义消息内容"
                          rows={3}
                        />
                      </div>
                    )}

                    <Button 
                      onClick={sendCozeReminder} 
                      disabled={cozeSending || !cozeReceiveId}
                    >
                      {cozeSending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          发送中...
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4 mr-2" />
                          发送提醒
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* API 文档 */}
                <div className="pt-6 border-t">
                  <h3 className="text-sm font-medium mb-4">API 调用文档</h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-sm font-mono space-y-2">
                      <p><strong>发送提醒 API：</strong></p>
                      <p className="text-muted-foreground">POST /api/coze-api/send-reminder</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        请求示例：
                        <br/>
                        {'{'}
                        <br/>
                        &nbsp;&nbsp;"receiveId": "接收人ID",
                        <br/>
                        &nbsp;&nbsp;"reminderType": "overdue",
                        <br/>
                        &nbsp;&nbsp;"caseId": "CASE001",
                        <br/>
                        &nbsp;&nbsp;"customerName": "张三",
                        <br/>
                        &nbsp;&nbsp;"overdueAmount": 5000,
                        <br/>
                        &nbsp;&nbsp;"overdueDays": 30
                        <br/>
                        {'}'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
