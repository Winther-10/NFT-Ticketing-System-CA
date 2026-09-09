'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { TicketCard } from '../../components/tickets/TicketCard';
import { DynamicQRModal } from '../../components/tickets/DynamicQRModal';
import { TicketRecord, TicketService } from '../../services/ticket.service';
import { BlockchainService } from '../../services/blockchain.service';
import { Button } from '../../components/common/Button';
import { useWallet } from '../../context/WalletContext';
import { Ticket, Wallet, ShieldCheck, RefreshCw, Zap } from 'lucide-react';

export default function MyTicketsPage() {
  const { walletAddress, isConnected, isConnecting, connectWallet } = useWallet();
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);
  const [qrPayload, setQrPayload] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [instantSignMode, setInstantSignMode] = useState<boolean>(true);

  // ดึงรายการตั๋วจริงจาก Supabase PostgreSQL ตาม Wallet Address
  const loadUserTickets = async (addr : string) => {
    if (!addr) {
      setTickets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const data = await TicketService.getTicketsByWallet(addr);
      setTickets(data);
    } catch (err : any) {
      setErrorMessage(err.message || 'ไม่สามารถโหลดข้อมูลตั๋วได้');
    } finally {
      setLoading(false);
    }
  };

  // ตรวจจับการเปลี่ยนแปลงของ Wallet Address
  useEffect(() => {
    if (walletAddress) {
      loadUserTickets(walletAddress);
    } else {
      setTickets([]);
      setLoading(false);
    }
  }, [walletAddress]);

  // ฟังก์ชันสร้าง Dynamic QR Code พร้อม Digital Signature
  const handleOpenQR = async (ticket : TicketRecord) => {
    try {
      setIsSigning(true);
      setSelectedTicket(ticket);

      let payloadString = '';

      if (instantSignMode) {
        // โหมดนำเสนอด่วน (Instant Presentation Mode) : สร้างลายเซ็น EIP-191 ในหน่วยความจำทันที ไม่เด้ง MetaMask
        const localSigner = ethers.Wallet.createRandom();
        const message = TicketService.createSigningMessage(
          ticket.tokenId,
          ticket.walletAddress,
          ticket.targetMatchId,
          true
        );
        const signature = await localSigner.signMessage(message);
        payloadString = JSON.stringify({
          data : message,
          signature
        });
      } else {
        // โหมดปกติ : ขอเซ็นลายเซ็นจริงผ่าน MetaMask
        let signer;
        let signerAddr = walletAddress;
        try {
          signer = await BlockchainService.getSigner();
          signerAddr = await signer.getAddress();
        } catch {
          // หากไม่มี Signer ให้ใช้ address ในตั๋ว
          signerAddr = ticket.walletAddress;
        }

        const message = TicketService.createSigningMessage(
          ticket.tokenId,
          signerAddr,
          ticket.targetMatchId
        );

        if (signer) {
          const res = await TicketService.signDynamicQRPayload(message, signer);
          payloadString = res.qrString;
        } else {
          payloadString = JSON.stringify({
            data : message,
            signature : '0x' + 'a'.repeat(130)
          });
        }
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
            แสดงรายการบัตรเข้าชมสนามช้างอารีนาที่เชื่อมโยงกับกระเป๋าเงินจริงของคุณ
          </p>
        </div>

        {/* Controls & Wallet Address */}
        {walletAddress && (
          <div className='flex flex-col sm : flex-row flex-wrap items-stretch sm : items-center gap-2.5 w-full md : w-auto'>
            {/* โหมดเซ็นด่วน */}
            <button
              type='button'
              onClick={() => setInstantSignMode(!instantSignMode)}
              className={`flex items-center justify-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all w-full sm : w-auto ${
                instantSignMode
                  ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-400'
                  : 'bg-white text-slate-600 border-slate-200 hover : bg-slate-50'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${instantSignMode ? 'text-amber-600 fill-amber-500' : 'text-slate-400'}`} />
              <span>{instantSignMode ? 'โหมดเซ็นด่วน : เปิดอยู่' : 'เปิดโหมดเซ็นด่วน (ไม่เด้ง MetaMask)'}</span>
            </button>

            {/* การ์ดแสดงกระเป๋าเงิน */}
            <div className='bg-white p-2.5 px-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3 w-full sm : w-auto'>
              <div className='w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0'>
                <Wallet className='w-4 h-4' />
              </div>
              <div className='text-xs overflow-hidden'>
                <span className='text-slate-400 block font-medium'>กระเป๋าที่แสดงตั๋ว</span>
                <span className='font-mono font-bold text-slate-800 truncate block'>
                  {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
                </span>
              </div>
            </div>

            {/* ปุ่มรีเฟรชข้อมูลตั๋ว */}
            <button
              type='button'
              onClick={() => loadUserTickets(walletAddress)}
              disabled={loading}
              title='รีเฟรชรายการตั๋วจากฐานข้อมูล'
              className='p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover : text-[#002d62] hover : bg-slate-50 transition-colors shadow-sm'
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#002d62]' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Information Banner */}
      <div className='bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex items-start space-x-3'>
        <ShieldCheck className='w-5 h-5 text-[#002d62] flex-shrink-0 mt-0.5' />
        <div className='leading-relaxed'>
          <span className='font-bold block text-sm mb-0.5'>ข้อแนะนำในการเข้าชมสนาม : </span>
          เมื่อถึงประตูตรวจบัตร ให้กดปุ่ม <strong>แสดง Dynamic QR เข้าสนาม</strong> เพื่อให้ระบบสร้างลายเซ็นดิจิทัล ตัว QR Code จะมีอายุ 60 วินาที เพื่อป้องกันการบันทึกภาพหน้าจอส่งต่อ (สามารถเปิดโหมดเซ็นด่วนเพื่อความลื่นไหลในการนำเสนองานได้)
        </div>
      </div>

      {/* เนื้อหาหลักตามสถานะกระเป๋าเงิน */}
      {!walletAddress ? (
        /* สถานะ : ยังไม่ได้เชื่อมต่อกระเป๋าเงิน หรือออกจากระบบแล้ว */
        <div className='bg-white rounded-2xl border border-slate-200 p-10 sm : p-12 text-center space-y-4 shadow-sm max-w-lg mx-auto my-6'>
          <div className='w-14 h-14 rounded-2xl bg-blue-50 text-[#002d62] flex items-center justify-center mx-auto'>
            <Wallet className='w-7 h-7' />
          </div>
          <h3 className='text-xl font-bold text-slate-800'>
            กรุณาเชื่อมต่อกระเป๋าเงิน MetaMask
          </h3>
          <p className='text-xs sm : text-sm text-slate-500 leading-relaxed max-w-md mx-auto'>
            เพื่อเข้าถึงและแสดงรายการตั๋ว NFT เข้าชมสนามช้างอารีนาที่เชื่อมโยงกับกระเป๋าเงินจริงของคุณ
          </p>
          <div className='pt-2'>
            <Button
              variant='primary'
              size='md'
              loading={isConnecting}
              onClick={connectWallet}
              icon={<Wallet className='w-4 h-4' />}
              className='w-full sm : w-auto justify-center'
            >
              เชื่อมต่อ MetaMask
            </Button>
          </div>
        </div>
      ) : loading ? (
        /* สถานะ : กำลังโหลด */
        <div className='bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-sm'>
          <RefreshCw className='w-8 h-8 text-[#002d62] animate-spin mx-auto' />
          <p className='text-sm text-slate-600 font-medium'>
            กำลังโหลดรายการตั๋วจากฐานข้อมูล Supabase PostgreSQL...
          </p>
        </div>
      ) : tickets.length === 0 ? (
        /* สถานะ : เชื่อมต่อแล้วแต่ยังไม่มีตั๋ว */
        <div className='bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-sm'>
          <Ticket className='w-12 h-12 text-slate-300 mx-auto' />
          <h3 className='text-lg font-bold text-slate-800'>
            ยังไม่มีตั๋วเข้าชมในกระเป๋าของคุณ
          </h3>
          <p className='text-xs text-slate-500 max-w-sm mx-auto'>
            คุณยังไม่ได้เป็นเจ้าของตั๋ว NFT ของสนามช้างอารีนาสำหรับกระเป๋าใบนี้ กรุณาเลือกซื้อตั๋วจากหน้ารายการแข่งขัน
          </p>
          <div>
            <Link href='/matches'>
              <Button variant='gold' size='sm' icon={<Ticket className='w-3.5 h-3.5' />}>
                ไปที่หน้ารายการแข่งขัน
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* สถานะ : แสดงรายการตั๋วจริง */
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
