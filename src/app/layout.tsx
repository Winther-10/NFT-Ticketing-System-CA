import type { Metadata } from 'next';
import { Prompt } from 'next/font/google';
import './globals.css';
import { Navbar } from '../components/layout/Navbar';
import { WalletProvider } from '../context/WalletContext';

const prompt = Prompt({
  weight : ['300', '400', '500', '600', '700'],
  subsets : ['thai', 'latin'],
  display : 'swap',
  variable : '--font-prompt'
});

export const metadata : Metadata = {
  title : 'Chang Arena NFT Ticketing System | Buriram United',
  description : 'ระบบ NFT ตั๋วเข้าชมสนามช้างอารีนา ป้องกันการทุจริตและการแคปหน้าจอด้วยบล็อกเชน Ethereum Sepolia'
};

export default function RootLayout({
  children
} : {
  children : React.ReactNode;
}) {
  return (
    <html lang='th' className={prompt.variable}>
      <body className={`${prompt.className} min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 antialiased`}>
        <WalletProvider>
          <Navbar />
          <main className='flex-1 pb-20 md : pb-0'>{children}</main>
          <footer className='border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500'>
            <div className='max-w-7xl mx-auto px-4'>
              Chang Arena NFT Ticket &copy; 2026 Buriram United Football Club. Built on Ethereum Sepolia Testnet.
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
