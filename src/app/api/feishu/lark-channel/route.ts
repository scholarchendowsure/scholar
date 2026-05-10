/**
 * 飞书长连接客户端
 * 使用飞书 SDK 创建长连接，接收卡片回调事件
 */
import { createLarkChannel } from '@larksuiteoapi/node-sdk';
import { NextResponse } from 'next/server';

// 存储连接状态
let channelInstance: any = null;
let connectionStatus = 'disconnected';

export async function GET() {
  try {
    // 从环境变量获取飞书凭证
    const appId = process.env.FEISHU_APP_ID || '';
    const appSecret = process.env.FEISHU_APP_SECRET || '';
    
    if (!appId || !appSecret) {
      return NextResponse.json({
        success: false,
        message: '飞书应用凭证未配置 (FEISHU_APP_ID, FEISHU_APP_SECRET)',
        status: connectionStatus
      });
    }

    // 如果已有连接，直接返回状态
    if (channelInstance && connectionStatus === 'connected') {
      return NextResponse.json({
        success: true,
        message: '飞书长连接已建立',
        status: connectionStatus
      });
    }

    // 创建新的长连接客户端
    const channel = createLarkChannel({
      appId,
      appSecret
    });

    // 注册卡片回调事件处理器
    channel.on('card.action.trigger' as any, async (data: any) => {
      console.log('[飞书SDK卡片回调]', JSON.stringify(data, null, 2));
      
      try {
        // 提取表单数据
        const actionValue = data?.action?.value || {};
        const formValue = data?.action?.form_value || {};
        const openMessageId = data?.open_message_id || data?.message?.open_message_id;
        
        console.log('[卡片回调] actionValue:', actionValue);
        console.log('[卡片回调] formValue:', formValue);
        console.log('[卡片回调] openMessageId:', openMessageId);
        
        // 返回成功响应
        return {
          code: 0,
          msg: 'success'
        };
      } catch (error: any) {
        console.error('[卡片回调错误]', error);
        return {
          code: 1,
          msg: 'error: ' + (error?.message || String(error))
        };
      }
    });

    // 连接状态变化处理
    channel.on('connected' as any, () => {
      console.log('[飞书SDK] 长连接已建立');
      connectionStatus = 'connected';
    });

    channel.on('disconnected' as any, () => {
      console.log('[飞书SDK] 长连接已断开');
      connectionStatus = 'disconnected';
      channelInstance = null;
    });

    channel.on('reconnecting' as any, () => {
      console.log('[飞书SDK] 正在重连...');
      connectionStatus = 'reconnecting';
    });

    channel.on('reconnected' as any, () => {
      console.log('[飞书SDK] 重连成功');
      connectionStatus = 'connected';
    });

    // 启动长连接
    await channel.connect();
    
    // 保存实例
    channelInstance = channel;
    connectionStatus = 'connected';
    
    console.log('[飞书SDK] 长连接启动成功');
    
    return NextResponse.json({
      success: true,
      message: '飞书长连接已成功建立',
      status: connectionStatus
    });
  } catch (error: any) {
    console.error('[飞书SDK连接失败]', error);
    connectionStatus = 'error';
    
    return NextResponse.json({
      success: false,
      message: `连接失败: ${error?.message || String(error)}`,
      status: connectionStatus,
      error: error?.stack
    });
  }
}

export async function DELETE() {
  try {
    if (channelInstance) {
      await channelInstance.disconnect();
      channelInstance = null;
      connectionStatus = 'disconnected';
      console.log('[飞书SDK] 长连接已断开');
    }
    
    return NextResponse.json({
      success: true,
      message: '飞书长连接已断开',
      status: connectionStatus
    });
  } catch (error: any) {
    console.error('[飞书SDK断开连接失败]', error);
    
    return NextResponse.json({
      success: false,
      message: `断开连接失败: ${error?.message || String(error)}`,
      status: connectionStatus
    });
  }
}

// 导出状态查询接口
export async function HEAD() {
  return new NextResponse(null, {
    status: connectionStatus === 'connected' ? 200 : 503,
    headers: {
      'X-Lark-Connection-Status': connectionStatus
    }
  });
}
