import { NextRequest, NextResponse } from 'next/server';
import { caseStorage } from '@/storage/database/case-storage';
import { addSecurityHeaders } from '@/lib/security';
import { Case } from '@/types/case';
import jschardet from 'jschardet';
import iconv from 'iconv-lite';

// 中文表头到英文字段的映射
const FIELD_MAP: Record<string, string> = {
  '批次号': 'batchNo',
  '贷款单号': 'loanNo',
  '用户ID': 'userId',
  '借款人姓名': 'borrowerName',
  '状态': 'status',
  '币种': 'currency',
  '逾期天数': 'overdueDays',
  '贷款期限': 'loanTerm',
  '贷款期限单位': 'loanTermUnit',
  '贷款金额': 'loanAmount',
  '总贷款金额': 'totalLoanAmount',
  '总在贷余额': 'totalOutstandingBalance',
  '已还款总额': 'totalRepaidAmount',
  '在贷余额': 'outstandingBalance',
  '逾期金额': 'overdueAmount',
  '逾期本金': 'overduePrincipal',
  '逾期利息': 'overdueInterest',
  '已还金额': 'repaidAmount',
  '已还本金': 'repaidPrincipal',
  '已还利息': 'repaidInterest',
  '公司名称': 'companyName',
  '公司地址': 'companyAddress',
  '家庭地址': 'homeAddress',
  '户籍地址': 'householdAddress',
  '借款人手机号': 'borrowerPhone',
  '注册手机号': 'registeredPhone',
  '联系方式': 'contactInfo',
  '贷款状态': 'loanStatus',
  '锁定情况': 'isLocked',
  '平台': 'platform',
  '支付公司': 'paymentCompany',
  '五级分类': 'fiveLevelClassification',
  '风险等级': 'riskLevel',
  '所属销售': 'assignedSales',
  '所属风控': 'assignedRiskControl',
  '所属贷后': 'assignedPostLoan',
  '资金方': 'funder',
  '贷款日期': 'loanDate',
  '到期日': 'dueDate',
  '产品名称': 'productName',
  '逾期开始时间': 'overdueStartTime',
  '首次逾期时间': 'firstOverdueTime',
  '资金分类': 'fundCategory',
  '代偿总额': 'compensationAmount',
  '代偿日期': 'compensationDate',
  '是否展期': 'isExtended',
};

// 宽松的日期解析
const parseDate = (val: any): string => {
  if (!val || val === '未找到' || val === '-') return '';
  return String(val);
};

// 宽松的数字解析
const parseNumber = (val: any): number => {
  if (!val || val === '未找到' || val === '-' || val === '') return 0;
  const strVal = String(val).replace(/[￥,¥]/g, '').trim();
  const num = parseFloat(strVal);
  return isNaN(num) ? 0 : num;
};

// 宽松的整数解析
const parseIntValue = (val: any): number => {
  if (!val || val === '未找到' || val === '-' || val === '') return 0;
  const strVal = String(val).replace(/[￥,¥]/g, '').trim();
  const num = parseInt(strVal);
  return isNaN(num) ? 0 : num;
};

// 解析CSV文件，支持多种编码
function parseCSVWithEncoding(contentBuffer: Buffer) {
  // 检测编码
  const detection = jschardet.detect(contentBuffer);
  let encoding = 'utf-8';
  
  if (detection.encoding) {
    const detectedEncoding = detection.encoding.toLowerCase();
    if (detectedEncoding.includes('gb') || detectedEncoding.includes('big5')) {
      encoding = 'gb18030';
    } else if (detectedEncoding.includes('utf-8') || detectedEncoding.includes('utf8')) {
      encoding = 'utf-8';
    }
  }
  
  // 解码内容
  let content: string;
  try {
    if (encoding === 'gb18030') {
      content = iconv.decode(contentBuffer, 'gb18030');
    } else {
      content = contentBuffer.toString('utf-8');
      // 如果UTF-8解码还是乱码，尝试GB18030
      if (content.includes('���') || content.includes('?')) {
        content = iconv.decode(contentBuffer, 'gb18030');
      }
    }
  } catch {
    content = contentBuffer.toString('utf-8');
  }
  
  // 移除BOM
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  
  return { headers, rows };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return addSecurityHeaders(NextResponse.json({ 
        success: false, 
        error: '请选择文件' 
      }, { status: 400 }));
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { headers, rows } = parseCSVWithEncoding(buffer);
    
    if (rows.length === 0) {
      return addSecurityHeaders(NextResponse.json({ 
        success: false, 
        error: '文件中没有数据' 
      }, { status: 400 }));
    }
    
    const successCases: string[] = [];
    const failedCases: Array<{ row: number; reason: string }> = [];
    const importedIds: string[] = [];
    
    console.log('Starting import, rows:', rows.length);
    
    for (let i = 0; i < rows.length; i++) {
      try {
        const data = rows[i];
        const rowNumber = i + 2;
        
        // 转换字段名
        const convertedData: any = {};
        Object.entries(data).forEach(([key, value]) => {
          const englishKey = FIELD_MAP[key] || key;
          convertedData[englishKey] = value;
        });
        
        // 生成案件数据
        const caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt'> = {
          batchNo: convertedData.batchNo || '',
          loanNo: convertedData.loanNo || `AUTO-${Date.now()}-${i}`,
          userId: convertedData.userId || '',
          borrowerName: convertedData.borrowerName || '未知用户',
          status: convertedData.status || '待分配',
          currency: convertedData.currency || 'CNY',
          overdueDays: parseIntValue(convertedData.overdueDays),
          loanTerm: parseIntValue(convertedData.loanTerm),
          loanTermUnit: convertedData.loanTermUnit || '月',
          loanAmount: parseNumber(convertedData.loanAmount),
          totalLoanAmount: parseNumber(convertedData.totalLoanAmount),
          totalOutstandingBalance: parseNumber(convertedData.totalOutstandingBalance),
          totalRepaidAmount: parseNumber(convertedData.totalRepaidAmount),
          outstandingBalance: parseNumber(convertedData.outstandingBalance),
          overdueAmount: parseNumber(convertedData.overdueAmount),
          overduePrincipal: parseNumber(convertedData.overduePrincipal),
          overdueInterest: parseNumber(convertedData.overdueInterest),
          repaidAmount: parseNumber(convertedData.repaidAmount),
          repaidPrincipal: parseNumber(convertedData.repaidPrincipal),
          repaidInterest: parseNumber(convertedData.repaidInterest),
          companyName: convertedData.companyName || '',
          companyAddress: convertedData.companyAddress || '',
          homeAddress: convertedData.homeAddress || '',
          householdAddress: convertedData.householdAddress || '',
          borrowerPhone: convertedData.borrowerPhone || '',
          registeredPhone: convertedData.registeredPhone || '',
          contactInfo: convertedData.contactInfo || '',
          loanStatus: convertedData.loanStatus || '',
          isLocked: convertedData.isLocked === '是' || convertedData.isLocked === 'true',
          platform: convertedData.platform || '',
          paymentCompany: convertedData.paymentCompany || '',
          fiveLevelClassification: convertedData.fiveLevelClassification || '',
          riskLevel: convertedData.riskLevel || '中',
          assignedSales: convertedData.assignedSales || '',
          assignedRiskControl: convertedData.assignedRiskControl || '',
          assignedPostLoan: convertedData.assignedPostLoan || '',
          funder: convertedData.funder || '',
          loanDate: parseDate(convertedData.loanDate),
          dueDate: parseDate(convertedData.dueDate),
          productName: convertedData.productName || '',
          overdueStartTime: parseDate(convertedData.overdueStartTime),
          firstOverdueTime: parseDate(convertedData.firstOverdueTime),
          fundCategory: convertedData.fundCategory || '',
          compensationAmount: parseNumber(convertedData.compensationAmount),
          compensationDate: parseDate(convertedData.compensationDate),
          isExtended: convertedData.isExtended === '是' || convertedData.isExtended === 'true',
          followups: [],
        };
        
        console.log('Creating case:', caseData.loanNo);
        const newCase = await caseStorage.create(caseData);
        console.log('Case created with ID:', newCase.id);
        
        importedIds.push(newCase.id);
        successCases.push(`第${rowNumber}行`);
      } catch (error) {
        console.error('Error importing row', i + 2, error);
        failedCases.push({
          row: i + 2,
          reason: error instanceof Error ? error.message : '未知错误'
        });
      }
    }
    
    console.log('Import completed. Success:', successCases.length, 'Failed:', failedCases.length);
    
    // 验证存储的数据
    const allCases = await caseStorage.getAll();
    console.log('Total cases in storage now:', allCases.length);
    
    return addSecurityHeaders(NextResponse.json({
      success: true,
      data: {
        total: rows.length,
        success: successCases.length,
        failed: failedCases.length,
        successCases,
        failedCases,
        importedIds
      }
    }));
  } catch (error) {
    console.error('Import error:', error);
    return addSecurityHeaders(NextResponse.json({ 
      success: false, 
      error: '导入失败：' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 }));
  }
}
