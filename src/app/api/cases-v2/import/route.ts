import { NextRequest, NextResponse } from 'next/server';
import { caseStorage } from '@/storage/database/case-storage';
import { addSecurityHeaders } from '@/lib/security';
import { Case } from '@/types/case';

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cases } = body;

    if (!cases || !Array.isArray(cases)) {
      const response = NextResponse.json(
        { success: false, error: '无效的案件数据' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // 数据验证和转换
    const validatedCases: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const errors: string[] = [];

    cases.forEach((data: any, index: number) => {
      const rowNumber = index + 2; // Excel行号从2开始

      // 转换字段名（中文 -> 英文）
      const convertedData: any = {};
      Object.entries(data).forEach(([key, value]) => {
        const newKey = FIELD_MAP[key] || key;
        convertedData[newKey] = value;
      });

      // 必填字段验证
      if (!convertedData.batchNo) {
        errors.push(`第${rowNumber}行：批次号不能为空`);
        return;
      }
      if (!convertedData.loanNo) {
        errors.push(`第${rowNumber}行：贷款单号不能为空`);
        return;
      }
      if (!convertedData.userId) {
        errors.push(`第${rowNumber}行：用户ID不能为空`);
        return;
      }
      if (!convertedData.borrowerName) {
        errors.push(`第${rowNumber}行：借款人姓名不能为空`);
        return;
      }

      // 数字字段转换
      const parseNumber = (val: any): number => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          const parsed = parseFloat(val.replace(/,/g, ''));
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      };

      const parseBoolean = (val: any): boolean => {
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
          const lower = val.toLowerCase();
          return lower === 'true' || lower === '1' || lower === '是' || lower === 'yes';
        }
        return false;
      };

      // 风险等级映射（中文 -> 英文）
      const mapRiskLevel = (val: string): string => {
        const riskMap: Record<string, string> = {
          '低': 'low',
          '中': 'medium',
          '高': 'high',
          '极高': 'critical',
        };
        return riskMap[val] || val || 'low';
      };

      // 状态映射
      const mapStatus = (val: string): string => {
        const statusMap: Record<string, string> = {
          '待分配': 'pending_assign',
          '待外访': 'pending_visit',
          '跟进中': 'following',
          '已结案': 'closed',
        };
        return statusMap[val] || val || 'pending_visit';
      };

      validatedCases.push({
        // 案件基础标识
        batchNo: String(convertedData.batchNo || ''),
        loanNo: String(convertedData.loanNo || ''),
        userId: String(convertedData.userId || ''),
        borrowerName: String(convertedData.borrowerName || ''),
        productName: String(convertedData.productName || ''),
        platform: String(convertedData.platform || ''),
        paymentCompany: String(convertedData.paymentCompany || ''),
        funder: String(convertedData.funder || ''),
        fundCategory: String(convertedData.fundCategory || ''),

        // 案件核心状态
        status: mapStatus(String(convertedData.status || '')),
        loanStatus: String(convertedData.loanStatus || ''),
        isLocked: parseBoolean(convertedData.isLocked),
        fiveLevelClassification: String(convertedData.fiveLevelClassification || ''),
        riskLevel: mapRiskLevel(String(convertedData.riskLevel || '')),
        isExtended: parseBoolean(convertedData.isExtended),

        // 贷款核心金额
        currency: String(convertedData.currency || 'CNY'),
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
        compensationAmount: parseNumber(convertedData.compensationAmount),

        // 贷款期限时间
        loanTerm: parseNumber(convertedData.loanTerm),
        loanTermUnit: String(convertedData.loanTermUnit || '月'),
        loanDate: String(convertedData.loanDate || ''),
        dueDate: String(convertedData.dueDate || ''),
        overdueDays: parseNumber(convertedData.overdueDays),
        overdueStartTime: String(convertedData.overdueStartTime || ''),
        firstOverdueTime: String(convertedData.firstOverdueTime || ''),
        compensationDate: String(convertedData.compensationDate || ''),

        // 借款人主体信息
        companyName: String(convertedData.companyName || ''),
        companyAddress: String(convertedData.companyAddress || ''),
        homeAddress: String(convertedData.homeAddress || ''),
        householdAddress: String(convertedData.householdAddress || ''),
        borrowerPhone: String(convertedData.borrowerPhone || ''),
        registeredPhone: String(convertedData.registeredPhone || ''),
        contactInfo: String(convertedData.contactInfo || ''),

        // 案件责任归属
        assignedSales: String(convertedData.assignedSales || ''),
        assignedRiskControl: String(convertedData.assignedRiskControl || ''),
        assignedPostLoan: String(convertedData.assignedPostLoan || ''),

        // 系统元数据
        assigneeName: String(convertedData.assignedPostLoan || ''),
      });
    });

    if (errors.length > 0) {
      const response = NextResponse.json(
        { success: false, error: '数据验证失败', details: errors },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    const importedCases = await caseStorage.importCases(validatedCases);

    const response = NextResponse.json({
      success: true,
      data: importedCases,
      count: importedCases.length,
      message: `成功导入 ${importedCases.length} 条案件`,
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Import cases error:', error);
    const response = NextResponse.json(
      { success: false, error: '导入案件失败' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
