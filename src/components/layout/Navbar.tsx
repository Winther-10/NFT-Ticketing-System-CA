'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Ticket, ScanLine, Calendar, Wallet, CheckCircle2 } from 'lucide-react';
import { Button } from '../common/Button';

export const Navbar : React.FC = () => {
  const pathname = usePathname();
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum
        .request({ method : 'eth_accounts' })
        .then((accounts : string[]) => {
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleConnectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert('กรุณาติดตั้งส่วนขยาย MetaMask บนเว็บเบราว์เซอร์');
      return;
    }

    try {
      setIsConnecting(true);
      const accounts = await (window as any).ethereum.request({
        method : 'eth_requestAccounts'
      });
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
      }
    } catch (err : any) {
      console.error('Wallet connection error : ', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const navLinks = [
    { href : '/', label : 'หน้าแรก', icon : <Calendar className='w-4 h-4' /> },
    { href : '/matches', label : 'ผังที่นั่ง & แมตช์', icon : <Calendar className='w-4 h-4' /> },
    { href : '/my-tickets', label : 'ตั๋วของฉัน', icon : <Ticket className='w-4 h-4' /> },
    { href : '/scanner', label : 'เครื่องสแกนประตู', icon : <ScanLine className='w-4 h-4' /> }
  ];

  const formatAddress = (addr : string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className='sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm'>
      <div className='max-w-7xl mx-auto px-4 sm : px-6 lg : px-8'>
        <div className='flex items-center justify-between h-16'>
          {/* โลโก้และชื่อระบบ */}
          <div className='flex items-center space-x-3'>
            <div className='w-9 h-9 rounded-lg bg-[#002d62] text-white flex items-center justify-center font-bold text-sm shadow-sm'>
              BRU
            </div>
            <div>
              <Link href='/' className='text-lg font-bold text-slate-900 tracking-tight'>
                CHANG ARENA <span className='text-[#c59b27] font-semibold text-sm'>NFT TICKET</span>
              </Link>
              <div className='text-[10px] text-slate-500 font-medium'>
                Polygon Amoy PoS Verified
              </div>
            </div>
          </div>

          {/* เมนูนำทาง */}
          <nav className='hidden md : flex items-center space-x-1'>
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-[#002d62] font-semibold'
                      : 'text-slate-600 hover : text-slate-900 hover : bg-slate-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* ปุ่มเชื่อมต่อกระเป๋าเงิน Web3 */}
          <div className='flex items-center space-x-3'>
            {walletAddress ? (
              <div className='flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-mono text-emerald-800'>
                <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
                <span>{formatAddress(walletAddress)}</span>
              </div>
            ) : (
              <Button
                variant='primary'
                size='sm'
                loading={isConnecting}
                onClick={handleConnectWallet}
                icon={<Wallet className='w-3.5 h-3.5' />}
              >
                เชื่อมต่อ MetaMask
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
