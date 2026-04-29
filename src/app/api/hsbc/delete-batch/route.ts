import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.COZE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.COZE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchDate = searchParams.get('batchDate');
    
    if (!batchDate) {
      return NextResponse.json({ error: '批次日期不能为空' }, { status: 400 });
    }
    
    const client = getSupabaseClient();
    
    // 获取批次ID
    const { data: batchData } = await client
      .from('hsbc_loan_batches')
      .select('id')
      .eq('batch_date', batchDate)
      .single();
    
    if (!batchData) {
      return NextResponse.json({ error: '批次不存在' }, { status: 404 });
    }
    
    // 删除贷款记录
    await client
      .from('hsbc_loans')
      .delete()
      .eq('batch_id', batchData.id);
    
    // 删除批次记录
    await client
      .from('hsbc_loan_batches')
      .delete()
      .eq('id', batchData.id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除批次失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
