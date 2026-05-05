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
  
  // Webhook接收记录状态
  const [webhookRecords, setWebhookRecords] = useState<any[]>([]);
  const [loadingWebhookRecords, setLoadingWebhookRecords] = useState(false);
  
  // 跟进记录Webhook接收记录状态
  const [followupWebhookRecords, setFollowupWebhookRecords] = useState<any[]>([]);
  const [loadingFollowupWebhookRecords, setLoadingFollowupWebhookRecords] = useState(false);
  
  // 多维案件更新Webhook接收记录状态
  const [bitableCaseUpdateRecords, setBitableCaseUpdateRecords] = useState<any[]>([]);
  const [loadingBitableCaseUpdateRecords, setLoadingBitableCaseUpdateRecords] = useState(false);

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
  // 加载webhook记录
  const loadWebhookRecords = async () => {
    setLoadingWebhookRecords(true);
    try {
      const response = await fetch('/api/feishu-bitable/webhook?limit=20');
      const data = await response.json();
      if (data.success) {
        setWebhookRecords(data.records || []);
      }
    } catch (error) {
      console.error('加载webhook记录失败:', error);
    } finally {
      setLoadingWebhookRecords(false);
    }
  };

  // 清空webhook记录
  const clearWebhookRecords = async () => {
    try {
      const response = await fetch('/api/feishu-bitable/webhook', {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        toast.success('记录已清空');
        loadWebhookRecords();
      }
    } catch (error) {
      toast.error('清空记录失败');
    }
  };
  
  // 加载跟进记录webhook记录
  const loadFollowupWebhookRecords = async () => {
    setLoadingFollowupWebhookRecords(true);
    try {
      const response = await fetch('/api/webhook/followup/records?limit=20');
      const data = await response.json();
      if (data.success) {
        setFollowupWebhookRecords(data.records || []);
      }
    } catch (error) {
      console.error('加载跟进记录webhook记录失败:', error);
    } finally {
      setLoadingFollowupWebhookRecords(false);
    }
  };
  
  // 清空跟进记录webhook记录
  const clearFollowupWebhookRecords = async () => {
    try {
      const response = await fetch('/api/webhook/followup/records', {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        toast.success('记录已清空');
        loadFollowupWebhookRecords();
      }
    } catch (error) {
      toast.error('清空记录失败');
    }
  };
  
  // 加载多维案件更新webhook记录
  const loadBitableCaseUpdateRecords = async () => {
    setLoadingBitableCaseUpdateRecords(true);
    try {
      const response = await fetch('/api/bitable-case-update/webhook?limit=20');
      const data = await response.json();
      if (data.success) {
        setBitableCaseUpdateRecords(data.records || []);
      }
    } catch (error) {
      console.error('加载多维案件更新记录失败:', error);
    } finally {
      setLoadingBitableCaseUpdateRecords(false);
    }
  };
  
  // 清空多维案件更新webhook记录
  const clearBitableCaseUpdateRecords = async () => {
    try {
      const response = await fetch('/api/bitable-case-update/webhook', {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        toast.success('记录已清空');
        loadBitableCaseUpdateRecords();
      }
    } catch (error) {
      toast.error('清空记录失败');
    }
  };

  useEffect(() => {
    loadConfig();
    loadFeishuUsers();
    loadMappings();
    loadMerchantMappings();
    loadBitableConfigs();
    loadPersonalConfig();
    loadPersonalAccounts();
    loadCozeConfig();
    loadWebhookRecords();
    loadFollowupWebhookRecords();
    loadBitableCaseUpdateRecords();
    
    // 定时刷新webhook记录，每5秒刷新一次
    const interval = setInterval(() => {
      loadWebhookRecords();
      loadFollowupWebhookRecords();
      loadBitableCaseUpdateRecords();
    }, 5000);
    
    return () => clearInterval(interval);
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

          <TabsTrigger value="bitable-sync">
            <Database className="w-4 h-4 mr-2" />
            多维表格同步
          </TabsTrigger>
          <TabsTrigger value="followup-sync">
            <MessageSquare className="w-4 h-4 mr-2" />
            跟进记录同步
          </TabsTrigger>
          <TabsTrigger value="bitable-case-update">
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            多维案件更新
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

          {/* Webhook接收信息展示 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-purple-600" />
                  Webhook接收信息
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadWebhookRecords}
                    disabled={loadingWebhookRecords}
                  >
                    {loadingWebhookRecords ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    刷新
                  </Button>
                  {webhookRecords.length > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={clearWebhookRecords}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      清空
                    </Button>
                  )}
                </div>
              </CardTitle>
              <CardDescription>
                展示从飞书多维表格接收到的Webhook信息（自动每5秒刷新）
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Webhook配置说明 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="text-sm font-medium text-blue-900 mb-2">
                  📋 飞书多维表格Webhook配置说明
                </div>
                <div className="space-y-2 text-sm text-blue-800">
                  <div>
                    <strong>请求地址 (URL)：</strong>
                    <code className="bg-blue-100 px-2 py-1 rounded font-mono ml-2">
                      {typeof window !== 'undefined' 
                        ? `${window.location.origin}/api/feishu-bitable/webhook` 
                        : '/api/feishu-bitable/webhook'}
                    </code>
                  </div>
                  <div><strong>请求方法：</strong> POST</div>
                  <div><strong>请求头 (Headers)：</strong> Content-Type: application/json</div>
                  <div><strong>请求体 (Request body)：</strong> Raw 格式 (JSON)</div>
                </div>
              </div>

              {/* 接收记录 */}
              {webhookRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <div>暂无接收到的Webhook信息</div>
                  <div className="text-sm mt-2">在飞书多维表格配置工作流后，新记录产生时会在这里显示</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-2">
                    共接收到 {webhookRecords.length} 条记录（最新在前）
                  </div>
                  {webhookRecords.map((record) => (
                    <div 
                      key={record.id} 
                      className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700">
                            ID: {record.id}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(record.receivedAt).toLocaleString()}
                          </span>
                        </div>
                        {/* 处理结果标签 */}
                        {record.processResult && (
                          <Badge 
                            className={
                              record.processResult.success 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {record.processResult.action === 'created' ? '新建案件' :
                             record.processResult.action === 'updated' ? '更新案件' :
                             record.processResult.action === 'skipped' ? '跳过' : '处理'}
                            {record.processResult.success ? '成功' : '失败'}
                          </Badge>
                        )}
                      </div>
                      
                      {/* 处理结果展示 */}
                      {record.processResult && (
                        <div className="mb-3 p-3 bg-muted rounded-lg">
                          <div className="text-sm">
                            <div className="font-medium">
                              {record.processResult.message}
                            </div>
                            {record.processResult.loanNo && (
                              <div className="text-muted-foreground mt-1">
                                贷款单号: {record.processResult.loanNo}
                              </div>
                            )}
                            {record.processResult.caseId && (
                              <div className="text-muted-foreground">
                                案件ID: {record.processResult.caseId}
                              </div>
                            )}
                            {record.processResult.error && (
                              <div className="text-red-600 mt-1">
                                错误: {record.processResult.error}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-2">
                        <details>
                          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                            点击查看接收内容
                          </summary>
                          <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-96">
                            {JSON.stringify(record.payload, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 跟进记录同步 */}
        <TabsContent value="followup-sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>跟进记录同步配置</CardTitle>
              <CardDescription>
                配置飞书多维表格Webhook，自动接收跟进记录并同步到案件系统
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Webhook配置说明 */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Webhook 配置</h3>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 rounded-full p-2">
                      <Terminal className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900 mb-1">飞书多维表格Webhook</h4>
                      <p className="text-sm text-blue-700 mb-3">
                        请在飞书多维表格中配置Webhook，将以下信息填入：
                      </p>
                      
                      <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-3">
                        <div className="text-gray-400"># 请求地址 (URL)</div>
                        <div className="mb-2 break-all">
                          {typeof window !== 'undefined' 
                            ? `${window.location.origin}/api/webhook/followup` 
                            : '/api/webhook/followup'}
                        </div>
                        
                        <div className="text-gray-400 mt-4"># 请求方法</div>
                        <div className="mb-2">POST</div>
                        
                        <div className="text-gray-400 mt-4"># Content-Type</div>
                        <div className="mb-2">application/json</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 请求体示例 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">请求体示例</h4>
                  <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs overflow-auto">
                    <pre>{JSON.stringify({
                      "用户ID": "202600501DCDR",
                      "贷款单号": "DSL1720438526638",
                      "记录人": "张三",
                      "跟进类型": "线上",
                      "联系人": "法人",
                      "跟进结果": "正常还款",
                      "记录内容": "这是一条跟进记录",
                      "文件信息": ["example.jpg", "document.pdf"]
                    }, null, 2)}</pre>
                  </div>
                </div>
              </div>
              
              {/* 接收记录展示 */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    共接收到 {followupWebhookRecords.length} 条记录（最新在前）
                  </h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={loadFollowupWebhookRecords}
                      disabled={loadingFollowupWebhookRecords}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loadingFollowupWebhookRecords ? 'animate-spin' : ''}`} />
                      刷新
                    </Button>
                    {followupWebhookRecords.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearFollowupWebhookRecords}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        清空
                      </Button>
                    )}
                  </div>
                </div>
                
                {loadingFollowupWebhookRecords ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">加载中...</p>
                  </div>
                ) : followupWebhookRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>暂无记录</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-auto">
                    {followupWebhookRecords.map((record, index) => (
                      <div 
                        key={index} 
                        className="p-4 bg-muted rounded-lg border border-border"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {index + 1}
                            </Badge>
                            <span className="text-sm font-medium">
                              {new Date(record.receivedAt).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          
                          {/* 处理结果标签 */}
                          {record.processResult && (
                            <Badge 
                              className={
                                record.processResult.success 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }
                            >
                              {record.processResult.updatedCases && record.processResult.updatedCases > 0 
                                ? `已同步${record.processResult.updatedCases}个案件` 
                                : '处理完成'}
                              {record.processResult.success ? '成功' : '失败'}
                            </Badge>
                          )}
                        </div>
                        
                        {/* 处理结果展示 */}
                        {record.processResult && (
                          <div className="mb-3 p-3 bg-background rounded-lg border">
                            <div className="text-sm">
                              <div className="font-medium">
                                {record.processResult.message}
                              </div>
                              {record.processResult.updatedCases && (
                                <div className="text-muted-foreground mt-1">
                                  同步案件数: {record.processResult.updatedCases}
                                </div>
                              )}
                              {record.processResult.error && (
                                <div className="text-red-600 mt-1">
                                  错误: {record.processResult.error}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-2">
                          <details>
                            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                              点击查看接收内容
                            </summary>
                            <pre className="mt-2 p-3 bg-background rounded-lg text-xs overflow-auto max-h-96 border">
                              {JSON.stringify(record.payload, null, 2)}
                            </pre>
                          </details>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 多维案件更新 */}
        <TabsContent value="bitable-case-update" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>多维案件更新配置</CardTitle>
              <CardDescription>
                配置飞书多维表格Webhook，根据推送信息更新或创建案件
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Webhook配置说明 */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Webhook 配置</h3>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 rounded-full p-2">
                      <ArrowRightLeft className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900 mb-1">功能说明</h4>
                      <p className="text-sm text-green-700 mb-3">
                        接收飞书多维表格推送，自动更新或创建案件：
                      </p>
                      <ul className="text-sm text-green-700 space-y-1 mb-3">
                        <li>• 如果贷款单号已存在 → 更新案件（只更新非空字段）</li>
                        <li>• 如果贷款单号不存在 → 创建新案件</li>
                        <li>• 推送信息中是空值的字段不进行更新</li>
                      </ul>
                      
                      <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-3">
                        <div className="text-gray-400"># 请求地址 (URL)</div>
                        <div className="mb-2 break-all">
                          {typeof window !== 'undefined' 
                            ? `${window.location.origin}/api/bitable-case-update/webhook` 
                            : '/api/bitable-case-update/webhook'}
                        </div>
                        
                        <div className="text-gray-400 mt-4"># 请求方法</div>
                        <div className="mb-2">POST</div>
                        
                        <div className="text-gray-400 mt-4"># Content-Type</div>
                        <div className="mb-2">application/json</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 请求体示例 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">请求体示例</h4>
                  <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs overflow-auto">
                    <pre>{JSON.stringify({
                      "batch_number": "202405001",
                      "loan_number": "DSL1720438526638",
                      "user_id": "202600501DCDR",
                      "borrower_name": "张三",
                      "status": "待外访",
                      "loan_amount": "100000",
                      "remaining_balance": "50000",
                      "overdue_amount": "5000",
                      "overdue_days": "30"
                    }, null, 2)}</pre>
                  </div>
                </div>
                
                {/* 字段映射说明 */}
                <div className="space-y-2 pt-4 border-t">
                  <h4 className="text-sm font-medium">支持的字段列表</h4>
                  <div className="bg-muted p-4 rounded-lg text-sm">
                    <p className="mb-2">支持以下字段（中英文都可以）：</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                      <div>批次号 (batch_number)</div>
                      <div>贷款单号 (loan_number)</div>
                      <div>用户ID (user_id)</div>
                      <div>借款人姓名 (borrower_name)</div>
                      <div>状态 (status)</div>
                      <div>贷款金额 (loan_amount)</div>
                      <div>在贷余额 (remaining_balance)</div>
                      <div>逾期金额 (overdue_amount)</div>
                      <div>逾期天数 (overdue_days)</div>
                      <div>到期日 (maturity_date)</div>
                      <div>产品名称 (product_name)</div>
                      <div>公司名称 (company_name)</div>
                      <div>... (更多字段)</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 接收记录展示 */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    共接收到 {bitableCaseUpdateRecords.length} 条记录（最新在前）
                  </h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={loadBitableCaseUpdateRecords}
                      disabled={loadingBitableCaseUpdateRecords}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loadingBitableCaseUpdateRecords ? 'animate-spin' : ''}`} />
                      刷新
                    </Button>
                    {bitableCaseUpdateRecords.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearBitableCaseUpdateRecords}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        清空
                      </Button>
                    )}
                  </div>
                </div>
                
                {loadingBitableCaseUpdateRecords ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">加载中...</p>
                  </div>
                ) : bitableCaseUpdateRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>暂无记录</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-auto">
                    {bitableCaseUpdateRecords.map((record, index) => (
                      <div 
                        key={index} 
                        className="p-4 bg-muted rounded-lg border border-border"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {index + 1}
                            </Badge>
                            <span className="text-sm font-medium">
                              {new Date(record.receivedAt).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          
                          {/* 处理结果标签 */}
                          {record.processResult && (
                            <Badge 
                              className={
                                record.processResult.success 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }
                            >
                              {record.processResult.action === 'created' 
                                ? '创建新案件' 
                                : record.processResult.action === 'updated'
                                  ? '更新案件'
                                  : '处理完成'}
                              {record.processResult.success ? '成功' : '失败'}
                            </Badge>
                          )}
                        </div>
                        
                        {/* 处理结果展示 */}
                        {record.processResult && (
                          <div className="mb-3 p-3 bg-background rounded-lg border">
                            <div className="text-sm">
                              <div className="font-medium">
                                {record.processResult.message}
                              </div>
                              {record.processResult.loanNo && (
                                <div className="text-muted-foreground mt-1">
                                  贷款单号: {record.processResult.loanNo}
                                </div>
                              )}
                              {record.processResult.caseId && (
                                <div className="text-muted-foreground mt-1">
                                  案件ID: {record.processResult.caseId}
                                </div>
                              )}
                              {record.processResult.error && (
                                <div className="text-red-600 mt-1">
                                  错误: {record.processResult.error}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-2">
                          <details>
                            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                              点击查看接收内容
                            </summary>
                            <pre className="mt-2 p-3 bg-background rounded-lg text-xs overflow-auto max-h-96 border">
                              {JSON.stringify(record.payload, null, 2)}
                            </pre>
                          </details>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
