import { NextRequest, NextResponse } from 'next/server';
import { 
  getShopDataByLoanCode, 
  saveShopData, 
  getAllShopData
} from '@/storage/database/shop-data-storage';

// 获取店铺数据
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const loanCode = searchParams.get('loanCode');
    
    if (!loanCode) {
      // 获取所有店铺数据
      const allData = await getAllShopData();
      return NextResponse.json({
        success: true,
        data: allData
      });
    }
    
    // 获取特定贷款单号的店铺数据（不绑定用户，所有用户都能看到）
    const shopData = await getShopDataByLoanCode(loanCode);
    
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

// 保存店铺数据
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanCode, updateTime, latestDataset } = body;
    
    if (!loanCode || !updateTime || !latestDataset) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数: loanCode, updateTime, latestDataset' },
        { status: 400 }
      );
    }
    
    // 不绑定用户，所有用户共享店铺数据
    const savedData = await saveShopData(
      loanCode,
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
