import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function isHSBCLocked() {
  return false
}

export function checkHSBCLock(request: NextRequest) {
  if (isHSBCLocked()) {
    const method = request.method
    if (method !== 'GET') {
      return NextResponse.json(
        { error: '汇丰板块已锁定，禁止修改操作。如需修改请联系管理员。' },
        { status: 403 }
      )
    }
  }
  return null
}

export function getHSBCLockedResponse() {
  return NextResponse.json(
    { error: '汇丰板块已锁定，禁止修改操作。如需修改请联系管理员。' },
    { status: 403 }
  )
}
