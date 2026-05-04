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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils';
import {
  User,
  UserRole,
  UserStatus,
  Role,
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
  INITIAL_PASSWORD,
  DEFAULT_PASSWORD_RULE,
  ALL_PERMISSION_OPTIONS,
} from '@/types/user';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Unlock,
  Key,
  Eye,
  Download,
  Shield,
  Clock,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface PaginatedResponse {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [activeTab, setActiveTab] = useState('users');
  
  // 筛选条件
  const [filters, setFilters] = useState({
    keyword: '',
    username: '',
    realName: '',
    position: '',
    department: '',
    status: '',
    startDate: '',
    endDate: '',
  });
  const [page, setPage] = useState(1);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // 角色管理状态
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [roleCreateDialogOpen, setRoleCreateDialogOpen] = useState(false);
  const [roleEditDialogOpen, setRoleEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    code: '',
    description: '',
    permissions: [] as string[],
  });

  // Form states
  const [formData, setFormData] = useState({
    realName: '',
    username: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    role: 'agent' as UserRole,
    allowedIps: '',
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', '20');
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const res = await fetch(`/api/users?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      toast.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const res = await fetch('/api/roles');
      const result = await res.json();
      if (result.success) {
        setRoles(result.data);
      }
    } catch (error) {
      toast.error('获取角色列表失败');
    } finally {
      setRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else {
      fetchRoles();
    }
  }, [activeTab, fetchUsers, fetchRoles]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleResetFilters = () => {
    setFilters({
      keyword: '',
      username: '',
      realName: '',
      position: '',
      department: '',
      status: '',
      startDate: '',
      endDate: '',
    });
    setPage(1);
  };

  const handleCreate = async () => {
    if (!formData.realName || !formData.username) {
      toast.error('请填写必填字段');
      return;
    }

    try {
      const userData = {
        ...formData,
        allowedIps: formData.allowedIps ? formData.allowedIps.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(result.data?.message || '用户创建成功');
        setCreateDialogOpen(false);
        resetForm();
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || '创建失败');
      }
    } catch (error) {
      toast.error('创建失败');
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser || !formData.realName) {
      toast.error('请填写必填字段');
      return;
    }

    try {
      const updateData = {
        realName: formData.realName,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        position: formData.position,
        role: formData.role,
        allowedIps: formData.allowedIps ? formData.allowedIps.split(',').map(s => s.trim()).filter(Boolean) : [],
      };

      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        toast.success('用户更新成功');
        setEditDialogOpen(false);
        setSelectedUser(null);
        resetForm();
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || '更新失败');
      }
    } catch (error) {
      toast.error('更新失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该用户吗？此操作不可恢复！')) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const json = await res.json();
      
      if (json.success) {
        toast.success('用户已删除');
        fetchUsers();
      } else {
        toast.error(json.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!confirm(`确定要重置用户 ${user.realName} 的密码吗？`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password' }),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(result.data?.message || '密码重置成功');
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || '重置失败');
      }
    } catch (error) {
      toast.error('重置失败');
    }
  };

  const handleUnlock = async (user: User) => {
    if (!confirm(`确定要解锁用户 ${user.realName} 吗？`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock' }),
      });

      if (res.ok) {
        toast.success('用户已解锁');
        fetchUsers();
      } else {
        toast.error('解锁失败');
      }
    } catch (error) {
      toast.error('解锁失败');
    }
  };

  const handleToggleStatus = async (user: User) => {
    const action = user.status === 'active' ? '停用' : '启用';
    if (!confirm(`确定要${action}用户 ${user.realName} 吗？`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_status' }),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(result.data?.message || '操作成功');
        fetchUsers();
      } else {
        toast.error('操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleSyncFeishu = async () => {
    if (!confirm('确定要从飞书同步用户吗？这将会新增或更新系统用户。')) return;

    try {
      const toastId = toast.loading('正在从飞书同步用户...');
      
      const res = await fetch('/api/users/sync-feishu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await res.json();
      
      if (result.success) {
        toast.success(result.message || '同步成功', { id: toastId });
        // 刷新用户列表
        fetchUsers();
      } else {
        toast.error(result.error || '同步失败', { id: toastId });
      }
    } catch (error) {
      toast.error('同步失败');
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.set('export', 'true');
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const res = await fetch(`/api/users?${params.toString()}`);
      const result = await res.json();
      
      if (result.success) {
        // 生成CSV
        const users = result.data.data;
        const headers = [
          '序号', '用户名', '真实姓名', '手机号', '邮箱', '部门', '岗位', '角色', '状态', '创建时间', '最后登录'
        ];
        const csv = [
          headers.join(','),
          ...users.map((u: User) => [
            u.sequence,
            u.username,
            u.realName,
            u.phone || '',
            u.email || '',
            u.department || '',
            u.position || '',
            USER_ROLE_LABELS[u.role],
            USER_STATUS_LABELS[u.status],
            u.createdAt,
            u.lastLoginTime || '',
          ].join(',')),
        ].join('\n');

        // 下载
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `用户列表_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast.success('导出成功');
      }
    } catch (error) {
      toast.error('导出失败');
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      realName: user.realName,
      username: user.username,
      email: user.email || '',
      phone: user.phone || '',
      department: user.department || '',
      position: user.position || '',
      role: user.role,
      allowedIps: user.allowedIps?.join(', ') || '',
    });
    setEditDialogOpen(true);
  };

  const openViewDialog = (user: User) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
  };

  // ===== 角色管理函数 =====
  const handleRoleCreate = async () => {
    if (!roleFormData.name || !roleFormData.code || roleFormData.permissions.length === 0) {
      toast.error('请填写必填字段并选择至少一个权限');
      return;
    }

    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleFormData),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success('角色创建成功');
        setRoleCreateDialogOpen(false);
        resetRoleForm();
        fetchRoles();
      } else {
        const err = await res.json();
        toast.error(err.error || '创建失败');
      }
    } catch (error) {
      toast.error('创建失败');
    }
  };

  const handleRoleUpdate = async () => {
    if (!selectedRole) return;
    if (!roleFormData.name || !roleFormData.code || roleFormData.permissions.length === 0) {
      toast.error('请填写必填字段并选择至少一个权限');
      return;
    }

    try {
      const res = await fetch(`/api/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleFormData),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success('角色更新成功');
        setRoleEditDialogOpen(false);
        resetRoleForm();
        fetchRoles();
      } else {
        const err = await res.json();
        toast.error(err.error || '更新失败');
      }
    } catch (error) {
      toast.error('更新失败');
    }
  };

  const handleRoleDelete = async (role: Role) => {
    if (role.isSystem) {
      toast.error('系统内置角色不能删除');
      return;
    }
    if (!confirm('确定要删除该角色吗？此操作不可恢复！')) return;

    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: 'DELETE' });

      if (res.ok) {
        toast.success('角色已删除');
        fetchRoles();
      } else {
        const err = await res.json();
        toast.error(err.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const openRoleEditDialog = (role: Role) => {
    setSelectedRole(role);
    setRoleFormData({
      name: role.name,
      code: role.code,
      description: role.description || '',
      permissions: [...role.permissions],
    });
    setRoleEditDialogOpen(true);
  };

  const resetRoleForm = () => {
    setRoleFormData({
      name: '',
      code: '',
      description: '',
      permissions: [],
    });
    setSelectedRole(null);
  };

  const resetForm = () => {
    setFormData({
      realName: '',
      username: '',
      email: '',
      phone: '',
      department: '',
      position: '',
      role: 'agent',
      allowedIps: '',
    });
  };

  const getStatusBadge = (status: UserStatus) => {
    const colors: Record<UserStatus, string> = {
      active: 'bg-[hsl(145,65%,38%)]',
      inactive: 'bg-muted text-muted-foreground',
      locked: 'bg-destructive',
    };
    return (
      <Badge className={colors[status]}>
        {USER_STATUS_LABELS[status]}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleSyncFeishu} 
            variant="secondary"
          >
            <Users className="h-4 w-4 mr-2" />
            同步飞书用户
          </Button>
          <Button onClick={handleExport} variant="secondary">
            <Download className="h-4 w-4 mr-2" />
            导出用户
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新建用户
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            用户列表
          </TabsTrigger>
          <TabsTrigger value="roles">
            <ShieldCheck className="h-4 w-4 mr-2" />
            角色管理
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            安全规则
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>关键词搜索</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="姓名、用户名、手机号..."
                        value={filters.keyword}
                        onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>用户名</Label>
                    <Input
                      placeholder="按用户名筛选"
                      value={filters.username}
                      onChange={(e) => setFilters({ ...filters, username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>真实姓名</Label>
                    <Input
                      placeholder="按真实姓名筛选"
                      value={filters.realName}
                      onChange={(e) => setFilters({ ...filters, realName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>岗位</Label>
                    <Input
                      placeholder="按岗位筛选"
                      value={filters.position}
                      onChange={(e) => setFilters({ ...filters, position: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>部门</Label>
                    <Input
                      placeholder="按部门筛选"
                      value={filters.department}
                      onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>状态</Label>
                    <Select value={filters.status || 'all'} onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? '' : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="全部状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部状态</SelectItem>
                        <SelectItem value="active">正常</SelectItem>
                        <SelectItem value="inactive">停用</SelectItem>
                        <SelectItem value="locked">锁定</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>创建时间（开始）</Label>
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>创建时间（结束）</Label>
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button type="submit" variant="secondary">
                    <Search className="h-4 w-4 mr-2" />
                    筛选
                  </Button>
                  <Button type="button" variant="ghost" onClick={handleResetFilters}>
                    重置
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>序号</TableHead>
                    <TableHead>用户名</TableHead>
                    <TableHead>真实姓名</TableHead>
                    <TableHead>手机号</TableHead>
                    <TableHead>部门</TableHead>
                    <TableHead>岗位</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>最后登录</TableHead>
                    <TableHead className="w-[100px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : data?.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        暂无用户数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.data.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.sequence}</TableCell>
                        <TableCell className="font-mono text-sm">{user.username}</TableCell>
                        <TableCell className="font-medium">{user.realName}</TableCell>
                        <TableCell>{user.phone || '-'}</TableCell>
                        <TableCell>{user.department || '-'}</TableCell>
                        <TableCell>{user.position || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{USER_ROLE_LABELS[user.role]}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDateTime(user.createdAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {user.lastLoginTime ? formatDateTime(user.lastLoginTime) : '从未登录'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openViewDialog(user)}>
                                <Eye className="h-4 w-4 mr-2" />
                                查看详情
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                <Edit className="h-4 w-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                <Key className="h-4 w-4 mr-2" />
                                重置密码
                              </DropdownMenuItem>
                              {user.status === 'locked' && (
                                <DropdownMenuItem onClick={() => handleUnlock(user)}>
                                  <Unlock className="h-4 w-4 mr-2" />
                                  解锁账号
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                                <Clock className="h-4 w-4 mr-2" />
                                {user.status === 'active' ? '停用' : '启用'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(user.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                共 {data.total} 条记录，第 {data.page}/{data.totalPages} 页
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">{page} / {data.totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === data.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          {/* 角色管理头部 */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">角色管理</h2>
              <p className="text-sm text-muted-foreground">管理系统角色和权限配置</p>
            </div>
            <Button onClick={() => { resetRoleForm(); setRoleCreateDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              新建角色
            </Button>
          </div>

          {/* 角色列表 */}
          <Card>
            <CardContent className="pt-6">
              {rolesLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>角色名称</TableHead>
                      <TableHead>角色编码</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>权限数量</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                          暂无角色数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      roles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">{role.name}</TableCell>
                          <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{role.code}</code></TableCell>
                          <TableCell className="text-muted-foreground max-w-xs truncate">{role.description || '-'}</TableCell>
                          <TableCell>{role.permissions.includes('*') ? '全部' : role.permissions.length} 项</TableCell>
                          <TableCell>
                            {role.isSystem ? (
                              <Badge variant="secondary">系统内置</Badge>
                            ) : (
                              <Badge variant="outline">自定义</Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatDateTime(role.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openRoleEditDialog(role)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  disabled={role.isSystem}
                                  onClick={() => handleRoleDelete(role)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>安全规则配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">密码规则</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>密码长度</Label>
                    <p className="text-sm text-muted-foreground">
                      {DEFAULT_PASSWORD_RULE.minLength} - {DEFAULT_PASSWORD_RULE.maxLength} 位
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>复杂度要求</Label>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>✓ 大写字母 (A-Z)</p>
                      <p>✓ 小写字母 (a-z)</p>
                      <p>✓ 数字 (0-9)</p>
                      <p>✓ 特殊符号 ({DEFAULT_PASSWORD_RULE.specialChars})</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>密码过期时间</Label>
                    <p className="text-sm text-muted-foreground">{DEFAULT_PASSWORD_RULE.passwordExpiryDays} 天</p>
                  </div>
                  <div className="space-y-2">
                    <Label>历史密码限制</Label>
                    <p className="text-sm text-muted-foreground">禁止使用最近 {DEFAULT_PASSWORD_RULE.historyCount} 次密码</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">登录限制</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>连续失败锁定</Label>
                    <p className="text-sm text-muted-foreground">连续 5 次密码错误锁定账号</p>
                  </div>
                  <div className="space-y-2">
                    <Label>锁定时间</Label>
                    <p className="text-sm text-muted-foreground">锁定 1 小时（管理员可手动解锁）</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">初始密码</h3>
                <Badge variant="outline" className="font-mono">{INITIAL_PASSWORD}</Badge>
                <p className="text-sm text-muted-foreground">
                  新用户创建或管理员重置密码后，使用此初始密码，首次登录必须修改密码
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建用户</DialogTitle>
            <DialogDescription>创建新的系统用户，初始密码为 {INITIAL_PASSWORD}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>真实姓名 *</Label>
                <Input
                  value={formData.realName}
                  onChange={(e) => setFormData({ ...formData, realName: e.target.value })}
                  placeholder="请输入真实姓名"
                />
              </div>
              <div className="space-y-2">
                <Label>登录用户名 *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="请输入登录用户名"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>手机号</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="请输入手机号"
                />
              </div>
              <div className="space-y-2">
                <Label>邮箱</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="请输入邮箱"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>部门</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="请输入部门"
                />
              </div>
              <div className="space-y-2">
                <Label>岗位</Label>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="请输入岗位"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>角色</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">超级管理员</SelectItem>
                    <SelectItem value="admin">系统管理员</SelectItem>
                    <SelectItem value="manager">经理</SelectItem>
                    <SelectItem value="agent">外访员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>IP白名单（逗号分隔，留空表示无限制）</Label>
                <Input
                  value={formData.allowedIps}
                  onChange={(e) => setFormData({ ...formData, allowedIps: e.target.value })}
                  placeholder="例如: 192.168.1.1, 192.168.1.2"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>取消</Button>
            <Button onClick={handleCreate}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription>修改用户信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>真实姓名 *</Label>
                <Input
                  value={formData.realName}
                  onChange={(e) => setFormData({ ...formData, realName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>登录用户名</Label>
                <Input value={formData.username} disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>手机号</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>邮箱</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>部门</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>岗位</Label>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>角色</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">超级管理员</SelectItem>
                    <SelectItem value="admin">系统管理员</SelectItem>
                    <SelectItem value="manager">经理</SelectItem>
                    <SelectItem value="agent">外访员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>IP白名单（逗号分隔，留空表示无限制）</Label>
                <Input
                  value={formData.allowedIps}
                  onChange={(e) => setFormData({ ...formData, allowedIps: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
            <Button onClick={handleUpdate}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>用户详情</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>序号</Label>
                  <p className="text-sm">{selectedUser.sequence}</p>
                </div>
                <div className="space-y-2">
                  <Label>用户名</Label>
                  <p className="text-sm font-mono">{selectedUser.username}</p>
                </div>
                <div className="space-y-2">
                  <Label>真实姓名</Label>
                  <p className="text-sm">{selectedUser.realName}</p>
                </div>
                <div className="space-y-2">
                  <Label>手机号</Label>
                  <p className="text-sm">{selectedUser.phone || '-'}</p>
                </div>
                <div className="space-y-2">
                  <Label>邮箱</Label>
                  <p className="text-sm">{selectedUser.email || '-'}</p>
                </div>
                <div className="space-y-2">
                  <Label>部门</Label>
                  <p className="text-sm">{selectedUser.department || '-'}</p>
                </div>
                <div className="space-y-2">
                  <Label>岗位</Label>
                  <p className="text-sm">{selectedUser.position || '-'}</p>
                </div>
                <div className="space-y-2">
                  <Label>角色</Label>
                  <Badge variant="outline">{USER_ROLE_LABELS[selectedUser.role]}</Badge>
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  {getStatusBadge(selectedUser.status)}
                </div>
                <div className="space-y-2">
                  <Label>登录失败次数</Label>
                  <p className="text-sm">{selectedUser.loginAttempts}</p>
                </div>
                <div className="space-y-2">
                  <Label>首次登录需改密码</Label>
                  <Badge variant={selectedUser.mustChangePassword ? 'default' : 'outline'}>
                    {selectedUser.mustChangePassword ? '是' : '否'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label>密码修改时间</Label>
                  <p className="text-sm">{selectedUser.passwordChangedAt ? formatDateTime(selectedUser.passwordChangedAt) : '-'}</p>
                </div>
                <div className="space-y-2">
                  <Label>IP白名单</Label>
                  <p className="text-sm">{selectedUser.allowedIps?.length ? selectedUser.allowedIps.join(', ') : '无限制'}</p>
                </div>
                <div className="space-y-2">
                  <Label>锁定到期时间</Label>
                  <p className="text-sm">{selectedUser.lockedUntil ? formatDateTime(selectedUser.lockedUntil) : '-'}</p>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>创建时间</Label>
                  <p className="text-sm">{formatDateTime(selectedUser.createdAt)}</p>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>最后登录时间</Label>
                  <p className="text-sm">{selectedUser.lastLoginTime ? formatDateTime(selectedUser.lastLoginTime) : '从未登录'}</p>
                </div>
                {selectedUser.lastLoginIp && (
                  <div className="space-y-2 col-span-2">
                    <Label>最后登录IP</Label>
                    <p className="text-sm">{selectedUser.lastLoginIp}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建角色 Dialog */}
      <Dialog open={roleCreateDialogOpen} onOpenChange={setRoleCreateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>新建角色</DialogTitle>
            <DialogDescription>创建新的系统角色</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>角色名称 *</Label>
                <Input
                  value={roleFormData.name}
                  onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                  placeholder="请输入角色名称"
                />
              </div>
              <div className="space-y-2">
                <Label>角色编码 *</Label>
                <Input
                  value={roleFormData.code}
                  onChange={(e) => setRoleFormData({ ...roleFormData, code: e.target.value })}
                  placeholder="例如: custom_role"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>角色描述</Label>
              <Input
                value={roleFormData.description}
                onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                placeholder="请输入角色描述"
              />
            </div>
            <div className="space-y-2">
              <Label>权限配置 *</Label>
              <div className="border rounded-md p-4 bg-muted/30">
                <div className="flex flex-wrap gap-3">
                  {ALL_PERMISSION_OPTIONS.map((perm) => (
                    <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={roleFormData.permissions.includes(perm.key)}
                        onChange={(e) => {
                          const newPerms = e.target.checked
                            ? [...roleFormData.permissions, perm.key]
                            : roleFormData.permissions.filter((p) => p !== perm.key);
                          setRoleFormData({ ...roleFormData, permissions: newPerms });
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleCreateDialogOpen(false)}>取消</Button>
            <Button onClick={handleRoleCreate}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑角色 Dialog */}
      <Dialog open={roleEditDialogOpen} onOpenChange={setRoleEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>编辑角色</DialogTitle>
            <DialogDescription>修改角色信息</DialogDescription>
          </DialogHeader>
          {selectedRole && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>角色名称 *</Label>
                  <Input
                    value={roleFormData.name}
                    onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>角色编码</Label>
                  <Input
                    value={roleFormData.code}
                    onChange={(e) => setRoleFormData({ ...roleFormData, code: e.target.value })}
                    disabled={selectedRole.isSystem}
                  />
                  {selectedRole.isSystem && (
                    <p className="text-xs text-muted-foreground">系统内置角色不能修改编码</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>角色描述</Label>
                <Input
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>权限配置 *</Label>
                <div className="border rounded-md p-4 bg-muted/30">
                  <div className="flex flex-wrap gap-3">
                    {ALL_PERMISSION_OPTIONS.map((perm) => (
                      <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={roleFormData.permissions.includes(perm.key)}
                          onChange={(e) => {
                            const newPerms = e.target.checked
                              ? [...roleFormData.permissions, perm.key]
                              : roleFormData.permissions.filter((p) => p !== perm.key);
                            setRoleFormData({ ...roleFormData, permissions: newPerms });
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleEditDialogOpen(false)}>取消</Button>
            <Button onClick={handleRoleUpdate}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
