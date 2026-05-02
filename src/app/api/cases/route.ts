import { NextRequest, NextResponse } from 'next/server';
import { caseStorage } from '@/storage/database/case-storage';
import { addSecurityHeaders } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status');
    const riskLevel = searchParams.get('riskLevel');
    const search = searchParams.get('search');
    
    // 新增筛选字段
    const filterUserId = searchParams.get('filterUserId');
    const filterContactInfo = searchParams.get('filterContactInfo');
    const filterRiskLevelText = searchParams.get('filterRiskLevelText');
    const filterAssignedSales = searchParams.get('filterAssignedSales');
    const filterAssignedPostLoan = searchParams.get('filterAssignedPostLoan');
    const filterAssignedRiskControl = searchParams.get('filterAssignedRiskControl');
    const filterAddress = searchParams.get('filterAddress');
    const filterFunder = searchParams.get('filterFunder');
    const filterIsLocked = searchParams.get('filterIsLocked');
    const filterProductName = searchParams.get('filterProductName');
    const filterPlatform = searchParams.get('filterPlatform');
    const filterFundCategory = searchParams.get('filterFundCategory');
    const filterPaymentCompany = searchParams.get('filterPaymentCompany');
    const filterIsExtended = searchParams.get('filterIsExtended');
    const filterOverdueStage = searchParams.get('filterOverdueStage');
    const filterCurrency = searchParams.get('filterCurrency');
    const filterCategory = searchParams.get('filterCategory');
    const filterFollowupContent = searchParams.get('filterFollowupContent');
    const filterOverdueDaysMin = searchParams.get('filterOverdueDaysMin');
    const filterOverdueDaysMax = searchParams.get('filterOverdueDaysMax');

    let cases = await caseStorage.getAll();

    // 基础筛选
    if (status && status !== 'all') {
      cases = cases.filter(c => c.status === status);
    }
    if (riskLevel && riskLevel !== 'all') {
      cases = cases.filter(c => c.riskLevel === riskLevel);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      // 支持多用户ID搜索（空格分隔）
      const searchTerms = searchLower.trim().split(/\s+/).filter(Boolean);
      
      cases = cases.filter(c => {
        // 如果只有一个搜索词，搜索所有字段
        if (searchTerms.length === 1) {
          const singleTerm = searchTerms[0];
          return c.borrowerName.toLowerCase().includes(singleTerm) ||
                 c.loanNo.toLowerCase().includes(singleTerm) ||
                 c.userId.toLowerCase().includes(singleTerm);
        } else {
          // 多个搜索词，只匹配用户ID（任一匹配）
          return searchTerms.some(term => c.userId.toLowerCase().includes(term));
        }
      });

      // 多个搜索词时，按搜索词顺序排序
      if (searchTerms.length > 1) {
        cases = cases.sort((a, b) => {
          // 找到a和b在searchTerms中的位置
          const getPriority = (c: any) => {
            for (let i = 0; i < searchTerms.length; i++) {
              if (c.userId.toLowerCase().includes(searchTerms[i])) {
                return i;
              }
            }
            return searchTerms.length;
          };
          return getPriority(a) - getPriority(b);
        });
      }
    }
    
    // 新增筛选条件 - 全部支持部分匹配
    if (filterUserId) {
      const terms = filterUserId.trim().toLowerCase().split(/\s+/).filter(Boolean);
      cases = cases.filter(c => terms.some(term => c.userId.toLowerCase().includes(term)));
    }
    
    if (filterContactInfo) {
      const val = filterContactInfo.toLowerCase();
      cases = cases.filter(c => 
        (c.contactInfo?.toLowerCase() || '').includes(val) || 
        (c.borrowerPhone?.toLowerCase() || '').includes(val) || 
        (c.registeredPhone?.toLowerCase() || '').includes(val)
      );
    }
    
    if (filterRiskLevelText) {
      const val = filterRiskLevelText.toLowerCase();
      cases = cases.filter(c => (c.riskLevel?.toLowerCase() || '').includes(val));
    }
    
    if (filterAssignedSales) {
      const val = filterAssignedSales.toLowerCase();
      cases = cases.filter(c => (c.assignedSales?.toLowerCase() || '').includes(val));
    }
    
    if (filterAssignedPostLoan) {
      const val = filterAssignedPostLoan.toLowerCase();
      cases = cases.filter(c => (c.assignedPostLoan?.toLowerCase() || '').includes(val));
    }
    
    if (filterAssignedRiskControl) {
      const val = filterAssignedRiskControl.toLowerCase();
      cases = cases.filter(c => (c.assignedRiskControl?.toLowerCase() || '').includes(val));
    }
    
    if (filterAddress) {
      const val = filterAddress.toLowerCase();
      cases = cases.filter(c => 
        (c.companyAddress?.toLowerCase() || '').includes(val) || 
        (c.homeAddress?.toLowerCase() || '').includes(val) || 
        (c.householdAddress?.toLowerCase() || '').includes(val)
      );
    }
    
    if (filterFunder) {
      const val = filterFunder.toLowerCase();
      cases = cases.filter(c => (c.funder?.toLowerCase() || '').includes(val));
    }
    
    if (filterIsLocked) {
      const val = filterIsLocked.toLowerCase();
      cases = cases.filter(c => {
        const lockedText = c.isLocked ? '已锁定' : '未锁定';
        return lockedText.toLowerCase().includes(val) || 
               String(c.isLocked).toLowerCase().includes(val);
      });
    }
    
    if (filterProductName) {
      const val = filterProductName.toLowerCase();
      cases = cases.filter(c => (c.productName?.toLowerCase() || '').includes(val));
    }
    
    if (filterPlatform) {
      const val = filterPlatform.toLowerCase();
      cases = cases.filter(c => (c.platform?.toLowerCase() || '').includes(val));
    }
    
    if (filterFundCategory) {
      const val = filterFundCategory.toLowerCase();
      cases = cases.filter(c => (c.fundCategory?.toLowerCase() || '').includes(val));
    }
    
    if (filterPaymentCompany) {
      const val = filterPaymentCompany.toLowerCase();
      cases = cases.filter(c => (c.paymentCompany?.toLowerCase() || '').includes(val));
    }
    
    if (filterIsExtended) {
      const val = filterIsExtended.toLowerCase();
      cases = cases.filter(c => {
        const extText = c.isExtended ? '已展期' : '未展期';
        return extText.toLowerCase().includes(val) || 
               String(c.isExtended).toLowerCase().includes(val);
      });
    }
    
    if (filterOverdueStage) {
      const val = filterOverdueStage.toLowerCase();
      cases = cases.filter(c => (c.overdueStage?.toLowerCase() || '').includes(val));
    }
    
    if (filterCurrency) {
      const val = filterCurrency.toLowerCase();
      cases = cases.filter(c => (c.currency?.toLowerCase() || '').includes(val));
    }
    
    if (filterCategory) {
      const val = filterCategory.toLowerCase();
      cases = cases.filter(c => (c.category?.toLowerCase() || '').includes(val));
    }
    
    if (filterFollowupContent) {
      const val = filterFollowupContent.toLowerCase();
      cases = cases.filter(c => {
        // 检查跟进记录
        if (c.followups && Array.isArray(c.followups)) {
          return c.followups.some((f: any) => 
            ((f.followRecord || f.content)?.toLowerCase() || '').includes(val)
          );
        }
        return false;
      });
    }
    
    if (filterOverdueDaysMin) {
      const minDays = Number(filterOverdueDaysMin);
      if (!isNaN(minDays)) {
        cases = cases.filter(c => c.overdueDays >= minDays);
      }
    }
    
    if (filterOverdueDaysMax) {
      const maxDays = Number(filterOverdueDaysMax);
      if (!isNaN(maxDays)) {
        cases = cases.filter(c => c.overdueDays <= maxDays);
      }
    }

    const total = cases.length;
    const totalPages = Math.ceil(total / pageSize);
    
    // 分页
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedCases = cases.slice(start, end);

    return addSecurityHeaders(NextResponse.json({
      success: true,
      data: paginatedCases,
      total,
      totalPages,
    }));
  } catch (error) {
    console.error('Get cases error:', error);
    return addSecurityHeaders(NextResponse.json({
      success: false,
      error: '获取案件列表失败',
    }, { status: 500 }));
  }
}
