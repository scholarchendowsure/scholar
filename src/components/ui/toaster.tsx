'use client';

import { useEffect } from 'react';
import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  useEffect(() => {
    // Sonner 会在客户端自动初始化
  }, []);

  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: {
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        className: 'toast',
      }}
      richColors
      closeButton
    />
  );
}
