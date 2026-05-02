export interface FeishuBitableConfig {
  id: string;
  appId: string;
  appToken: string;
  tableId: string;
  syncEnabled: boolean;
  syncDirection: 'bidirectional' | 'to-coze' | 'to-feishu';
  fieldMapping: Record<string, string>; // 字段映射：{ cozeField: feishuField }
  lastSyncTime?: Date | string;
  syncCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface BitableSyncRecord {
  id: string;
  configId: string;
  caseId?: string;
  feishuRecordId?: string;
  direction: 'to-coze' | 'to-feishu';
  status: 'pending' | 'syncing' | 'success' | 'failed';
  errorMessage?: string;
  syncTime: Date | string;
}

export interface BitableFieldMappingOption {
  cozeField: string;
  cozeLabel: string;
  feishuField?: string;
  feishuLabel?: string;
}

export const DEFAULT_BITABLE_FIELDS: BitableFieldMappingOption[] = [
  { cozeField: 'loanNo', cozeLabel: '贷款单号' },
  { cozeField: 'userId', cozeLabel: '用户ID' },
  { cozeField: 'borrowerName', cozeLabel: '借款人姓名' },
  { cozeField: 'borrowerPhone', cozeLabel: '借款人手机号' },
  { cozeField: 'currency', cozeLabel: '币种' },
  { cozeField: 'loanAmount', cozeLabel: '贷款金额' },
  { cozeField: 'outstandingAmount', cozeLabel: '在贷余额' },
  { cozeField: 'overdueAmount', cozeLabel: '逾期金额' },
  { cozeField: 'overdueDays', cozeLabel: '逾期天数' },
  { cozeField: 'fundProvider', cozeLabel: '资金方' },
  { cozeField: 'paymentCompany', cozeLabel: '支付公司' },
  { cozeField: 'productName', cozeLabel: '产品名称' },
  { cozeField: 'salesName', cozeLabel: '所属销售' },
  { cozeField: 'afterLoanName', cozeLabel: '所属贷后' },
  { cozeField: 'riskLevel', cozeLabel: '风险等级' },
  { cozeField: 'status', cozeLabel: '案件状态' },
  { cozeField: 'companyName', cozeLabel: '公司名称' },
  { cozeField: 'companyAddress', cozeLabel: '公司地址' },
  { cozeField: 'homeAddress', cozeLabel: '家庭地址' },
  { cozeField: 'registrationPhone', cozeLabel: '注册手机号' },
  { cozeField: 'loanDate', cozeLabel: '贷款日期' },
  { cozeField: 'maturityDate', cozeLabel: '到期日' },
  { cozeField: 'overdueStartDate', cozeLabel: '逾期开始时间' },
];
