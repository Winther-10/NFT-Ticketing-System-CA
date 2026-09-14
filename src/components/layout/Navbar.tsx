'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Ticket, ScanLine, Calendar, Wallet, CheckCircle2, LogOut, Menu, X, Home, BarChart3 } from 'lucide-react';
import { Button } from '../common/Button';
import { POLYGON_AMOY_CONFIG } from '../../config/contracts';
import { useWallet } from '../../context/WalletContext';

export const Navbar : React.FC = () => {
  const pathname = usePathname();
  const { walletAddress, isConnected, isConnecting, connectWallet, disconnectWallet } = useWallet();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const navLinks = [
    { href : '/', label : 'หน้าแรก', icon : <Home className='w-4 h-4' /> },
    { href : '/matches', label : 'ผังที่นั่ง & แมตช์', icon : <Calendar className='w-4 h-4' /> },
    { href : '/my-tickets', label : 'ตั๋วของฉัน', icon : <Ticket className='w-4 h-4' /> },
    { href : '/scanner', label : 'เครื่องสแกนประตู', icon : <ScanLine className='w-4 h-4' /> },
    { href : '/admin', label : 'แดชบอร์ดสถิติ', icon : <BarChart3 className='w-4 h-4' /> }
  ];

  const formatAddress = (addr : string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <>
      <header className='sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            {/* โลโก้และชื่อระบบ */}
            <div className='flex items-center space-x-3'>
              <Link href='/' className='flex items-center space-x-2.5'>
                <div className='w-9 h-9 rounded-xl bg-[#002d62] text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0'>
                  BRU
                </div>
                <div>
                  <div className='text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight'>
                    CHANG ARENA <span className='text-[#c59b27] font-semibold text-xs sm:text-sm'>NFT TICKET</span>
                  </div>
                  <div className='text-[10px] text-slate-500 font-medium hidden xs:block'>
                    {POLYGON_AMOY_CONFIG.chainName} Verified
                  </div>
                </div>
              </Link>
            </div>

            {/* เมนูนำทางสำหรับ Desktop & Tablet */}
            <nav className='hidden md:flex items-center space-x-1'>
              {navLinks.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-100 text-[#002d62] font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* ส่วนกระเป๋าเงินและปุ่ม Hamburger สำหรับ Mobile */}
            <div className='flex items-center space-x-2 sm:space-x-3'>
              {walletAddress ? (
                <div className='flex items-center space-x-1.5 sm:space-x-2'>
                  <div className='flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-mono text-emerald-800'>
                    <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600 flex-shrink-0' />
                    <span>{formatAddress(walletAddress)}</span>
                  </div>
                  <button
                    type='button'
                    onClick={disconnectWallet}
                    title='ตัดการเชื่อมต่อกระเป๋าเงิน'
                    className='p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors'
                  >
                    <LogOut className='w-4 h-4' />
                  </button>
                </div>
              ) : (
                <Button
                  variant='primary'
                  size='sm'
                  loading={isConnecting}
                  onClick={connectWallet}
                  icon={<Wallet className='w-3.5 h-3.5' />}
                  className='text-xs sm:text-sm px-2.5 sm:px-4'
                >
                  <span className='hidden xs:inline'>เชื่อมต่อ</span> MetaMask
                </Button>
              )}

              {/* ปุ่มเปิดปิด Hamburger Menu สำหรับมือถือ */}
              <button
                type='button'
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className='md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors'
                aria-label='Toggle mobile menu'
              >
                {isMobileMenuOpen ? <X className='w-5 h-5' /> : <Menu className='w-5 h-5' />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu (เมื่อกด Hamburger) */}
        {isMobileMenuOpen && (
          <div className='md:hidden border-t border-slate-200 bg-white/98 backdrop-blur-md px-4 pt-3 pb-5 space-y-2 shadow-lg'>
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#002d62] text-white font-semibold shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar (สำหรับสมาร์ตโฟน ใช้งานสะดวกด้วยนิ้วโป้ง) */}
      <nav className='md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-2 flex justify-around items-center shadow-[0_-4px_12px_rgba(0,0,0,0.05)]'>
        {navLinks.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-[#002d62] font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-blue-50 text-[#002d62]' : ''}`}>
                {item.icon}
              </div>
              <span className='mt-0.5'>{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};
