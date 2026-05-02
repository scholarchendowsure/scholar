/**
 * 飞书消息通知服务
 * 用于贷后案件管理系统的智能催收提醒
 */
export class FeishuService {
  private appId: string;
  private appSecret: string;
  private tokenCache: string | null = null;
  private tokenExpireTime: number = 0;

  constructor(appId?: string, appSecret?: string) {
    this.appId = appId || process.env.FEISHU_APP_ID || 'cli_a9652497d7389bd6';
    this.appSecret = appSecret || process.env.FEISHU_APP_SECRET || 'YHs5IxuDt5xXy4NT5dx0NgIVoC0aE2dO';
  }

  /**
   * 获取租户 Access Token（带缓存）
   */
  async getTenantAccessToken(): Promise<string> {
    const now = Date.now();
    
    // 如果 token 还在有效期内（提前 5 分钟过期）
    if (this.tokenCache && now < this.tokenExpireTime - 5 * 60 * 1000) {
      return this.tokenCache;
    }

    try {
      const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: this.appId,
          app_secret: this.appSecret
        })
      });

      const data = await response.json();
      
      if (data.code !== 0) {
        throw new Error(`获取Token失败: ${data.msg}`);
      }

      this.tokenCache = data.tenant_access_token;
      this.tokenExpireTime = now + data.expire * 1000;
      
      console.log('✅ 获取飞书Token成功');
      return this.tokenCache;
    } catch (error) {
      console.error('❌ 获取飞书Token失败:', error);
      throw error;
    }
  }

  /**
   * 发送文本消息
   * @param {string} receiveId - 接收人 open_id
   * @param {string} text - 消息内容
   */
  async sendTextMessage(receiveId: string, text: string): Promise<any> {
    const accessToken = await this.getTenantAccessToken();
    console.log(`📤 发送文本消息给 ${receiveId}`);

    const response = await fetch(
      `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receive_id: receiveId,
          msg_type: 'text',
          content: JSON.stringify({ text })
        })
      }
    );

    const result = await response.json();
    console.log('📊 飞书消息API响应:', JSON.stringify(result, null, 2));
    
    if (result.code !== 0) {
      throw new Error(`发送消息失败: code=${result.code}, msg=${result.msg}`);
    }

    console.log('✅ 消息发送成功，消息ID:', result.data.message_id);
    return result.data;
  }

  /**
   * 发送富文本消息（逾期提醒专用）
   */
  async sendOverdueReminder(receiveId: string, caseData: any): Promise<any> {
    const accessToken = await this.getTenantAccessToken();

    const content = {
      post: {
        zh_cn: {
          title: `🔴 逾期催收提醒 - ${caseData.customerName || '未知客户'}`,
          content: [
            [
              { tag: 'text', text: '📋 客户信息\n', style: ['bold'] },
              { tag: 'text', text: `客户名称：${caseData.customerName || '未知'}\n` },
              { tag: 'text', text: `联系电话：${caseData.customerPhone || '未知'}\n` }
            ],
            [
              { tag: 'text', text: '💰 逾期信息\n', style: ['bold'] },
              { tag: 'text', text: `逾期金额：¥${(caseData.overdueAmount || 0).toLocaleString()}\n` },
              { tag: 'text', text: `逾期天数：${caseData.overdueDays || 0}天\n` },
              { tag: 'text', text: `应还日期：${caseData.dueDate || '未知'}\n` }
            ],
            [
              { tag: 'text', text: '📝 历史跟进：', style: ['bold'] },
              { tag: 'text', text: `${caseData.followupCount || 0}次\n` }
            ],
            [
              { tag: 'a', text: '👉 点击查看案件详情', href: `${process.env.SYSTEM_URL || 'https://demo.dev.coze.site'}/case/${caseData.id}` }
            ],
            [
              { tag: 'text', text: '\n💡 请尽快联系客户确认还款情况，做好跟进记录。' }
            ]
          ]
        }
      }
    };

    const response = await fetch(
      `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receive_id: receiveId,
          msg_type: 'post',
          content: JSON.stringify(content)
        })
      }
    );

    const result = await response.json();
    
    if (result.code !== 0) {
      throw new Error(`发送消息失败: ${result.msg}`);
    }

    return result.data;
  }

  /**
   * 发送还款到期提醒（橙色预警）
   */
  async sendDueReminder(receiveId: string, caseData: any): Promise<any> {
    const accessToken = await this.getTenantAccessToken();

    const content = {
      post: {
        zh_cn: {
          title: `🟠 还款到期提醒 - ${caseData.customerName || '未知客户'}`,
          content: [
            [
              { tag: 'text', text: `客户 ${caseData.customerName || '未知'} 的贷款将于 ${caseData.dueDate || '未知'} 到期\n` }
            ],
            [
              { tag: 'text', text: `应还金额：¥${(caseData.amount || 0).toLocaleString()}\n` }
            ],
            [
              { tag: 'a', text: '👉 提前联系客户做好还款准备', href: `${process.env.SYSTEM_URL || 'https://demo.dev.coze.site'}/case/${caseData.id}` }
            ]
          ]
        }
      }
    };

    const response = await fetch(
      `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receive_id: receiveId,
          msg_type: 'post',
          content: JSON.stringify(content)
        })
      }
    );

    const result = await response.json();
    
    if (result.code !== 0) {
      throw new Error(`发送消息失败: ${result.msg}`);
    }

    return result.data;
  }

  /**
   * 搜索用户（按姓名）
   */
  async searchUser(query: string): Promise<any[]> {
    const accessToken = await this.getTenantAccessToken();

    const response = await fetch(
      `https://open.feishu.cn/open-apis/contact/v3/users/search?query=${encodeURIComponent(query)}&page_size=50`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(`搜索用户失败: ${data.msg}`);
    }

    return data.data.items || [];
  }
}
