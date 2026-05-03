// 多维案件更新Webhook记录类型
export interface BitableCaseUpdateRecord {
  id: string;
  receivedAt: string;
  payload: any;
  processResult?: {
    success: boolean;
    action?: 'created' | 'updated' | 'skipped';
    caseId?: string;
    loanNo?: string;
    message?: string;
    error?: string;
  };
}
