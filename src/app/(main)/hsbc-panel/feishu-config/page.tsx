'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function FeishuConfigPage() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testMessage, setTestMessage] = useState('测试消息：飞书提醒功能正常！');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/feishu-config');
      if (res.ok) {
        const data = await res.json();
        setWebhookUrl(data.webhookUrl || '');
      }
    } catch (err) {
      console.error('加载配置失败:', err);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/feishu-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl })
      });

      if (res.ok) {
        toast.success('配置保存成功！');
      } else {
        const data = await res.json();
        toast.error(data.error || '保存失败');
      }
    } catch (err) {
      toast.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const testSend = async () => {
    if (!webhookUrl) {
      toast.error('请先配置 Webhook URL');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/feishu-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testMessage })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || '测试消息发送成功！');
      } else {
        const data = await res.json();
        toast.error(data.error || '发送失败');
      }
    } catch (err) {
      toast.error('发送测试消息失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">飞书配置</h1>
        <p className="text-muted-foreground mt-1">配置飞书 Webhook 用于发送到期提醒</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Webhook 配置</CardTitle>
          <CardDescription>配置飞书群聊机器人的 Webhook URL</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <Input
              id="webhookUrl"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
            />
            <p className="text-sm text-muted-foreground">
              获取方式：飞书群聊 → 添加群机器人 → 复制 Webhook 地址
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? '保存中...' : '保存配置'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>测试发送</CardTitle>
          <CardDescription>测试 Webhook 是否配置正确</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="testMessage">测试消息</Label>
            <Input
              id="testMessage"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="输入测试消息内容"
            />
          </div>

          <Button onClick={testSend} disabled={loading || !webhookUrl}>
            {loading ? '发送中...' : '发送测试消息'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <h4 className="font-medium text-foreground mb-1">配置步骤：</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>在飞书群聊中添加群机器人</li>
              <li>复制机器人的 Webhook 地址</li>
              <li>将 Webhook 地址粘贴到上方输入框</li>
              <li>点击"保存配置"</li>
              <li>点击"发送测试消息"验证配置</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">提醒消息格式：</h4>
            <p className="text-muted-foreground">
              {`{销售飞书名称}, {商户ID}有一笔{余额}{币种}在{到期日期}需要到期还款，记得要及时跟进`}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
