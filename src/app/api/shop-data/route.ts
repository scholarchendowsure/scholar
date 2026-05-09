import { NextRequest, NextResponse } from 'next/server';
import { 
  getShopDataByUserId, 
  saveShopDataByUserId, 
  getAllShopData
} from '@/storage/database/shop-data-storage';

// 获取店铺数据（按用户ID查询）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      // 获取所有店铺数据
      const allData = await getAllShopData();
      return NextResponse.json({
        success: true,
        data: allData
      });
    }
    
    // 获取特定用户ID的店铺数据
    const shopData = await getShopDataByUserId(userId);
    
    return NextResponse.json({
      success: true,
      data: shopData
    });
  } catch (error) {
    console.error('获取店铺数据失败:', error);
    return NextResponse.json(
      { success: false, message: '获取店铺数据失败', error: String(error) },
      { status: 500 }
    );
  }
}

// 保存店铺数据（按用户ID保存）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, updateTime, latestDataset } = body;
    
    if (!userId || !updateTime || !latestDataset) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数: userId, updateTime, latestDataset' },
        { status: 400 }
      );
    }
    
    // 按用户ID保存店铺数据
    const savedData = await saveShopDataByUserId(
      userId,
      updateTime,
      latestDataset
    );
    
    return NextResponse.json({
      success: true,
      message: '保存店铺数据成功',
      data: savedData
    });
  } catch (error) {
    console.error('保存店铺数据失败:', error);
    return NextResponse.json(
      { success: false, message: '保存店铺数据失败', error: String(error) },
      { status: 500 }
    );
  }
}
