'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, Save, RefreshCw, HelpCircle, MessageSquare, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function FeishuConfigPage() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [configExists, setConfigExists] = useState(false);

  // 加载配置
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/feishu-config');
      const result = await response.json();
      
      if (result.success && result.data) {
        setWebhookUrl(result.data.webhookUrl || '');
        setConfigExists(!!result.data.webhookUrl);
        console.log('飞书配置加载成功:', result.data);
      }
    } catch (error) {
      console.error('加载飞书配置失败:', error);
      toast.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // 保存配置
  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      toast.error('请输入 Webhook URL');
      return;
    }

    // 验证 URL 格式
    try {
      new URL(webhookUrl);
    } catch {
      toast.error('Webhook URL 格式不正确');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/feishu-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setConfigExists(true);
        toast.success('飞书配置保存成功！');
        console.log('飞书配置保存成功:', result.data);
      } else {
        toast.error(result.error || '保存失败');
      }
    } catch (error) {
      console.error('保存飞书配置失败:', error);
      toast.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  // 测试配置
  const handleTest = async () => {
    if (!webhookUrl.trim()) {
      toast.error('请先保存 Webhook URL');
      return;
    }

    try {
      setTesting(true);
      const testMessage = '🎉 飞书机器人配置测试成功！\n\n这是一条测试消息，说明您的飞书 Webhook 配置正确。';
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          msg_type: 'text',
          content: {
            text: testMessage,
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.code === 0) {
          toast.success('测试消息发送成功！请查看您的飞书群聊');
          console.log('飞书测试消息发送成功');
        } else {
          toast.error(`测试失败: ${result.msg || '未知错误'}`);
          console.error('飞书测试消息发送失败:', result);
        }
      } else {
        toast.error(`测试失败: HTTP ${response.status}`);
        console.error('飞书测试消息 HTTP 错误:', response.status);
      }
    } catch (error) {
      console.error('测试飞书配置失败:', error);
      toast.error('测试失败，请检查 Webhook URL 是否正确');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          飞书配置
        </h1>
        <p className="text-muted-foreground">
          配置飞书机器人 Webhook，用于发送到期还款提醒
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Webhook 配置</CardTitle>
          <CardDescription>
            配置您的飞书自定义机器人 Webhook URL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">
                Webhook URL
              </Label>
              <div className="flex gap-2">
                <Input
                  id="webhookUrl"
                  placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  disabled={loading}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={loadConfig}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>状态</Label>
              <div className="flex items-center gap-2">
                {configExists ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span>已配置</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="w-5 h-5" />
                    <span>未配置</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="flex gap-4">
              <Button
                onClick={handleSave}
                disabled={saving || !webhookUrl.trim()}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? '保存中...' : '保存配置'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleTest}
                disabled={testing || !webhookUrl.trim() || !configExists}
                className="flex-1"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {testing ? '发送中...' : '测试发送'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            使用说明
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">如何获取飞书 Webhook？</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-sm">
              <li>在飞书群聊中，点击群设置 &gt; 群机器人</li>
              <li>点击"添加机器人"，选择"自定义机器人"</li>
              <li>给机器人起个名字（如"贷后提醒"），点击"添加"</li>
              <li>复制生成的 Webhook URL，粘贴到上方输入框</li>
              <li>点击"保存配置"，然后点击"测试发送"验证配置</li>
            </ol>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">安全提示</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
              <li>请妥善保管您的 Webhook URL，不要分享给他人</li>
              <li>建议在飞书中设置机器人的关键词验证</li>
              <li>本系统只会发送贷后还款提醒消息</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
