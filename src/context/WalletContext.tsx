'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WalletContextType {
  walletAddress : string;
  isConnected : boolean;
  isConnecting : boolean;
  connectWallet : () => Promise<string | null>;
  disconnectWallet : () => void;
}

const WalletContext = createContext<WalletContextType>({
  walletAddress : '',
  isConnected : false,
  isConnecting : false,
  connectWallet : async () => null,
  disconnectWallet : () => {}
});

export const WalletProvider : React.FC<{ children : ReactNode }> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // ตรวจสอบสถานะการเชื่อมต่อเมื่อเริ่มต้น
  useEffect(() => {
    const isExplicitlyDisconnected =
      typeof window !== 'undefined' && localStorage.getItem('wallet_disconnected') === 'true';

    if (!isExplicitlyDisconnected && typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum
        .request({ method : 'eth_accounts' })
        .then((accounts : string[]) => {
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
          } else {
            setWalletAddress('');
          }
        })
        .catch(() => setWalletAddress(''));

      // รับฟังการสลับบัญชีหรือตัดการเชื่อมต่อใน MetaMask Extension
      const handleAccountsChanged = (accounts : string[]) => {
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          localStorage.removeItem('wallet_disconnected');
        } else {
          // หากผู้ใช้กดยกเลิกการเชื่อมต่อ หรือล็อคกระเป๋าใน MetaMask
          setWalletAddress('');
          localStorage.setItem('wallet_disconnected', 'true');
        }
      };

      (window as any).ethereum.on?.('accountsChanged', handleAccountsChanged);

      return () => {
        (window as any).ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
      };
    } else {
      setWalletAddress('');
    }
  }, []);

  // ฟังก์ชันเชื่อมต่อ MetaMask
  const connectWallet = async () : Promise<string | null> => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert('กรุณาติดตั้งส่วนขยาย MetaMask บนเว็บบราวเซอร์');
      return null;
    }

    try {
      setIsConnecting(true);
      localStorage.removeItem('wallet_disconnected');

      const accounts = await (window as any).ethereum.request({
        method : 'eth_requestAccounts'
      });

      if (accounts && accounts.length > 0) {
        const selected = accounts[0];
        setWalletAddress(selected);
        return selected;
      }
      return null;
    } catch (err : any) {
      console.error('Wallet connection error : ', err);
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  // ฟังก์ชันออกจากระบบ / ตัดการเชื่อมต่อกระเป๋าเงิน
  const disconnectWallet = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wallet_disconnected', 'true');
    }
    setWalletAddress('');
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        isConnected : !!walletAddress,
        isConnecting,
        connectWallet,
        disconnectWallet
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
