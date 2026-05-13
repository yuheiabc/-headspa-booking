import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Toast from '@/components/ui/Toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Head Spa - 予約サイト',
  description: '至福のヘッドスパ体験。頭皮から美しく。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-[#FAFAF8]`}>
        <Toast />
        {children}
      </body>
    </html>
  );
}
