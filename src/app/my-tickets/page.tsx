'use client';

import React, { useEffect, useState } from 'react';
import { TicketCard } from '../../components/tickets/TicketCard';
import { DynamicQRModal } from '../../components/tickets/DynamicQRModal';
import { TicketRecord, TicketService } from '../../services/ticket.service';
import { BlockchainService } from '../../services/blockchain.service';
import { Button } from '../../components/common/Button';
import { Ticket, Wallet, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

export default function MyTicketsPage() {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);
  const [qrPayload, setQrPayload] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const defaultDemoWallet = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';

  const loadUserTickets = async (addr : string) => {
    try {
      setLoading(true);
      const data = await TicketService.getTicketsByWallet(addr);
      setTickets(data);
    } catch (err : any) {
      setErrorMessage(err.message || 'ไม่สามารถโหลดข้อมูลตั๋วได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ตรวจสอบกระเป๋าเงินที่มีอยู่
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum
        .request({ method : 'eth_accounts' })
        .then((accounts : string[]) => {
          const activeAddr = accounts && accounts[0] ? accounts[0] : defaultDemoWallet;
          setWalletAddress(activeAddr);
          loadUserTickets(activeAddr);
        })
        .catch(() => {
          setWalletAddress(defaultDemoWallet);
          loadUserTickets(defaultDemoWallet);
        });
    } else {
      setWalletAddress(defaultDemoWallet);
      loadUserTickets(defaultDemoWallet);
    }
  }, []);

  // ฟังก์ชันสร้าง Dynamic QR Code พร้อม Digital Signature
  const handleOpenQR = async (ticket : TicketRecord) => {
    try {
      setIsSigning(true);
      setSelectedTicket(ticket);

      let signer;
      let signerAddr = walletAddress;
      try {
        signer = await BlockchainService.getSigner();
        signerAddr = await signer.getAddress();
      } catch {
        // หากไม่มี MetaMask ให้จำลอง Signature ด้วยโครงสร้างมาตรฐาน
      }

      const message = TicketService.createSigningMessage(
        ticket.tokenId,
        signerAddr,
        ticket.targetMatchId
      );

      let payloadString = '';
      if (signer) {
        const res = await TicketService.signDynamicQRPayload(message, signer);
        payloadString = res.qrString;
      } else {
        // Mock EIP-191 Payload สำหรับการทดสอบในเครื่องที่ไม่มี Extension
        payloadString = JSON.stringify({
          data : message,
          signature : '0x' + 'a'.repeat(130)
        });
      }

      setQrPayload(payloadString);
      setIsModalOpen(true);
    } catch (err : any) {
      alert(`ไม่สามารถสร้างลายเซ็นดิจิทัลได้ : ${err.message || 'โปรดยืนยันใน MetaMask'}`);
    } finally {
      setIsSigning(false);
    }
  };

  const handleRefreshQR = async () => {
    if (selectedTicket) {
      await handleOpenQR(selectedTicket);
    }
  };

  return (
    <div className='max-w-7xl mx-auto px-4 sm : px-6 lg : px-8 py-10 space-y-8'>
      {/* Header */}
      <div className='flex flex-col md : flex-row md : items-center justify-between gap-4'>
        <div>
          <div className='inline-flex items-center space-x-2 text-xs font-semibold text-[#002d62] uppercase tracking-wider mb-2'>
            <ShieldCheck className='w-4 h-4 text-emerald-600' />
            <span>Anti-Screenshot Digital Pass</span>
          </div>
          <h1 className='text-3xl font-extrabold text-slate-900'>
            ตั๋วของฉัน (My Tickets)
          </h1>
          <p className='text-sm text-slate-500 mt-1'>
            แสดงรายการบัตรเข้าชมสนามช้างอารีนาที่เชื่อมโยงกับกระเป๋าเงินของคุณ
          </p>
        </div>

        {/* กระเป๋าเงินที่เชื่อมต่อ */}
        <div className='bg-white p-3 px-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3'>
          <div className='w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#002d62]'>
            <Wallet className='w-4 h-4' />
          </div>
          <div className='text-xs'>
            <span className='text-slate-400 block font-medium'>Wallet Address</span>
            <span className='font-mono font-bold text-slate-800'>
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
          </div>
        </div>
      </div>

      {/* Information Banner */}
      <div className='bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex items-start space-x-3'>
        <ShieldCheck className='w-5 h-5 text-[#002d62] flex-shrink-0 mt-0.5' />
        <div className='leading-relaxed'>
          <span className='font-bold block text-sm mb-0.5'>ข้อแนะนำในการเข้าชมสนาม : </span>
          เมื่อถึงประตูตรวจบัตร ให้กดปุ่ม <strong>แสดง Dynamic QR เข้าสนาม</strong> เพื่อให้ระบบสร้างลายเซ็นดิจิทัลผ่าน MetaMask ตัว QR Code จะมีอายุ 30 วินาที เพื่อป้องกันการบันทึกภาพหน้าจอส่งต่อ
        </div>
      </div>

      {/* Ticket Grid */}
      {loading ? (
        <div className='p-12 text-center text-sm text-slate-500'>
          กำลังโหลดรายการตั๋วจากฐานข้อมูลและบล็อกเชน...
        </div>
      ) : tickets.length === 0 ? (
        <div className='bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-sm'>
          <Ticket className='w-12 h-12 text-slate-300 mx-auto' />
          <h3 className='text-lg font-bold text-slate-800'>
            ยังไม่มีตั๋วเข้าชมในกระเป๋าของคุณ
          </h3>
          <p className='text-xs text-slate-500 max-w-sm mx-auto'>
            คุณยังไม่ได้เป็นเจ้าของตั๋ว NFT ของสนามช้างอารีนา กรุณาเลือกซื้อตั๋วจากหน้ารายการแข่งขัน
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md : grid-cols-2 lg : grid-cols-3 gap-6'>
          {tickets.map((t) => (
            <TicketCard
              key={t.tokenId}
              ticket={t}
              onOpenQR={handleOpenQR}
              isLoading={isSigning && selectedTicket?.tokenId === t.tokenId}
            />
          ))}
        </div>
      )}

      {/* Modal แสดง Dynamic QR Code */}
      {selectedTicket && (
        <DynamicQRModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          qrPayload={qrPayload}
          tokenId={selectedTicket.tokenId}
          tierName={selectedTicket.tierName}
          seatZone={selectedTicket.seatZone}
          seatNumber={selectedTicket.seatNumber}
          onRefresh={handleRefreshQR}
        />
      )}
    </div>
  );
}
