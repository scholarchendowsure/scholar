import { Case } from '@/types/case';
import { caseStorage } from '@/storage/database/case-storage';

// 飞书多维表格字段映射到案件字段
interface FeishuBitableRecord {
  // 案件基础标识
  批次号?: string;
  贷款单号?: string;
  用户ID?: string;
  借款人姓名?: string;
  产品名称?: string;
  平台?: string;
  支付公司?: string;
  资金方?: string;
  资金分类?: string;
  状态?: string;
  贷款状态?: string;
  锁定情况?: string | boolean;
  五级分类?: string;
  风险等级?: string;
  是否展期?: string | boolean;
  币种?: string;
  贷款金额?: string | number;
  总贷款金额?: string | number;
  总在贷余额?: string | number;
  已还款总额?: string | number;
  在贷余额?: string | number;
  逾期金额?: string | number;
  逾期本金?: string | number;
  逾期利息?: string | number;
  已还金额?: string | number;
  已还本金?: string | number;
  已还利息?: string | number;
  代偿总额?: string | number;
  贷款期限?: string | number;
  贷款期限单位?: string;
  贷款日期?: string;
  到期日?: string;
  逾期天数?: string | number;
  逾期开始时间?: string;
  首次逾期时间?: string;
  代偿日期?: string;
  公司名称?: string;
  公司地址?: string;
  家庭地址?: string;
  户籍地址?: string;
  借款人手机号?: string;
  注册手机号?: string;
  联系方式?: string;
  所属销售?: string;
  所属风控?: string;
  所属贷后?: string;
  
  // 跟进记录信息
  信息操作?: string;
  记录时间?: string;
  记录人?: string;
  记录内容?: string;
  
  // 文件信息
  文件信息?: string;
  
  // 其他字段
  是否记录?: string | boolean;
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
    return lower === 'true' || lower === 'yes' || lower === '是' || lower === '已锁定' || lower === '锁定';
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
  if (isNotEmpty(record.批次号)) caseData.batchNo = String(record.批次号);
  if (isNotEmpty(record.贷款单号)) caseData.loanNo = String(record.贷款单号);
  if (isNotEmpty(record.用户ID)) caseData.userId = String(record.用户ID);
  if (isNotEmpty(record.借款人姓名)) caseData.borrowerName = String(record.借款人姓名);
  if (isNotEmpty(record.产品名称)) caseData.productName = String(record.产品名称);
  if (isNotEmpty(record.平台)) caseData.platform = String(record.平台);
  if (isNotEmpty(record.支付公司)) caseData.paymentCompany = String(record.支付公司);
  if (isNotEmpty(record.资金方)) caseData.funder = String(record.资金方);
  if (isNotEmpty(record.资金分类)) caseData.fundCategory = String(record.资金分类);

  // 案件核心状态
  if (isNotEmpty(record.状态)) caseData.status = String(record.状态);
  if (isNotEmpty(record.贷款状态)) caseData.loanStatus = String(record.贷款状态);
  if (isNotEmpty(record.锁定情况)) caseData.isLocked = toBoolean(record.锁定情况);
  if (isNotEmpty(record.五级分类)) caseData.fiveLevelClassification = String(record.五级分类);
  if (isNotEmpty(record.风险等级)) caseData.riskLevel = String(record.风险等级);
  if (isNotEmpty(record.是否展期)) caseData.isExtended = toBoolean(record.是否展期);

  // 贷款核心金额
  if (isNotEmpty(record.币种)) caseData.currency = String(record.币种);
  if (isNotEmpty(record.贷款金额)) caseData.loanAmount = toNumber(record.贷款金额);
  if (isNotEmpty(record.总贷款金额)) caseData.totalLoanAmount = toNumber(record.总贷款金额);
  if (isNotEmpty(record.总在贷余额)) caseData.totalOutstandingBalance = toNumber(record.总在贷余额) || 0;
  if (isNotEmpty(record.已还款总额)) caseData.totalRepaidAmount = toNumber(record.已还款总额);
  if (isNotEmpty(record.在贷余额)) caseData.outstandingBalance = toNumber(record.在贷余额);
  if (isNotEmpty(record.逾期金额)) caseData.overdueAmount = toNumber(record.逾期金额) || 0;
  if (isNotEmpty(record.逾期本金)) caseData.overduePrincipal = toNumber(record.逾期本金);
  if (isNotEmpty(record.逾期利息)) caseData.overdueInterest = toNumber(record.逾期利息);
  if (isNotEmpty(record.已还金额)) caseData.repaidAmount = toNumber(record.已还金额);
  if (isNotEmpty(record.已还本金)) caseData.repaidPrincipal = toNumber(record.已还本金);
  if (isNotEmpty(record.已还利息)) caseData.repaidInterest = toNumber(record.已还利息);
  if (isNotEmpty(record.代偿总额)) caseData.compensationAmount = toNumber(record.代偿总额);

  // 贷款期限时间
  if (isNotEmpty(record.贷款期限)) caseData.loanTerm = toNumber(record.贷款期限);
  if (isNotEmpty(record.贷款期限单位)) caseData.loanTermUnit = String(record.贷款期限单位);
  if (isNotEmpty(record.贷款日期)) caseData.loanDate = String(record.贷款日期);
  if (isNotEmpty(record.到期日)) caseData.dueDate = String(record.到期日);
  if (isNotEmpty(record.逾期天数)) caseData.overdueDays = toNumber(record.逾期天数) || 0;
  if (isNotEmpty(record.逾期开始时间)) caseData.overdueStartTime = String(record.逾期开始时间);
  if (isNotEmpty(record.首次逾期时间)) caseData.firstOverdueTime = String(record.首次逾期时间);
  if (isNotEmpty(record.代偿日期)) caseData.compensationDate = String(record.代偿日期);

  // 借款人主体信息
  if (isNotEmpty(record.公司名称)) caseData.companyName = String(record.公司名称);
  if (isNotEmpty(record.公司地址)) caseData.companyAddress = String(record.公司地址);
  if (isNotEmpty(record.家庭地址)) caseData.homeAddress = String(record.家庭地址);
  if (isNotEmpty(record.户籍地址)) caseData.householdAddress = String(record.户籍地址);
  if (isNotEmpty(record.借款人手机号)) caseData.borrowerPhone = String(record.借款人手机号);
  if (isNotEmpty(record.注册手机号)) caseData.registeredPhone = String(record.注册手机号);
  if (isNotEmpty(record.联系方式)) caseData.contactInfo = String(record.联系方式);

  // 案件责任归属
  if (isNotEmpty(record.所属销售)) caseData.assignedSales = String(record.所属销售);
  if (isNotEmpty(record.所属风控)) caseData.assignedRiskControl = String(record.所属风控);
  if (isNotEmpty(record.所属贷后)) caseData.assignedPostLoan = String(record.所属贷后);

  return caseData;
}

// 过滤掉空值，只保留非空字段用于更新
function filterEmptyFields(data: Partial<Case>): Partial<Case> {
  const filtered: Partial<Case> = {};
  for (const [key, value] of Object.entries(data)) {
    if (isNotEmpty(value)) {
      (filtered as any)[key] = value;
    }
  }
  return filtered;
}

// 主处理函数
export async function processFeishuBitableRecord(record: FeishuBitableRecord): Promise<ProcessResult> {
  try {
    // 验证必要字段
    const loanNo = record.贷款单号;
    if (!loanNo) {
      return {
        success: false,
        action: 'skipped',
        message: '缺少贷款单号，跳过处理',
        error: '贷款单号不能为空'
      };
    }

    console.log('[飞书多维表格处理] 开始处理贷款单号:', loanNo);

    // 映射字段
    const caseData = mapFeishuToCase(record);
    
    // 检查案件是否已存在
    const existingCase = await caseStorage.getByLoanNo(loanNo);

    if (existingCase) {
      // 案件已存在，执行更新操作
      console.log('[飞书多维表格处理] 案件已存在，执行更新:', loanNo);
      
      // 过滤掉空值，只更新非空字段
      const updateData = filterEmptyFields(caseData);
      
      if (Object.keys(updateData).length === 0) {
        return {
          success: true,
          action: 'skipped',
          loanNo,
          message: '没有需要更新的字段'
        };
      }

      const updatedCase = await caseStorage.update(existingCase.id, updateData);
      
      return {
        success: true,
        action: 'updated',
        caseId: updatedCase?.id,
        loanNo,
        message: `案件更新成功，更新了 ${Object.keys(updateData).length} 个字段`
      };
    } else {
      // 案件不存在，执行创建操作
      console.log('[飞书多维表格处理] 案件不存在，执行创建:', loanNo);
      
      // 验证必要字段
      if (!caseData.userId) {
        return {
          success: false,
          action: 'skipped',
          loanNo,
          message: '缺少用户ID，无法创建案件',
          error: '用户ID不能为空'
        };
      }
      
      if (!caseData.borrowerName) {
        return {
          success: false,
          action: 'skipped',
          loanNo,
          message: '缺少借款人姓名，无法创建案件',
          error: '借款人姓名不能为空'
        };
      }
      
      if (!caseData.status) {
        caseData.status = 'pending_assign'; // 默认状态
      }

      // 设置默认值
      const fullCaseData = {
        ...caseData,
        batchNo: caseData.batchNo || '',
        loanNo: loanNo,
        userId: caseData.userId!,
        borrowerName: caseData.borrowerName!,
        status: caseData.status!,
        totalOutstandingBalance: caseData.totalOutstandingBalance || 0,
        overdueAmount: caseData.overdueAmount || 0,
        overdueDays: caseData.overdueDays || 0,
      } as Omit<Case, 'id' | 'createdAt' | 'updatedAt'>;

      const newCase = await caseStorage.create(fullCaseData);
      
      return {
        success: true,
        action: 'created',
        caseId: newCase.id,
        loanNo,
        message: '案件创建成功'
      };
    }
  } catch (error: any) {
    console.error('[飞书多维表格处理] 处理失败:', error);
    return {
      success: false,
      action: 'skipped',
      loanNo: record.贷款单号,
      message: '处理失败',
      error: error?.message || '未知错误'
    };
  }
}
