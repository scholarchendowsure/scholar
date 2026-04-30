'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Upload, FileSpreadsheet, CheckCircle, AlertCircle, XCircle,
  Trash2, RefreshCw, X, Edit, Save, Plus
} from 'lucide-react';
import { toast } from 'sonner';

interface MerchantSalesMapping {
  id: string;
  merchantId: string;
  feishuName: string;
  createdAt: string;
  updatedAt: string;
}

interface ImportRow {
  '商户ID'?: string;
  '销售飞书名称'?: string;
  merchantId?: string;
  feishuName?: string;
  [key: string]: string | undefined;
}

export default function MerchantSalesMappingPage() {
  const [mappings, setMappings] = useState<MerchantSalesMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  
  // 编辑相关状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFeishuName, setEditFeishuName] = useState('');
  
  // 新增相关状态
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMerchantId, setNewMerchantId] = useState('');
  const [newFeishuName, setNewFeishuName] = useState('');

  // 加载映射关系
  const loadMappings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/merchant-sales-mappings');
      const data = await res.json();
      if (data.success) {
        setMappings(data.data);
      } else {
        toast.error(data.error || '加载失败');
      }
    } catch (error) {
      console.error('加载映射关系失败:', error);
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  // 解析CSV
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  // 选择文件
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && 
          !selectedFile.name.endsWith('.xls') && 
          !selectedFile.name.endsWith('.csv')) {
        toast.error('请选择 Excel 或 CSV 文件');
        return;
      }
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  }, []);

  // 解析文件
  const parseFile = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('文件格式错误，请检查文件内容');
        return;
      }

      const headers = parseCSVLine(lines[0]);
      
      const data: ImportRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length > 0) {
          const row: ImportRow = {};
          headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim() || '';
          });
          // 兼容无表头格式
          if (!row.merchantId) row.merchantId = row['商户ID'] || values[0]?.trim();
          if (!row.feishuName) row.feishuName = row['销售飞书名称'] || values[1]?.trim();
          if (row.merchantId && row.feishuName) {
            data.push(row);
          }
        }
      }

      if (data.length === 0) {
        toast.error('未找到有效的数据行');
        return;
      }

      setPreviewData(data);
      setShowPreview(true);
    } catch (error) {
      console.error('解析文件失败:', error);
      toast.error('解析文件失败');
    }
  };

  // 导入映射关系
  const handleImport = async () => {
    try {
      setImporting(true);
      const mappingsToSave = previewData.map(row => ({
        merchantId: row.merchantId!,
        feishuName: row.feishuName!,
      }));

      const res = await fetch('/api/merchant-sales-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: mappingsToSave, mode: importMode }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('导入成功');
        setShowPreview(false);
        setPreviewData([]);
        setFile(null);
        loadMappings();
      } else {
        toast.error(data.error || '导入失败');
      }
    } catch (error) {
      console.error('导入失败:', error);
      toast.error('导入失败');
    } finally {
      setImporting(false);
    }
  };

  // 开始编辑
  const startEdit = (mapping: MerchantSalesMapping) => {
    setEditingId(mapping.id);
    setEditFeishuName(mapping.feishuName);
  };

  // 保存编辑
  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/merchant-sales-mappings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feishuName: editFeishuName }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('更新成功');
        setEditingId(null);
        loadMappings();
      } else {
        toast.error(data.error || '更新失败');
      }
    } catch (error) {
      console.error('更新失败:', error);
      toast.error('更新失败');
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null);
    setEditFeishuName('');
  };

  // 删除映射
  const deleteMapping = async (id: string) => {
    if (!confirm('确定要删除这个映射关系吗？')) return;
    
    try {
      const res = await fetch(`/api/merchant-sales-mappings/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        toast.success('删除成功');
        loadMappings();
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    }
  };

  // 新增映射
  const handleAdd = async () => {
    if (!newMerchantId.trim() || !newFeishuName.trim()) {
      toast.error('请填写完整信息');
      return;
    }

    try {
      const newMappings = [{ merchantId: newMerchantId.trim(), feishuName: newFeishuName.trim() }];
      const res = await fetch('/api/merchant-sales-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: newMappings, mode: 'merge' }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('添加成功');
        setShowAddDialog(false);
        setNewMerchantId('');
        setNewFeishuName('');
        loadMappings();
      } else {
        toast.error(data.error || '添加失败');
      }
    } catch (error) {
      console.error('添加失败:', error);
      toast.error('添加失败');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">商户-销售人员映射管理</h1>
          <p className="text-slate-500 mt-1">管理商户ID与销售飞书名称的映射关系</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新增映射
          </Button>
          <Button onClick={loadMappings} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      {/* 文件上传区域 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>导入映射关系</CardTitle>
          <CardDescription>
            上传包含商户ID和销售飞书名称的Excel/CSV文件
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
              id="mapping-file"
            />
            <label htmlFor="mapping-file" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <div className="text-lg font-medium text-slate-900 mb-1">
                {file ? file.name : '点击或拖拽文件到这里'}
              </div>
              <div className="text-sm text-slate-500">
                支持 Excel (.xlsx, .xls) 和 CSV 格式
              </div>
              {file && (
                <Button className="mt-4" onClick={() => setFile(null)}>
                  <XCircle className="w-4 h-4 mr-2" />
                  清除
                </Button>
              )}
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 预览对话框 */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>预览数据</DialogTitle>
            <DialogDescription>
              请确认以下数据是否正确
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">导入模式:</span>
              <select
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as 'replace' | 'merge')}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="replace">替换（清除现有数据）</option>
                <option value="merge">合并（保留现有数据）</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-auto border rounded">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>商户ID</TableHead>
                  <TableHead>销售飞书名称</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.merchantId}</TableCell>
                    <TableCell>{row.feishuName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowPreview(false)}>
              取消
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? '导入中...' : '确认导入'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新增对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增映射关系</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">商户ID</label>
              <Input
                value={newMerchantId}
                onChange={(e) => setNewMerchantId(e.target.value)}
                placeholder="请输入商户ID"
              />
            </div>
            <div>
              <label className="text-sm font-medium">销售飞书名称</label>
              <Input
                value={newFeishuName}
                onChange={(e) => setNewFeishuName(e.target.value)}
                placeholder="请输入销售飞书名称"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAdd}>
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 映射列表 */}
      <Card>
        <CardHeader>
          <CardTitle>映射关系列表</CardTitle>
          <CardDescription>
            共 {mappings.length} 条映射关系
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-slate-400" />
              <p className="text-slate-500 mt-2">加载中...</p>
            </div>
          ) : mappings.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>暂无映射关系，请上传文件导入</p>
            </div>
          ) : (
            <div className="border rounded overflow-auto max-h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-white">
                  <TableRow>
                    <TableHead>商户ID</TableHead>
                    <TableHead>销售飞书名称</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>更新时间</TableHead>
                    <TableHead className="w-[200px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell className="font-mono">{mapping.merchantId}</TableCell>
                      <TableCell>
                        {editingId === mapping.id ? (
                          <Input
                            value={editFeishuName}
                            onChange={(e) => setEditFeishuName(e.target.value)}
                            autoFocus
                          />
                        ) : (
                          mapping.feishuName
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(mapping.createdAt).toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(mapping.updatedAt).toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell>
                        {editingId === mapping.id ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveEdit(mapping.id)}>
                              <Save className="w-4 h-4 mr-1" />
                              保存
                            </Button>
                            <Button size="sm" variant="secondary" onClick={cancelEdit}>
                              <X className="w-4 h-4 mr-1" />
                              取消
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => startEdit(mapping)}>
                              <Edit className="w-4 h-4 mr-1" />
                              编辑
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteMapping(mapping.id)}>
                              <Trash2 className="w-4 h-4 mr-1" />
                              删除
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
