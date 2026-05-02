#!/usr/bin/env node
// Coze API 测试脚本
import { CozeApiService } from './src/lib/coze-api-service';

async function testCozeApi() {
  console.log('🧪 开始测试 Coze API...');
  
  try {
    // 1. 设置配置
    const config = {
      id: 'test-config',
      apiKey: 'pat_NmsdYKYAZBz6IxJrzGqf7mxH91vqBKOp6QlJeUmrTXLcmSkt6jg4v4wjxP0bA5rF',
      botId: '7633302958972731688',
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    console.log('✅ 配置已设置');
    console.log('   API Key:', config.apiKey.substring(0, 15) + '...');
    console.log('   Bot ID:', config.botId);

    // 2. 创建服务实例
    const service = new CozeApiService(config);
    console.log('✅ CozeApiService 已创建');

    // 3. 发送测试消息
    console.log('📤 正在发送测试消息...');
    
    const userMessage = '你好！我是贷后案件管理系统，请问你能收到这条消息吗？如果你收到了，请回复我！';
    
    const response = await service.sendMessage({
      userId: 'test-user-001',
      conversationId: null,
      additionalMessages: [],
      userMessage
    });

    console.log('✅ 消息发送成功！');
    console.log('📨 回复内容：');
    console.log(response.content);
    
    if (response.conversationId) {
      console.log('💬 会话ID:', response.conversationId);
    }
    
    console.log('\n🎉 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

testCozeApi();
