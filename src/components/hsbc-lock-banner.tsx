'use client'

import React from 'react'

export function HSBCLockBanner() {
  return (
    <div className="bg-amber-50 border border-amber-200 p-4 mb-6 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <h3 className="text-amber-800 font-semibold">汇丰板块已锁定</h3>
          <p className="text-amber-700 text-sm mt-1">
            此板块仅限读取查看，禁止任何修改操作。如需修改请联系管理员同意。
          </p>
        </div>
      </div>
    </div>
  )
}
