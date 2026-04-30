/**
 * 飞书 API 服务
 */

// 发送飞书 Webhook 消息
export async function sendFeishuWebhookMessage(webhookUrl: string, message: string): Promise<{ success: boolean; message?: string }> {
  try {
    console.log('📤 正在发送飞书 Webhook 消息...');
    console.log('📋 消息内容:', message);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msg_type: 'text',
        content: {
          text: message,
        },
      }),
    });

    const result = await response.json();
    console.log('📨 飞书 Webhook 响应:', result);

    if (result.code === 0) {
      return { success: true };
    } else {
      return { success: false, message: result.msg || '发送失败' };
    }
  } catch (error) {
    console.error('❌ 发送飞书 Webhook 消息失败:', error);
    return { success: false, message: error instanceof Error ? error.message : '发送失败' };
  }
}
