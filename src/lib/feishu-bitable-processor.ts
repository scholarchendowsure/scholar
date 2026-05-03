import { Case, FollowUp } from '@/types/case';
import { caseStorage } from '@/storage/database/case-storage';

// 飞书多维表格记录类型（支持中文名和英文名）
export interface FeishuBitableRecord {
  // 案件基础标识
  批次号?: string;
  batch_number?: string;
  batch_no?: string;
  贷款单号?: string;
  loan_number?: string;
  用户ID?: string;
  user_id?: string;
  借款人姓名?: string;
  borrower_name?: string;
  产品名称?: string;
  product_name?: string;
  平台?: string;
  platform?: string;
  支付公司?: string;
  payment_company?: string;
  资金方?: string;
  fund_provider?: string;
  funder?: string;
  资金分类?: string;
  fund_classification?: string;
  fund_category?: string;
  
  // 案件核心状态
  状态?: string;
  status?: string;
  贷款状态?: string;
  loan_status?: string;
  锁定情况?: string;
  lock_status?: string;
  is_locked?: string;
  五级分类?: string;
  five_level_classification?: string;
  风险等级?: string;
  risk_level?: string;
  是否展期?: string;
  is_extended?: string;
  
  // 贷款核心金额
  币种?: string;
  currency?: string;
  贷款金额?: number | string;
  loan_amount?: number | string;
  总贷款金额?: number | string;
  total_loan_amount?: number | string;
  总在贷余额?: number | string;
  total_remaining_balance?: number | string;
  total_outstanding_balance?: number | string;
  已还款总额?: number | string;
  total_repaid?: number | string;
  total_repaid_amount?: number | string;
  在贷余额?: number | string;
  remaining_balance?: number | string;
  outstanding_balance?: number | string;
  逾期金额?: number | string;
  overdue_amount?: number | string;
  逾期本金?: number | string;
  overdue_principal?: number | string;
  逾期利息?: number | string;
  overdue_interest?: number | string;
  已还金额?: number | string;
  amount_repaid?: number | string;
  repaid_amount?: number | string;
  已还本金?: number | string;
  principal_repaid?: number | string;
  repaid_principal?: number | string;
  已还利息?: number | string;
  interest_repaid?: number | string;
  repaid_interest?: number | string;
  代偿总额?: number | string;
  total_compensation?: number | string;
  compensation_amount?: number | string;
  
  // 贷款期限时间
  贷款期限?: number | string;
  loan_term?: number | string;
  贷款期限单位?: string;
  loan_term_unit?: string;
  贷款日期?: string;
  loan_date?: string;
  到期日?: string;
  maturity_date?: string;
  due_date?: string;
  逾期天数?: number | string;
  overdue_days?: number | string;
  逾期开始日期?: string;
  逾期开始时间?: string;
  overdue_start_date?: string;
  overdue_start_time?: string;
  首次逾期时间?: string;
  first_overdue_date?: string;
  first_overdue_time?: string;
  代偿时间?: string;
  代偿日期?: string;
  compensation_date?: string;
  
  // 借款人主体信息
  公司名称?: string;
  company_name?: string;
  公司地址?: string;
  company_address?: string;
  家庭住址?: string;
  家庭地址?: string;
  home_address?: string;
  户籍地址?: string;
  household_registration_address?: string;
  registered_address?: string;
  household_address?: string;
  借款人手机号?: string;
  borrower_phone?: string;
  注册手机号?: string;
  registered_phone?: string;
  联系方式?: string;
  contact_info?: string;
  contact?: string;
  
  // 案件归属
  所属销售?: string;
  sales_affiliation?: string;
  assigned_sales?: string;
  所属风控?: string;
  risk_control?: string;
  assigned_risk_control?: string;
  assigned_risk?: string;
  所属贷后?: string;
  post_loan_management?: string;
  assigned_post_loan?: string;
  
  // 跟进记录信息
  信息操作?: string;
  information_operation?: string;
  info_action?: string;
  记录时间?: string;
  record_date?: string;
  record_time?: string;
  记录人?: string;
  recorder?: string;
  记录内容?: string;
  record_content?: string;
  
  // 文件信息
  文件信息?: string;
  file_info?: string;
  
  // 其他字段
  是否记录?: string | boolean;
  is_recorded?: string | boolean;
  [key: string]: any;
}

// 处理结果
export interface ProcessResult {
  success: boolean;
  action: 'created' | 'updated' | 'skipped';
  caseId?: string;
  loanNo?: string;
  message: string;
  error?: string;
}

// 工具函数：获取字段值（支持中文和英文下划线两种格式）
function getFieldValue(record: any, chineseName: string, ...englishNames: string[]): any {
  // 先尝试中文名
  if (record[chineseName] !== undefined && record[chineseName] !== null && record[chineseName] !== '') {
    return record[chineseName];
  }
  // 再尝试英文名（支持多个别名）
  for (const englishName of englishNames) {
    if (englishName && record[englishName] !== undefined && record[englishName] !== null && record[englishName] !== '') {
      return record[englishName];
    }
  }
  return undefined;
}

// 工具函数：转换为数字
function toNumber(value: any): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}

// 工具函数：转换为布尔值
function toBoolean(value: any): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower === 'true' || lower === 'yes' || lower === '是' || lower === '已锁定' || lower === '锁定' || lower === '已展期' || lower === '展期';
  }
  return undefined;
}

// 工具函数：非空值检查
function isNotEmpty(value: any): boolean {
  return value !== undefined && value !== null && value !== '';
}

// 飞书多维表格记录转换为案件数据
function mapFeishuToCase(record: FeishuBitableRecord): Partial<Case> {
  const caseData: Partial<Case> = {};

  // 案件基础标识
  const batchNo = getFieldValue(record, '批次号', 'batch_number', 'batch_no');
  const loanNo = getFieldValue(record, '贷款单号', 'loan_number');
  const userId = getFieldValue(record, '用户ID', 'user_id');
  const borrowerName = getFieldValue(record, '借款人姓名', 'borrower_name');
  const productName = getFieldValue(record, '产品名称', 'product_name');
  const platform = getFieldValue(record, '平台', 'platform');
  const paymentCompany = getFieldValue(record, '支付公司', 'payment_company');
  const funder = getFieldValue(record, '资金方', 'fund_provider', 'funder');
  const fundCategory = getFieldValue(record, '资金分类', 'fund_classification', 'fund_category');

  if (isNotEmpty(batchNo)) caseData.batchNo = String(batchNo);
  if (isNotEmpty(loanNo)) caseData.loanNo = String(loanNo);
  if (isNotEmpty(userId)) caseData.userId = String(userId);
  if (isNotEmpty(borrowerName)) caseData.borrowerName = String(borrowerName);
  if (isNotEmpty(productName)) caseData.productName = String(productName);
  if (isNotEmpty(platform)) caseData.platform = String(platform);
  if (isNotEmpty(paymentCompany)) caseData.paymentCompany = String(paymentCompany);
  if (isNotEmpty(funder)) caseData.funder = String(funder);
  if (isNotEmpty(fundCategory)) caseData.fundCategory = String(fundCategory);

  // 案件核心状态
  const status = getFieldValue(record, '状态', 'status');
  const loanStatus = getFieldValue(record, '贷款状态', 'loan_status');
  const isLocked = getFieldValue(record, '锁定情况', 'lock_status', 'is_locked');
  const fiveLevelClassification = getFieldValue(record, '五级分类', 'five_level_classification');
  const riskLevel = getFieldValue(record, '风险等级', 'risk_level');
  const isExtended = getFieldValue(record, '是否展期', 'is_extended');

  if (isNotEmpty(status)) caseData.status = String(status);
  if (isNotEmpty(loanStatus)) caseData.loanStatus = String(loanStatus);
  if (isNotEmpty(isLocked)) caseData.isLocked = toBoolean(isLocked);
  if (isNotEmpty(fiveLevelClassification)) caseData.fiveLevelClassification = String(fiveLevelClassification);
  if (isNotEmpty(riskLevel)) caseData.riskLevel = String(riskLevel);
  if (isNotEmpty(isExtended)) caseData.isExtended = toBoolean(isExtended);

  // 贷款核心金额
  const currency = getFieldValue(record, '币种', 'currency');
  const loanAmount = getFieldValue(record, '贷款金额', 'loan_amount');
  const totalLoanAmount = getFieldValue(record, '总贷款金额', 'total_loan_amount');
  const totalOutstandingBalance = getFieldValue(record, '总在贷余额', 'total_remaining_balance', 'total_outstanding_balance');
  const totalRepaidAmount = getFieldValue(record, '已还款总额', 'total_repaid', 'total_repaid_amount');
  const outstandingBalance = getFieldValue(record, '在贷余额', 'remaining_balance', 'outstanding_balance');
  const overdueAmount = getFieldValue(record, '逾期金额', 'overdue_amount');
  const overduePrincipal = getFieldValue(record, '逾期本金', 'overdue_principal');
  const overdueInterest = getFieldValue(record, '逾期利息', 'overdue_interest');
  const repaidAmount = getFieldValue(record, '已还金额', 'amount_repaid', 'repaid_amount');
  const repaidPrincipal = getFieldValue(record, '已还本金', 'principal_repaid', 'repaid_principal');
  const repaidInterest = getFieldValue(record, '已还利息', 'interest_repaid', 'repaid_interest');
  const compensationAmount = getFieldValue(record, '代偿总额', 'total_compensation', 'compensation_amount');

  if (isNotEmpty(currency)) caseData.currency = String(currency);
  if (isNotEmpty(loanAmount)) caseData.loanAmount = toNumber(loanAmount);
  if (isNotEmpty(totalLoanAmount)) caseData.totalLoanAmount = toNumber(totalLoanAmount);
  if (isNotEmpty(totalOutstandingBalance)) caseData.totalOutstandingBalance = toNumber(totalOutstandingBalance) || 0;
  if (isNotEmpty(totalRepaidAmount)) caseData.totalRepaidAmount = toNumber(totalRepaidAmount);
  if (isNotEmpty(outstandingBalance)) caseData.outstandingBalance = toNumber(outstandingBalance);
  if (isNotEmpty(overdueAmount)) caseData.overdueAmount = toNumber(overdueAmount) || 0;
  if (isNotEmpty(overduePrincipal)) caseData.overduePrincipal = toNumber(overduePrincipal);
  if (isNotEmpty(overdueInterest)) caseData.overdueInterest = toNumber(overdueInterest);
  if (isNotEmpty(repaidAmount)) caseData.repaidAmount = toNumber(repaidAmount);
  if (isNotEmpty(repaidPrincipal)) caseData.repaidPrincipal = toNumber(repaidPrincipal);
  if (isNotEmpty(repaidInterest)) caseData.repaidInterest = toNumber(repaidInterest);
  if (isNotEmpty(compensationAmount)) caseData.compensationAmount = toNumber(compensationAmount);

  // 贷款期限时间
  const loanTerm = getFieldValue(record, '贷款期限', 'loan_term');
  const loanTermUnit = getFieldValue(record, '贷款期限单位', 'loan_term_unit');
  const loanDate = getFieldValue(record, '贷款日期', 'loan_date');
  const dueDate = getFieldValue(record, '到期日', 'maturity_date', 'due_date');
  const overdueDays = getFieldValue(record, '逾期天数', 'overdue_days');
  const overdueStartTime = getFieldValue(record, '逾期开始时间', '逾期开始日期', 'overdue_start_date', 'overdue_start_time');
  const firstOverdueTime = getFieldValue(record, '首次逾期时间', 'first_overdue_date', 'first_overdue_time');
  const compensationDate = getFieldValue(record, '代偿日期', '代偿时间', 'compensation_date');

  if (isNotEmpty(loanTerm)) caseData.loanTerm = toNumber(loanTerm);
  if (isNotEmpty(loanTermUnit)) caseData.loanTermUnit = String(loanTermUnit);
  if (isNotEmpty(loanDate)) caseData.loanDate = String(loanDate);
  if (isNotEmpty(dueDate)) caseData.dueDate = String(dueDate);
  if (isNotEmpty(overdueDays)) caseData.overdueDays = toNumber(overdueDays) || 0;
  if (isNotEmpty(overdueStartTime)) caseData.overdueStartTime = String(overdueStartTime);
  if (isNotEmpty(firstOverdueTime)) caseData.firstOverdueTime = String(firstOverdueTime);
  if (isNotEmpty(compensationDate)) caseData.compensationDate = String(compensationDate);

  // 借款人主体信息
  const companyName = getFieldValue(record, '公司名称', 'company_name');
  const companyAddress = getFieldValue(record, '公司地址', 'company_address');
  const homeAddress = getFieldValue(record, '家庭地址', '家庭住址', 'home_address');
  const householdAddress = getFieldValue(record, '户籍地址', 'household_registration_address', 'registered_address', 'household_address');
  const borrowerPhone = getFieldValue(record, '借款人手机号', 'borrower_phone');
  const registeredPhone = getFieldValue(record, '注册手机号', 'registered_phone');
  const contactInfo = getFieldValue(record, '联系方式', 'contact_info', 'contact');

  if (isNotEmpty(companyName)) caseData.companyName = String(companyName);
  if (isNotEmpty(companyAddress)) caseData.companyAddress = String(companyAddress);
  if (isNotEmpty(homeAddress)) caseData.homeAddress = String(homeAddress);
  if (isNotEmpty(householdAddress)) caseData.householdAddress = String(householdAddress);
  if (isNotEmpty(borrowerPhone)) caseData.borrowerPhone = String(borrowerPhone);
  if (isNotEmpty(registeredPhone)) caseData.registeredPhone = String(registeredPhone);
  if (isNotEmpty(contactInfo)) caseData.contactInfo = String(contactInfo);

  // 案件归属
  const assignedSales = getFieldValue(record, '所属销售', 'sales_affiliation', 'assigned_sales');
  const assignedRiskControl = getFieldValue(record, '所属风控', 'risk_control', 'assigned_risk_control', 'assigned_risk');
  const assignedPostLoan = getFieldValue(record, '所属贷后', 'post_loan_management', 'assigned_post_loan');

  if (isNotEmpty(assignedSales)) caseData.assignedSales = String(assignedSales);
  if (isNotEmpty(assignedRiskControl)) caseData.assignedRiskControl = String(assignedRiskControl);
  if (isNotEmpty(assignedPostLoan)) caseData.assignedPostLoan = String(assignedPostLoan);

  return caseData;
}

// 提取跟进记录信息
function extractFollowup(record: FeishuBitableRecord): { action?: string; time?: string; recorder?: string; content?: string } {
  const infoAction = getFieldValue(record, '信息操作', 'information_operation', 'info_action');
  const recordTime = getFieldValue(record, '记录时间', 'record_date', 'record_time');
  const recorder = getFieldValue(record, '记录人', 'recorder');
  const recordContent = getFieldValue(record, '记录内容', 'record_content');

  return {
    action: infoAction ? String(infoAction) : undefined,
    time: recordTime ? String(recordTime) : undefined,
    recorder: recorder ? String(recorder) : undefined,
    content: recordContent ? String(recordContent) : undefined,
  };
}

// 主处理函数
export async function processFeishuBitableRecord(record: FeishuBitableRecord): Promise<ProcessResult> {
  try {
    // 1. 首先获取贷款单号
    const loanNo = getFieldValue(record, '贷款单号', 'loan_number');
    
    if (!loanNo || String(loanNo).trim() === '') {
      return {
        success: false,
        action: 'skipped',
        message: '贷款单号不能为空',
        error: '贷款单号字段缺失或为空',
      };
    }

    const loanNoStr = String(loanNo).trim();

    // 2. 查找是否已存在该贷款单号的案件
    const existingCase = await caseStorage.getByLoanNo(loanNoStr);

    // 3. 映射案件数据
    const caseData = mapFeishuToCase(record);

    // 4. 提取跟进记录信息
    const followupInfo = extractFollowup(record);

    if (existingCase) {
      // 已存在案件：执行更新（只更新非空值）
      let updateCount = 0;
      const updateData: Partial<Case> = { id: existingCase.id };

      // 遍历所有字段，只更新非空值
      Object.entries(caseData).forEach(([key, value]) => {
        if (key !== 'id' && isNotEmpty(value)) {
          (updateData as any)[key] = value;
          updateCount++;
        }
      });

      // 执行更新
      if (updateCount > 0) {
        await caseStorage.update(existingCase.id, updateData);
      }

      // 如果有跟进记录信息，添加跟进记录
      if (followupInfo.content || followupInfo.action) {
        const followupRecord = [
          followupInfo.action ? `操作：${followupInfo.action}` : '',
          followupInfo.recorder ? `记录人：${followupInfo.recorder}` : '',
          followupInfo.time ? `时间：${followupInfo.time}` : '',
          followupInfo.content ? `内容：${followupInfo.content}` : '',
        ].filter(Boolean).join('\n');

        if (followupRecord) {
          const existingFollowups = existingCase.followups || [];
          const newFollowup: FollowUp = {
            id: crypto.randomUUID(),
            follower: followupInfo.recorder || '未登记人',
            followTime: followupInfo.time || new Date().toISOString(),
            followType: 'online',
            contact: 'legal_representative',
            followResult: 'normal_repayment',
            followRecord: followupRecord,
            createdAt: new Date().toISOString(),
            createdBy: followupInfo.recorder || '系统',
          };
          await caseStorage.update(existingCase.id, {
            followups: [
              ...existingFollowups,
              newFollowup,
            ],
          });
        }
      }

      return {
        success: true,
        action: 'updated',
        caseId: existingCase.id,
        loanNo: loanNoStr,
        message: updateCount > 0 
          ? `案件更新成功，更新了 ${updateCount} 个字段` 
          : '案件已存在，无需更新',
      };
    } else {
      // 不存在案件：创建新案件
      // 确保有必要的默认值
      const newCaseData = {
        // 确保所有必填字段都有值
        batchNo: caseData.batchNo || '',
        loanNo: loanNoStr,
        userId: caseData.userId || '',
        borrowerName: caseData.borrowerName || '',
        status: caseData.status || 'pending_assign',
        totalOutstandingBalance: caseData.totalOutstandingBalance || 0,
        overdueAmount: caseData.overdueAmount || 0,
        overdueDays: caseData.overdueDays || 0,
        // 可选字段
        ...caseData,
        followups: caseData.followups || [],
      };

      // 如果有跟进记录信息，添加到初始跟进记录
      if (followupInfo.content || followupInfo.action) {
        const followupRecord = [
          followupInfo.action ? `操作：${followupInfo.action}` : '',
          followupInfo.recorder ? `记录人：${followupInfo.recorder}` : '',
          followupInfo.time ? `时间：${followupInfo.time}` : '',
          followupInfo.content ? `内容：${followupInfo.content}` : '',
        ].filter(Boolean).join('\n');

        if (followupRecord) {
          const newFollowup: FollowUp = {
            id: crypto.randomUUID(),
            follower: followupInfo.recorder || '未登记人',
            followTime: followupInfo.time || new Date().toISOString(),
            followType: 'online',
            contact: 'legal_representative',
            followResult: 'normal_repayment',
            followRecord: followupRecord,
            createdAt: new Date().toISOString(),
            createdBy: followupInfo.recorder || '系统',
          };
          newCaseData.followups = [newFollowup];
        }
      }

      const newCase = await caseStorage.create(newCaseData);

      return {
        success: true,
        action: 'created',
        caseId: newCase.id,
        loanNo: loanNoStr,
        message: '案件创建成功',
      };
    }
  } catch (error) {
    console.error('处理飞书多维表格记录失败:', error);
    return {
      success: false,
      action: 'skipped',
      message: '处理失败',
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}
