'use client';

import { Toaster } from 'react-hot-toast';

export default function Toast() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#1A1A1A',
          color: '#fff',
          borderRadius: '8px',
          fontSize: '14px',
        },
        success: {
          iconTheme: { primary: '#C9A96E', secondary: '#fff' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#fff' },
        },
      }}
    />
  );
}
