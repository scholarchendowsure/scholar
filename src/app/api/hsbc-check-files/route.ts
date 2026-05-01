import { NextRequest, NextResponse } from 'next/server';
import { getHSBCLockedResponse } from '@/lib/hsbc-lock';

export async function POST(request: NextRequest) {
  return getHSBCLockedResponse();
}

export async function GET(request: NextRequest) {
  return getHSBCLockedResponse();
}
