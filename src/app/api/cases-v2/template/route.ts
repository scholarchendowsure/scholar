import { NextRequest, NextResponse } from 'next/server';
import { addSecurityHeaders } from '@/lib/security';

// 模板字段（与Excel模板一致）
const TEMPLATE_HEADERS = [
  '批次号', '贷款单号', '用户ID', '借款人姓名', '状态', '币种', '逾期天数',
  '贷款期限', '贷款期限单位', '贷款金额', '总贷款金额', '总在贷余额',
  '已还款总额', '在贷余额', '逾期金额', '逾期本金', '逾期利息',
  '已还金额', '已还本金', '已还利息', '公司名称', '公司地址', '家庭地址',
  '户籍地址', '借款人手机号', '注册手机号', '联系方式', '贷款状态',
  '锁定情况', '平台', '支付公司', '五级分类', '风险等级', '所属销售',
  '所属风控', '所属贷后', '资金方', '贷款日期', '到期日', '产品名称',
  '逾期开始时间', '首次逾期时间', '资金分类', '代偿总额', '代偿日期', '是否展期'
];

// 示例数据
const EXAMPLE_DATA = [
  {
    批次号: 'BATCH20260501001',
    贷款单号: 'LN2026050100001',
    用户ID: 'U001',
    借款人姓名: '张三',
    状态: '待外访',
    币种: 'CNY',
    逾期天数: '15',
    贷款期限: '12',
    贷款期限单位: '月',
    贷款金额: '100000.00',
    总贷款金额: '100000.00',
    总在贷余额: '85000.00',
    已还款总额: '15000.00',
    在贷余额: '85000.00',
    逾期金额: '5000.00',
    逾期本金: '4000.00',
    逾期利息: '1000.00',
    已还金额: '15000.00',
    已还本金: '12000.00',
    已还利息: '3000.00',
    公司名称: '某某有限公司',
    公司地址: '北京市朝阳区xxx路xxx号',
    家庭地址: '北京市海淀区xxx小区xxx号楼xxx室',
    户籍地址: '河北省石家庄市xxx区xxx路xxx号',
    借款人手机号: '13800138000',
    注册手机号: '13800138000',
    联系方式: '13800138000',
    贷款状态: '正常',
    锁定情况: '否',
    平台: '某某平台',
    支付公司: '某某支付',
    五级分类: '正常',
    风险等级: '低',
    所属销售: '李四',
    所属风控: '王五',
    所属贷后: '赵六',
    资金方: '某某银行',
    贷款日期: '2025-01-01',
    到期日: '2026-01-01',
    产品名称: '某某贷款产品',
    逾期开始时间: '2026-04-15',
    首次逾期时间: '2026-04-15',
    资金分类: '对公',
    代偿总额: '0.00',
    代偿日期: '',
    是否展期: '否'
  }
];

export async function GET(req: NextRequest) {
  try {
    // 生成CSV格式模板
    const csvContent = generateCSV();
    
    // 创建响应
    const response = new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="案件导入模板.csv"',
      },
    });
    
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Download template error:', error);
    const response = NextResponse.json(
      { success: false, error: '下载模板失败' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// 生成CSV内容
function generateCSV(): string {
  // 转义CSV特殊字符
  const escapeCSV = (value: string): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // 生成头部
  const headerRow = TEMPLATE_HEADERS.map(escapeCSV).join(',');
  
  // 生成示例数据
  const dataRows = EXAMPLE_DATA.map(row => {
    return TEMPLATE_HEADERS.map(header => {
      return escapeCSV(row[header as keyof typeof row] || '');
    }).join(',');
  });

  // 合并所有行
  const allRows = [headerRow, ...dataRows];
  
  // 添加BOM以支持中文在Excel中正确显示
  return '\uFEFF' + allRows.join('\n');
}
