'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, Trash2, Plus, AlertCircle, Scale, Ban, FileText, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

// 日期格式化函数
const formatDate = (dateStr: string | number | undefined | null): string => {
  if (!dateStr || dateStr === '-') return '-';
  
  let date: Date;
  
  // 如果是数字
  if (typeof dateStr === 'number') {
    // 检查是否是 Excel 日期序列号（通常在 20000-50000 之间）
    if (dateStr > 20000 && dateStr < 50000) {
      // Excel 日期序列号转日期：1900-01-01 为第1天
      // 注意：Excel 有 1900 年闰年bug，需要减去2天
      const excelEpoch = new Date(1899, 11, 30);
      date = new Date(excelEpoch.getTime() + dateStr * 24 * 60 * 60 * 1000);
    } else {
      // 假设是时间戳
      date = new Date(dateStr);
    }
  } 
  // 如果是数字字符串
  else if (/^\d+$/.test(dateStr)) {
    const num = parseInt(dateStr);
    // 检查是否是 Excel 日期序列号
    if (num > 20000 && num < 50000) {
      const excelEpoch = new Date(1899, 11, 30);
      date = new Date(excelEpoch.getTime() + num * 24 * 60 * 60 * 1000);
    } else {
      date = new Date(num);
    }
  } 
  // 其他格式（如 "2026-03-03"）
  else {
    date = new Date(dateStr);
  }
  
  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    return String(dateStr);
  }
  
  // 格式化为 YYYY/MM/DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}/${month}/${day}`;
};

interface LitigationRecord {
  id: string;
  caseNumber: string;
  caseName: string;
  caseIdentity: string;
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
  executionCourt: string;
  filingDate: string;
  publishDate: string;
}

interface EndCaseRecord {
  id: string;
  caseNumber: string;
  subjectName: string;
  unpaidAmount: string;
  executionAmount: string;
  executionCourt: string;
  filingDate: string;
  endDate: string;
}

interface CourtNoticeRecord {
  id: string;
  caseNumber: string;
  caseCause: string;
  parties: string;
  court: string;
  hearingDate: string;
}

interface LegalLitigationData {
  caseId: string;
  litigationRecords: LitigationRecord[];
  limitHighRecords: LimitHighRecord[];
  endCaseRecords: EndCaseRecord[];
  courtNoticeRecords: CourtNoticeRecord[];
}

interface LegalLitigationTabProps {
  caseId: string;
}

export function LegalLitigationTab({ caseId }: LegalLitigationTabProps) {
  const [data, setData] = useState<LegalLitigationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载数据
  const loadData = async () => {
    try {
      const res = await fetch(`/api/legal-litigation?caseId=${caseId}`);
      const result = await res.json();
      if (result.success && result.data) {
        // 转换API数据结构为组件期望的结构
        // 司法案件字段映射
        const judicialCases = (result.data.judicialCases || []).map((record: any) => ({
          id: record.id || '',
          caseNumber: record.caseNumber || '',
          caseName: record.caseName || '',
          caseIdentity: record.caseIdentity || record.caseRole || '', // 兼容两个字段名
          caseCause: record.caseCause || record.caseReason || '',
          caseAmount: record.caseAmount || record.amount || '',
          caseProgress: record.caseProgress || record.latestProcess || '',
          courtName: record.courtName || ''
        }));
        
        // 限制高消费字段映射
        const limitHighRecords = (result.data['限制高消费'] || []).map((record: any) => ({
          id: record.id || '',
          caseNumber: record.caseNumber || '',
          limitObject: record.limitObject || record.target || '',
          relatedObject: record.relatedObject || record.relatedPerson || '',
          applicant: record.applicant || '',
          executionCourt: record.executionCourt || record.court || '',
          filingDate: record.filingDate || '',
          publishDate: record.publishDate || ''
        }));
        
        // 终本案件字段映射
        const endCaseRecords = (result.data['终本案件'] || []).map((record: any) => ({
          id: record.id || '',
          caseNumber: record.caseNumber || '',
          subjectName: record.subjectName || record.subject || '',
          unpaidAmount: record.unpaidAmount || record.unfulfilledAmount || '',
          executionAmount: record.executionAmount || '',
          executionCourt: record.executionCourt || record.court || '',
          filingDate: record.filingDate || '',
          endDate: record.endDate || ''
        }));
        
        // 开庭公告字段映射
        const courtNoticeRecords = (result.data['开庭公告'] || []).map((record: any) => ({
          id: record.id || '',
          caseNumber: record.caseNumber || '',
          caseCause: record.caseCause || record.caseReason || '',
          parties: record.parties || '',
          court: record.court || '',
          hearingDate: record.hearingDate || ''
        }));
        
        setData({
          caseId: result.data.caseId || caseId,
          litigationRecords: judicialCases,
          limitHighRecords,
          endCaseRecords,
          courtNoticeRecords
        });
      } else {
        setData(null);
      }
    } catch (error) {
      console.error('加载法律诉讼数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [caseId]);

  // 解析Excel
  const parseExcel = (workbook: XLSX.WorkBook) => {
    const litigationRecords: LitigationRecord[] = [];
    const limitHighRecords: LimitHighRecord[] = [];
    const endCaseRecords: EndCaseRecord[] = [];
    const courtNoticeRecords: CourtNoticeRecord[] = [];

    // 解析司法案件 Sheet
    if (workbook.SheetNames.includes('司法案件')) {
      const sheet = workbook.Sheets['司法案件'];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      // 从第3行开始（跳过标题行）
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row && row.length > 0 && row[0]) {
          litigationRecords.push({
            id: `lit-${i}`,
            caseName: row[1] || '',
            caseIdentity: row[2] || '',
            caseNumber: row[3] || '',
            caseCause: row[4] || '',
            caseAmount: row[5] || '',
            caseProgress: row[6] || '',
            courtName: row[7] || ''
          });
        }
      }
    }

    // 解析限制高消费 Sheet
    if (workbook.SheetNames.includes('限制高消费')) {
      const sheet = workbook.Sheets['限制高消费'];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row && row.length > 0 && row[0]) {
          limitHighRecords.push({
            id: `limit-${i}`,
            caseNumber: row[1] || '',
            limitObject: row[2] || '',
            relatedObject: row[3] || '',
            applicant: row[4] || '',
            executionCourt: row[5] || '',
            filingDate: row[6] || '',
            publishDate: row[7] || ''
          });
        }
      }
    }

    // 解析终本案件 Sheet
    if (workbook.SheetNames.includes('终本案件')) {
      const sheet = workbook.Sheets['终本案件'];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row && row.length > 0 && row[0]) {
          endCaseRecords.push({
            id: `end-${i}`,
            caseNumber: row[1] || '',
            subjectName: row[2] || '',
            unpaidAmount: row[3] || '',
            executionAmount: row[4] || '',
            executionCourt: row[5] || '',
            filingDate: row[6] || '',
            endDate: row[7] || ''
          });
        }
      }
    }

    // 解析开庭公告 Sheet
    if (workbook.SheetNames.includes('开庭公告')) {
      const sheet = workbook.Sheets['开庭公告'];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row && row.length > 0 && row[0]) {
          courtNoticeRecords.push({
            id: `notice-${i}`,
            caseNumber: row[1] || '',
            caseCause: row[2] || '',
            parties: row[3] || '',
            court: row[4] || '',
            hearingDate: row[5] || ''
          });
        }
      }
    }

    return { litigationRecords, limitHighRecords, endCaseRecords, courtNoticeRecords };
  };

  // 处理文件导入
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('开始导入文件:', file.name);
    setImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      console.log('工作表列表:', workbook.SheetNames);
      
      const parsed = parseExcel(workbook);
      console.log('解析结果:', {
        litigationRecords: parsed.litigationRecords.length,
        limitHighRecords: parsed.limitHighRecords.length,
        endCaseRecords: parsed.endCaseRecords.length,
        courtNoticeRecords: parsed.courtNoticeRecords.length
      });

      // 保存到服务器
      const res = await fetch('/api/legal-litigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          ...parsed
        })
      });

      const result = await res.json();
      console.log('服务器响应:', result);

      if (result.success) {
        await loadData();
        alert('导入成功！');
      } else {
        alert('导入失败: ' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 下载模板
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // 司法案件模板
    const litigationTemplate = [
      ['序号', '案件名称', '案件身份', '案号', '案由', '案件金额(元)', '最新案件进程', '法院名称'],
      [1, '', '', '', '', '', '', '']
    ];
    const litigationSheet = XLSX.utils.aoa_to_sheet(litigationTemplate);
    XLSX.utils.book_append_sheet(wb, litigationSheet, '司法案件');

    // 限制高消费模板
    const limitTemplate = [
      ['序号', '案号', '限消令对象', '关联对象', '申请人', '执行法院', '立案日期', '发布日期'],
      [1, '', '', '', '', '', '', '']
    ];
    const limitSheet = XLSX.utils.aoa_to_sheet(limitTemplate);
    XLSX.utils.book_append_sheet(wb, limitSheet, '限制高消费');

    // 终本案件模板
    const endTemplate = [
      ['序号', '案号', '主体名称', '未履行金额(元)', '执行标的(元)', '执行法院', '立案日期', '终本日期'],
      [1, '', '', '', '', '', '', '']
    ];
    const endSheet = XLSX.utils.aoa_to_sheet(endTemplate);
    XLSX.utils.book_append_sheet(wb, endSheet, '终本案件');

    // 开庭公告模板
    const noticeTemplate = [
      ['序号', '案号', '案由', '当事人', '审理法院', '开庭时间'],
      [1, '', '', '', '', '']
    ];
    const noticeSheet = XLSX.utils.aoa_to_sheet(noticeTemplate);
    XLSX.utils.book_append_sheet(wb, noticeSheet, '开庭公告');

    XLSX.writeFile(wb, '法律诉讼信息模板.xlsx');
  };

  // 删除单条记录
  const deleteRecord = async (type: string, index: number) => {
    if (!data) return;
    
    let newData = { ...data };
    
    switch (type) {
      case 'litigation':
        newData.litigationRecords = data.litigationRecords.filter((_, i) => i !== index);
        break;
      case 'limit':
        newData.limitHighRecords = data.limitHighRecords.filter((_, i) => i !== index);
        break;
      case 'end':
        newData.endCaseRecords = data.endCaseRecords.filter((_, i) => i !== index);
        break;
      case 'notice':
        newData.courtNoticeRecords = data.courtNoticeRecords.filter((_, i) => i !== index);
        break;
    }

    const res = await fetch('/api/legal-litigation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId,
        litigationRecords: newData.litigationRecords,
        limitHighRecords: newData.limitHighRecords,
        endCaseRecords: newData.endCaseRecords,
        courtNoticeRecords: newData.courtNoticeRecords
      })
    });

    if (res.ok) {
      setData(newData);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  const totalRecords = 
    (data?.litigationRecords?.length || 0) +
    (data?.limitHighRecords?.length || 0) +
    (data?.endCaseRecords?.length || 0) +
    (data?.courtNoticeRecords?.length || 0);

  return (
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
            <p className="text-sm mt-1">点击&quot;导入Excel&quot;添加数据</p>
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
                        <TableCell className="max-w-[150px] truncate text-xs">{record.executionCourt}</TableCell>
                        <TableCell>{formatDate(record.filingDate)}</TableCell>
                        <TableCell>{formatDate(record.publishDate)}</TableCell>
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
                      <TableHead>主体名称</TableHead>
                      <TableHead className="text-right">未履行(元)</TableHead>
                      <TableHead className="text-right">执行标的(元)</TableHead>
                      <TableHead>执行法院</TableHead>
                      <TableHead>立案日期</TableHead>
                      <TableHead>终本日期</TableHead>
                      <TableHead className="w-12">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.endCaseRecords?.map((record, index) => (
                      <TableRow key={record.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{record.caseNumber}</TableCell>
                        <TableCell>{record.subjectName}</TableCell>
                        <TableCell className="text-right font-mono text-destructive">
                          {record.unpaidAmount ? `¥${Number(record.unpaidAmount).toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {record.executionAmount ? `¥${Number(record.executionAmount).toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs">{record.executionCourt}</TableCell>
                        <TableCell>{formatDate(record.filingDate)}</TableCell>
                        <TableCell>{formatDate(record.endDate)}</TableCell>
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
                      <TableHead>案号</TableHead>
                      <TableHead>案由</TableHead>
                      <TableHead>当事人</TableHead>
                      <TableHead>审理法院</TableHead>
                      <TableHead>开庭时间</TableHead>
                      <TableHead className="w-12">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.courtNoticeRecords?.map((record, index) => (
                      <TableRow key={record.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{record.caseNumber}</TableCell>
                        <TableCell>{record.caseCause}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{record.parties}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs">{record.court}</TableCell>
                        <TableCell>{formatDate(record.hearingDate)}</TableCell>
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
  );
}

export default LegalLitigationTab;
