'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Database,
  TestTube,
  RefreshCw,
  Power,
  PowerOff,
  ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface McpService {
  id: string;
  name: string;
  description: string;
  type: 'postgresql' | 'mysql' | 'mongodb' | 'http';
  status: 'active' | 'inactive' | 'error';
  endpoint: string;
  config: Record<string, unknown>;
  lastSyncTime: string;
  createdAt: string;
}

export default function McpWarehousePage() {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<McpService[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<McpService | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'postgresql' as 'postgresql' | 'mysql' | 'mongodb' | 'http',
    endpoint: '',
    config: {
      host: '',
      port: 5432,
      database: '',
    },
    apiKey: '',
  });

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mcp-services');
      const result = await res.json();
      if (result.success) {
        setServices(result.data || []);
      }
    } catch (error) {
      toast.error('获取MCP服务列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('请填写服务名称');
      return;
    }

    try {
      const res = await fetch('/api/mcp-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          endpoint: formData.endpoint,
          config: formData.config,
          apiKey: formData.apiKey ? Buffer.from(JSON.stringify({ user: formData.config.database, password: formData.apiKey })).toString('base64') : undefined,
        }),
      });

      if (res.ok) {
        toast.success('服务创建成功');
        setCreateDialogOpen(false);
        resetForm();
        fetchServices();
      }
    } catch (error) {
      toast.error('创建失败');
    }
  };

  const handleUpdate = async () => {
    if (!selectedService || !formData.name) {
      toast.error('请填写必填字段');
      return;
    }

    try {
      const res = await fetch(`/api/mcp-services/${selectedService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          endpoint: formData.endpoint,
          config: formData.config,
          apiKey: formData.apiKey ? Buffer.from(JSON.stringify({ user: formData.config.database, password: formData.apiKey })).toString('base64') : undefined,
        }),
      });

      if (res.ok) {
        toast.success('服务更新成功');
        setEditDialogOpen(false);
        setSelectedService(null);
        resetForm();
        fetchServices();
      }
    } catch (error) {
      toast.error('更新失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该服务吗？')) return;

    try {
      const res = await fetch(`/api/mcp-services/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('服务已删除');
        fetchServices();
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      const res = await fetch(`/api/mcp-services/${id}/test`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        if (result.data.success) {
          toast.success(result.data.message);
        } else {
          toast.error(result.data.message);
        }
        fetchServices();
      }
    } catch (error) {
      toast.error('测试失败');
    } finally {
      setTesting(null);
    }
  };

  const openEditDialog = (service: McpService) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      type: service.type,
      endpoint: service.endpoint || '',
      config: service.config as { host?: string; port?: number; database?: string } || { host: '', port: 5432, database: '' },
      apiKey: '',
    });
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'postgresql',
      endpoint: '',
      config: { host: '', port: 5432, database: '' },
      apiKey: '',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Power className="h-4 w-4 text-[hsl(145,65%,38%)]" />;
      case 'error':
        return <PowerOff className="h-4 w-4 text-[hsl(0,75%,50%)]" />;
      default:
        return <PowerOff className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">MCP 数据仓库</h1>
          <p className="text-muted-foreground mt-1">外部数据服务配置与查询管理</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          添加服务
        </Button>
      </div>

      {/* Services List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))
        ) : services.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              暂无MCP服务配置，点击上方按钮添加
            </CardContent>
          </Card>
        ) : (
          services.map((service) => (
            <Card key={service.id} className="card-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="h-5 w-5 text-[hsl(210,95%,40%)]" />
                    {service.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(service.status)}
                    <Badge
                      variant={service.status === 'active' ? 'default' : 'outline'}
                      className={service.status === 'active' ? 'bg-[hsl(145,65%,38%)] text-white' : ''}
                    >
                      {service.status === 'active' ? '已连接' : service.status === 'error' ? '连接失败' : '未连接'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{service.description || '暂无描述'}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">{service.type}</Badge>
                    {service.endpoint && (
                      <span className="text-muted-foreground font-mono">
                        {service.endpoint}
                      </span>
                    )}
                  </div>
                  {service.lastSyncTime && (
                    <p className="text-xs text-muted-foreground">
                      最后同步: {formatDateTime(service.lastSyncTime)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(service.id)}
                    disabled={testing === service.id}
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    {testing === service.id ? '测试中...' : '测试连接'}
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/mcp-warehouse/${service.id}/query`}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      SQL查询
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(service)}>
                    <Edit className="h-4 w-4 mr-2" />
                    编辑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDelete(service.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>添加MCP服务</DialogTitle>
            <DialogDescription>配置外部数据源连接信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>服务名称 *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入服务名称"
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入服务描述"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>服务类型</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v as typeof formData.type })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="mongodb">MongoDB</SelectItem>
                  <SelectItem value="http">HTTP API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>连接地址</Label>
              <Input
                value={formData.endpoint}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                placeholder="http://或postgres://"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>主机</Label>
                <Input
                  value={formData.config.host || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, host: e.target.value },
                    })
                  }
                  placeholder="localhost"
                />
              </div>
              <div className="space-y-2">
                <Label>端口</Label>
                <Input
                  type="number"
                  value={formData.config.port || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, port: parseInt(e.target.value) },
                    })
                  }
                  placeholder="5432"
                />
              </div>
              <div className="space-y-2">
                <Label>数据库</Label>
                <Input
                  value={formData.config.database || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, database: e.target.value },
                    })
                  }
                  placeholder="database"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
              取消
            </Button>
            <Button onClick={handleCreate}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑MCP服务</DialogTitle>
            <DialogDescription>修改服务配置信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>服务名称 *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>服务类型</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v as typeof formData.type })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="mongodb">MongoDB</SelectItem>
                  <SelectItem value="http">HTTP API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>连接地址</Label>
              <Input
                value={formData.endpoint}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>主机</Label>
                <Input
                  value={formData.config.host || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, host: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>端口</Label>
                <Input
                  type="number"
                  value={formData.config.port || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, port: parseInt(e.target.value) },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>数据库</Label>
                <Input
                  value={formData.config.database || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, database: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedService(null); resetForm(); }}>
              取消
            </Button>
            <Button onClick={handleUpdate}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
