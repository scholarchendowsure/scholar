import { NextResponse } from 'next/server';
import { resetCache } from '@/lib/hsbc-data';

export async function POST() {
  try {
    resetCache();
    return NextResponse.json({ success: true, message: 'Cache reset successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
