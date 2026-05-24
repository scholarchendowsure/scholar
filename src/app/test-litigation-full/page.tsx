'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, Trash2, Scale, FileText, Calendar, Ban } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import * as XLSX from 'xlsx';

// 模拟法律诉讼数据类型定义
interface LitigationRecord {
  id: string;
  caseName: string;
  caseIdentity: string;
  caseNumber: string;
  caseCause: string;
  caseAmount: string;
  caseProgress: string;
  courtName: string;
}

interface LimitHighRecord {
  id: string;
  caseNumber: string;
  limitObject: string;
  relatedObject: string;
  applicant: string;
  executeCourt: string;
  filingDate: string;
  publishDate: string;
}

interface EndCaseRecord {
  id: string;
  caseNumber: string;
  endCaseObject: string;
  relatedObject: string;
  applicant: string;
  executeCourt: string;
  filingDate: string;
  endCaseDate: string;
  unfulfilledAmount: string;
}

interface CourtNoticeRecord {
  id: string;
  caseName: string;
  caseNumber: string;
  courtName: string;
  courtRoom: string;
  judge: string;
  clerk: string;
  hearingTime: string;
  hearingReason: string;
}

interface LitigationData {
  litigationRecords: LitigationRecord[];
  limitHighRecords: LimitHighRecord[];
  endCaseRecords: EndCaseRecord[];
  courtNoticeRecords: CourtNoticeRecord[];
}

export default function TestLitigationFullPage() {
  const [data, setData] = useState<LitigationData | null>(null);
  const [importing, setImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 计算总记录数
  const totalRecords = 
    (data?.litigationRecords?.length || 0) + 
    (data?.limitHighRecords?.length || 0) + 
    (data?.endCaseRecords?.length || 0) + 
    (data?.courtNoticeRecords?.length || 0);

  // 下载模板
  const downloadTemplate = () => {
    // 模拟模板下载
    alert('模板下载功能（示例）');
  };

  // 文件导入处理
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('文件选择成功！', file.name);
    alert('文件选择成功：' + file.name);
    
    setUploadProgress(`正在读取文件: ${file.name}`);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        alert('文件读取成功！');
        
        setUploadProgress('');
        setShowImportDialog(false);
      } catch (error) {
        console.error('文件解析失败:', error);
        alert('文件解析失败，请检查文件格式');
        setUploadProgress('');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 删除记录
  const deleteRecord = (type: string, index: number) => {
    console.log('删除记录:', type, index);
  };

  return (
    <div>
      {/* 测试文件上传（最简单版本） */}
      <div className="mb-4 p-4 bg-muted rounded-lg">
        <h3 className="text-sm font-semibold mb-2">测试文件上传（最简单版本）</h3>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            console.log('文件选择成功！', e.target.files?.[0]?.name);
            alert('文件选择成功：' + (e.target.files?.[0]?.name || '无文件'));
          }}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                法律诉讼信息
              </CardTitle>
              <CardDescription>
                {totalRecords > 0 ? `共 ${totalRecords} 条记录` : '暂无数据'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileImport}
                className="hidden"
                id="litigation-file-upload"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4 mr-1" />
                模板下载
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                <Upload className="h-4 w-4 mr-1" />
                {importing ? '导入中...' : '导入Excel'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {totalRecords === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Scale className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>暂无法律诉讼信息</p>
              <p className="text-sm mt-1">点击"导入Excel"添加数据</p>
            </div>
          ) : (
            <Tabs defaultValue="litigation" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="litigation" className="flex items-center gap-1">
                  <Scale className="h-3 w-3" />
                  司法案件 ({data?.litigationRecords?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="limit" className="flex items-center gap-1">
                  <Ban className="h-3 w-3" />
                  限高 ({data?.limitHighRecords?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="end" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  终本 ({data?.endCaseRecords?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="notice" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  开庭 ({data?.courtNoticeRecords?.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* 司法案件 */}
              <TabsContent value="litigation" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">序号</TableHead>
                        <TableHead>案件名称</TableHead>
                        <TableHead>身份</TableHead>
                        <TableHead>案号</TableHead>
                        <TableHead>案由</TableHead>
                        <TableHead className="text-right">金额(元)</TableHead>
                        <TableHead>进程</TableHead>
                        <TableHead>法院</TableHead>
                        <TableHead className="w-12">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.litigationRecords?.map((record, index) => (
                        <TableRow key={record.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{record.caseName}</TableCell>
                          <TableCell>
                            <Badge variant={record.caseIdentity === '被告' ? 'destructive' : 'secondary'}>
                              {record.caseIdentity}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{record.caseNumber}</TableCell>
                          <TableCell className="max-w-[120px] truncate">{record.caseCause}</TableCell>
                          <TableCell className="text-right font-mono">
                            {record.caseAmount ? `¥${Number(record.caseAmount).toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{record.caseProgress}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate text-xs">{record.courtName}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRecord('litigation', index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* 限制高消费 */}
              <TabsContent value="limit" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">序号</TableHead>
                        <TableHead>案号</TableHead>
                        <TableHead>限消对象</TableHead>
                        <TableHead>关联对象</TableHead>
                        <TableHead>申请人</TableHead>
                        <TableHead>执行法院</TableHead>
                        <TableHead>立案日期</TableHead>
                        <TableHead>发布</TableHead>
                        <TableHead className="w-12">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.limitHighRecords?.map((record, index) => (
                        <TableRow key={record.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{record.caseNumber}</TableCell>
                          <TableCell>{record.limitObject}</TableCell>
                          <TableCell>{record.relatedObject}</TableCell>
                          <TableCell>{record.applicant}</TableCell>
                          <TableCell className="max-w-[150px] truncate text-xs">{record.executeCourt}</TableCell>
                          <TableCell>{record.filingDate}</TableCell>
                          <TableCell>{record.publishDate}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRecord('limit', index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* 终本案件 */}
              <TabsContent value="end" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">序号</TableHead>
                        <TableHead>案号</TableHead>
                        <TableHead>终本对象</TableHead>
                        <TableHead>关联对象</TableHead>
                        <TableHead>申请人</TableHead>
                        <TableHead>执行法院</TableHead>
                        <TableHead>立案日期</TableHead>
                        <TableHead>终本日期</TableHead>
                        <TableHead className="text-right">未履行金额(元)</TableHead>
                        <TableHead className="w-12">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.endCaseRecords?.map((record, index) => (
                        <TableRow key={record.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{record.caseNumber}</TableCell>
                          <TableCell>{record.endCaseObject}</TableCell>
                          <TableCell>{record.relatedObject}</TableCell>
                          <TableCell>{record.applicant}</TableCell>
                          <TableCell className="max-w-[150px] truncate text-xs">{record.executeCourt}</TableCell>
                          <TableCell>{record.filingDate}</TableCell>
                          <TableCell>{record.endCaseDate}</TableCell>
                          <TableCell className="text-right font-mono">
                            {record.unfulfilledAmount ? `¥${Number(record.unfulfilledAmount).toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRecord('end', index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* 开庭公告 */}
              <TabsContent value="notice" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">序号</TableHead>
                        <TableHead>案件名称</TableHead>
                        <TableHead>案号</TableHead>
                        <TableHead>法院</TableHead>
                        <TableHead>法庭</TableHead>
                        <TableHead>审判员</TableHead>
                        <TableHead>书记员</TableHead>
                        <TableHead>开庭时间</TableHead>
                        <TableHead>事由</TableHead>
                        <TableHead className="w-12">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.courtNoticeRecords?.map((record, index) => (
                        <TableRow key={record.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{record.caseName}</TableCell>
                          <TableCell className="font-mono text-xs">{record.caseNumber}</TableCell>
                          <TableCell className="max-w-[120px] truncate text-xs">{record.courtName}</TableCell>
                          <TableCell>{record.courtRoom}</TableCell>
                          <TableCell>{record.judge}</TableCell>
                          <TableCell>{record.clerk}</TableCell>
                          <TableCell>{record.hearingTime}</TableCell>
                          <TableCell className="max-w-[120px] truncate">{record.hearingReason}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRecord('notice', index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* 导入Excel对话框 */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>导入法律诉讼信息</DialogTitle>
            <DialogDescription>请选择Excel文件导入法律诉讼信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {uploadProgress && (
              <div className="p-3 bg-muted rounded-lg text-sm text-center">
                {uploadProgress}
              </div>
            )}
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <Upload className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">上传Excel文件</h3>
              <p className="text-sm text-muted-foreground mb-4">点击下方按钮选择文件</p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  console.log('Dialog文件选择成功！', e.target.files?.[0]?.name);
                  alert('Dialog文件选择成功：' + (e.target.files?.[0]?.name || '无文件'));
                }}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}