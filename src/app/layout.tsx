import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '../components/layout/Navbar';

export const metadata : Metadata = {
  title : 'Chang Arena NFT Ticketing System | Buriram United',
  description : 'ระบบ NFT ตั๋วเข้าชมสนามช้างอารีนา ป้องกันการทุจริตและการแคปหน้าจอด้วยบล็อกเชน Polygon Amoy'
};

export default function RootLayout({
  children
} : {
  children : React.ReactNode;
}) {
  return (
    <html lang='th'>
      <body className='min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 antialiased'>
        <Navbar />
        <main className='flex-1'>{children}</main>
        <footer className='border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500'>
          <div className='max-w-7xl mx-auto px-4'>
            Chang Arena NFT Ticket &copy; 2026 Buriram United Football Club. Built on Polygon Amoy PoS.
          </div>
        </footer>
      </body>
    </html>
  );
}
