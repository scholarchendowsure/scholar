import { NextRequest, NextResponse } from 'next/server';
import { caseStorage } from '@/storage/database/case-storage';
import { addSecurityHeaders } from '@/lib/security';
import { Case } from '@/types/case';

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

    // 数据验证
    const validatedCases: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const errors: string[] = [];

    cases.forEach((data: any, index: number) => {
      const rowNumber = index + 2; // Excel行号从2开始

      // 必填字段验证
      if (!data.batchNo) {
        errors.push(`第${rowNumber}行：批次号不能为空`);
        return;
      }
      if (!data.loanNo) {
        errors.push(`第${rowNumber}行：贷款单号不能为空`);
        return;
      }
      if (!data.userId) {
        errors.push(`第${rowNumber}行：用户ID不能为空`);
        return;
      }
      if (!data.borrowerName) {
        errors.push(`第${rowNumber}行：借款人姓名不能为空`);
        return;
      }
      if (!data.status) {
        errors.push(`第${rowNumber}行：状态不能为空`);
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
          return val.toLowerCase() === 'true' || val === '1' || val === '是';
        }
        return false;
      };

      validatedCases.push({
        // 案件基础标识
        batchNo: String(data.batchNo || ''),
        loanNo: String(data.loanNo || ''),
        userId: String(data.userId || ''),
        borrowerName: String(data.borrowerName || ''),
        productName: String(data.productName || ''),
        platform: String(data.platform || ''),
        paymentCompany: String(data.paymentCompany || ''),
        funder: String(data.funder || ''),
        fundCategory: String(data.fundCategory || ''),

        // 案件核心状态
        status: String(data.status || ''),
        loanStatus: String(data.loanStatus || ''),
        isLocked: parseBoolean(data.isLocked),
        fiveLevelClassification: String(data.fiveLevelClassification || ''),
        riskLevel: String(data.riskLevel || ''),
        isExtended: parseBoolean(data.isExtended),

        // 贷款核心金额
        currency: String(data.currency || 'CNY'),
        loanAmount: parseNumber(data.loanAmount),
        totalLoanAmount: parseNumber(data.totalLoanAmount),
        totalOutstandingBalance: parseNumber(data.totalOutstandingBalance),
        totalRepaidAmount: parseNumber(data.totalRepaidAmount),
        outstandingBalance: parseNumber(data.outstandingBalance),
        overdueAmount: parseNumber(data.overdueAmount),
        overduePrincipal: parseNumber(data.overduePrincipal),
        overdueInterest: parseNumber(data.overdueInterest),
        repaidAmount: parseNumber(data.repaidAmount),
        repaidPrincipal: parseNumber(data.repaidPrincipal),
        repaidInterest: parseNumber(data.repaidInterest),
        compensationAmount: parseNumber(data.compensationAmount),

        // 贷款期限时间
        loanTerm: parseNumber(data.loanTerm),
        loanTermUnit: String(data.loanTermUnit || '月'),
        loanDate: String(data.loanDate || ''),
        dueDate: String(data.dueDate || ''),
        overdueDays: parseNumber(data.overdueDays),
        overdueStartTime: String(data.overdueStartTime || ''),
        firstOverdueTime: String(data.firstOverdueTime || ''),
        compensationDate: String(data.compensationDate || ''),

        // 借款人主体信息
        companyName: String(data.companyName || ''),
        companyAddress: String(data.companyAddress || ''),
        homeAddress: String(data.homeAddress || ''),
        householdAddress: String(data.householdAddress || ''),
        borrowerPhone: String(data.borrowerPhone || ''),
        registeredPhone: String(data.registeredPhone || ''),
        contactInfo: String(data.contactInfo || ''),

        // 案件责任归属
        assignedSales: String(data.assignedSales || ''),
        assignedRiskControl: String(data.assignedRiskControl || ''),
        assignedPostLoan: String(data.assignedPostLoan || ''),

        // 系统元数据
        assigneeName: String(data.assignedPostLoan || ''),
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
