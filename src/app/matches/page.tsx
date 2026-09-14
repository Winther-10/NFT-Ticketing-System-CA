'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MatchInfo, MatchService, SeatTierInfo } from '../../services/match.service';
import { BlockchainService } from '../../services/blockchain.service';
import { TicketService, TicketRecord } from '../../services/ticket.service';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Ticket, Calendar, ShieldCheck, CheckCircle2, Award, ArrowRight, Zap, ExternalLink, RefreshCw, PlusCircle } from 'lucide-react';
import { POLYGON_AMOY_CONFIG } from '../../config/contracts';
import { useWallet } from '../../context/WalletContext';
import { AddMatchModal } from '../../components/matches/AddMatchModal';

export default function MatchesPage() {
  const { walletAddress, connectWallet } = useWallet();
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [seatTiers, setSeatTiers] = useState<SeatTierInfo[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>('BRU-vs-MU-2026');
  const [selectedTier, setSelectedTier] = useState<SeatTierInfo | null>(null);
  const [purchaseMode, setPurchaseMode] = useState<'FAST' | 'ONCHAIN'>('FAST');
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [mintStatus, setMintStatus] = useState<string>('');
  const [purchasedTicket, setPurchasedTicket] = useState<TicketRecord | null>(null);
  const [isAddMatchOpen, setIsAddMatchOpen] = useState<boolean>(false);

  // โหลดรายการโซนที่นั่งและคำนวณจำนวนที่นั่งคงเหลือแยกตามแมตช์
  const loadSeatTiers = async (matchId : string) => {
    try {
      const data = await MatchService.getSeatTiers(matchId);
      setSeatTiers(data);
      setSelectedTier((prev) => {
        if (!prev) return data[0] || null;
        const found = data.find((d) => d.tierId === prev.tierId);
        return found || data[0] || null;
      });
    } catch (err) {
      console.warn('Load seat tiers warning : ', err);
    }
  };

  useEffect(() => {
    MatchService.getMatches().then((data) => setMatches(data));
  }, []);

  useEffect(() => {
    if (selectedMatch) {
      loadSeatTiers(selectedMatch);
    }
  }, [selectedMatch]);

  const handlePurchaseTicket = async () => {
    if (!selectedTier) return;

    // ตรวจสอบว่าที่นั่งในโซนนี้เต็มหรือไม่ ป้องกันการขายเกิน (Anti-Overselling)
    if (selectedTier.availableSeats !== undefined && selectedTier.availableSeats <= 0) {
      setMintStatus('ขออภัย : ที่นั่งในโซนนี้ถูกจองเต็มแล้ว (Sold Out)');
      return;
    }

    try {
      setIsMinting(true);
      setPurchasedTicket(null);
      setMintStatus('กำลังเตรียมข้อมูลตั๋ว NFT...');

      // 1. ตรวจสอบและดึง Wallet Address ปัจจุบันจาก MetaMask จริง
      let address : string | null = walletAddress;
      if (!address) {
        address = await connectWallet();
        if (!address) {
          throw new Error('กรุณาเชื่อมต่อกระเป๋าเงิน MetaMask ก่อนทำรายการซื้อตั๋ว');
        }
      }

      // 2. สุ่มกำหนดเลขที่นั่งและแถว
      const seatLetter = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)];
      const seatNum = Math.floor(Math.random() * 40) + 1;
      const seatString = `${seatLetter}-${seatNum}`;

      let mintedTokenId = (Math.floor(Date.now() / 1000) % 90000) + 100;
      let txHash = '';

      // 3. ดำเนินการออกตั๋วตามโหมดที่เลือก
      if (purchaseMode === 'ONCHAIN') {
        if (typeof window === 'undefined' || !(window as any).ethereum) {
          throw new Error('กรุณาเชื่อมต่อ MetaMask เพื่อทำธุรกรรมบนบล็อกเชน Sepolia');
        }

        setMintStatus('กำลังตรวจสอบและสลับเครือข่ายไปยัง Sepolia Testnet...');
        await BlockchainService.ensureSepoliaNetwork();

        setMintStatus('กรุณายืนยัน Transaction บน MetaMask (ใช้ค่า Gas บน Sepolia ฟรี 100%)...');

        if (selectedTier.isSeasonPassEligible) {
          const res = await BlockchainService.mintSeasonPass(
            address,
            'ipfs://chang-arena-season-pass-2026',
            selectedTier.name,
            selectedTier.standLocation,
            seatString,
            2026
          );
          txHash = res.txHash;
          if (res.tokenId) mintedTokenId = res.tokenId;
        } else {
          const res = await BlockchainService.mintSingleTicket(
            address,
            'ipfs://chang-arena-match-ticket-2026',
            selectedTier.name,
            selectedTier.standLocation,
            seatString,
            selectedMatch
          );
          txHash = res.txHash;
          if (res.tokenId) mintedTokenId = res.tokenId;
        }
      }

      const newTicket : TicketRecord = {
        tokenId : mintedTokenId,
        walletAddress : address.toLowerCase(),
        ticketType : selectedTier.isSeasonPassEligible ? 'SEASON_PASS' : 'SINGLE_MATCH',
        tierName : selectedTier.name,
        seatZone : selectedTier.standLocation,
        seatNumber : seatString,
        targetMatchId : selectedTier.isSeasonPassEligible ? '' : selectedMatch,
        seasonYear : 2026,
        purchaseTxHash : txHash,
        createdAt : new Date().toISOString()
      };

      // 4. บันทึกข้อมูลจริงลง Supabase และ LocalStorage
      await TicketService.savePurchasedTicket(newTicket, selectedTier.tierId);
      setPurchasedTicket(newTicket);

      // 5. โหลดจำนวนที่นั่งคงเหลือใหม่ทันที เพื่อให้ตัวเลขที่นั่งลดลงแบบ Real-time
      await loadSeatTiers(selectedMatch);

      setMintStatus(
        purchaseMode === 'ONCHAIN'
          ? `บันทึกบน Sepolia สำเร็จ! Token ID #${mintedTokenId} บันทึกลงในกระเป๋าของคุณแล้ว`
          : `ออกตั๋วสำเร็จ! Token ID #${mintedTokenId} ที่นั่ง ${seatString} บันทึกสิทธิ์เข้ากระเป๋าของคุณแล้ว`
      );
    } catch (err : any) {
      setMintStatus(`เกิดข้อผิดพลาด : ${err.message || 'ไม่สามารถทำรายการได้'}`);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10'>
      {/* Header */}
      <div>
        <div className='inline-flex items-center space-x-2 text-xs font-semibold text-[#002d62] uppercase tracking-wider mb-2'>
          <span>Chang Arena Ticketing Hub</span>
        </div>
        <h1 className='text-3xl font-extrabold text-slate-900'>
          ผังโซนที่นั่งและระดับราคาตั๋วเข้าชม
        </h1>
        <p className='text-sm text-slate-500 mt-1'>
          อ้างอิงผังที่นั่งจริงของสนามช้างอารีนา ทั้งตั๋วรายแมตช์และตั๋วรายปี (Season Pass 2026)
        </p>
      </div>

      {/* แมตช์ Selector */}
      <div className='bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2.5'>
          <label className='block text-sm font-bold text-slate-800'>
            เลือกนัดการแข่งขัน : 
          </label>
          <Button
            type='button'
            variant='gold'
            size='sm'
            onClick={() => setIsAddMatchOpen(true)}
            icon={<PlusCircle className='w-4 h-4 text-white' />}
            className='text-xs font-semibold shadow-sm w-full sm:w-auto'
          >
            + เพิ่มแมตช์การแข่งขัน
          </Button>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          {matches.map((m) => (
            <button
              key={m.matchId}
              type='button'
              onClick={() => setSelectedMatch(m.matchId)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedMatch === m.matchId
                  ? 'border-[#002d62] bg-blue-50/50 ring-2 ring-[#002d62]'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className='text-xs font-semibold text-[#002d62] mb-1'>
                {m.competition}
              </div>
              <div className='text-sm font-bold text-slate-900'>
                {m.homeTeam} vs {m.awayTeam}
              </div>
              <div className='text-xs text-slate-500 mt-1 flex items-center space-x-1'>
                <Calendar className='w-3 h-3' />
                <span>{new Date(m.matchDatetime).toLocaleDateString('th-TH')}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ตารางโซนที่นั่งและราคา */}
      <div className='space-y-4'>
        <h3 className='text-xl font-bold text-slate-900'>
          ระดับโซนที่นั่งสนามช้างอารีนา (Seat Tiers & Pricing)
        </h3>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
          {seatTiers.map((tier) => {
            const isSelected = selectedTier?.tierId === tier.tierId;
            const isSeason = tier.isSeasonPassEligible;

            return (
              <div
                key={tier.tierId}
                onClick={() => setSelectedTier(tier)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#002d62] bg-white ring-2 ring-[#002d62] shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <Badge variant={isSeason ? 'gold' : 'default'}>
                      {isSeason ? 'SEASON PASS' : tier.standLocation}
                    </Badge>
                    <div className='text-right'>
                      <span className={`text-xs font-mono font-bold ${
                        (tier.availableSeats ?? tier.totalCapacity) <= 0
                          ? 'text-rose-600'
                          : (tier.availableSeats ?? tier.totalCapacity) < 50
                          ? 'text-amber-600'
                          : 'text-emerald-700'
                      }`}>
                        {(tier.availableSeats ?? tier.totalCapacity) <= 0
                          ? 'ที่นั่งเต็ม (SOLD OUT)'
                          : `คงเหลือ ${tier.availableSeats?.toLocaleString()} / ${tier.totalCapacity.toLocaleString()} ที่`}
                      </span>
                    </div>
                  </div>

                  {/* แถบแสดงอัตราการจองที่นั่ง */}
                  <div className='w-full bg-slate-100 rounded-full h-1.5 overflow-hidden'>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (tier.availableSeats ?? tier.totalCapacity) <= 0
                          ? 'bg-rose-500'
                          : isSeason
                          ? 'bg-amber-500'
                          : 'bg-[#002d62]'
                      }`}
                      style={{
                        width : `${Math.min(100, Math.round(((tier.soldCount || 0) / (tier.totalCapacity || 1)) * 100))}%`
                      }}
                    />
                  </div>

                  <div>
                    <h4 className='font-bold text-slate-900 text-base'>
                      {tier.name}
                    </h4>
                    <div className='mt-2 text-2xl font-extrabold text-[#002d62]'>
                      ฿{tier.basePriceThb.toLocaleString()}
                      <span className='text-xs font-normal text-slate-500 ml-1'>
                        {isSeason ? '/ ตลอดฤดูกาล' : '/ แมตช์'}
                      </span>
                    </div>
                  </div>

                  {isSeason && (
                    <div className='text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200'>
                      สิทธิ์พิเศษ : เข้าชมได้ทุกนัดในบ้าน + Fast Lane + ห้องรับรอง VIP Lounge
                    </div>
                  )}
                </div>

                <div className='pt-4 border-t border-slate-100 mt-4 flex items-center justify-between'>
                  <span className='text-xs text-slate-500'>
                    {isSelected ? 'เลือกโซนนี้อยู่' : 'คลิกเพื่อเลือก'}
                  </span>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isSelected ? 'bg-[#002d62] border-[#002d62] text-white' : 'border-slate-300'
                  }`}>
                    {isSelected && <CheckCircle2 className='w-3.5 h-3.5' />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ส่วนสรุปการจองและสั่งซื้อ */}
      {selectedTier && (
        <div className='bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6'>
          {/* ข้อมูลสรุปตั๋วที่เลือก */}
          <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6'>
            <div className='space-y-1.5'>
              <div className='text-xs text-amber-400 font-semibold tracking-wider uppercase flex items-center space-x-2'>
                <span>สรุปรายการตั๋ว NFT ที่คุณเลือก</span>
                <Badge variant={selectedTier.isSeasonPassEligible ? 'gold' : 'default'}>
                  {selectedTier.isSeasonPassEligible ? 'SEASON PASS' : selectedTier.standLocation}
                </Badge>
              </div>
              <h3 className='text-2xl font-bold'>
                {selectedTier.name} &middot; ฿{selectedTier.basePriceThb.toLocaleString()}
              </h3>
              <p className='text-xs text-slate-400'>
                แมตช์ : {selectedMatch} | สนามช้างอารีนา (Chang Arena Stadium)
              </p>
            </div>

            {/* สลับโหมดการออกตั๋ว : โหมดออกตั๋วด่วน (Fast Test ฟรี 100%) vs ออกตั๋วบนบล็อกเชน (Sepolia On-Chain) */}
            <div className='bg-slate-800/90 p-1 rounded-xl border border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center gap-1 w-full md:w-auto'>
              <button
                type='button'
                onClick={() => setPurchaseMode('FAST')}
                className={`flex items-center justify-center space-x-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
                  purchaseMode === 'FAST'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Zap className='w-3.5 h-3.5' />
                <span>ออกตั๋วด่วน (ฟรี 100% ไม่ใช้ Gas)</span>
              </button>
              <button
                type='button'
                onClick={() => setPurchaseMode('ONCHAIN')}
                className={`flex items-center justify-center space-x-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
                  purchaseMode === 'ONCHAIN'
                    ? 'bg-[#002d62] text-white font-bold shadow border border-blue-400'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ShieldCheck className='w-3.5 h-3.5' />
                <span>บล็อกเชน Sepolia Testnet</span>
              </button>
            </div>
          </div>

          {/* การ์ดแสดงผลเมื่อซื้อตั๋วสำเร็จ */}
          {purchasedTicket ? (
            <div className='bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 sm:p-6 space-y-4'>
              <div className='flex items-center space-x-2 text-emerald-400 font-bold text-sm'>
                <CheckCircle2 className='w-5 h-5 text-emerald-400 flex-shrink-0' />
                <span>{mintStatus}</span>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-800/60 rounded-xl text-xs'>
                <div>
                  <span className='text-slate-400 block mb-0.5'>Token ID</span>
                  <span className='font-mono font-bold text-white text-sm'>#{purchasedTicket.tokenId}</span>
                </div>
                <div>
                  <span className='text-slate-400 block mb-0.5'>ที่นั่ง / โซน</span>
                  <span className='font-bold text-amber-300 text-sm'>{purchasedTicket.seatNumber} ({purchasedTicket.seatZone})</span>
                </div>
                <div className='overflow-hidden'>
                  <span className='text-slate-400 block mb-0.5'>กระเป๋าผู้ถือตั๋ว</span>
                  <span className='font-mono text-slate-300 truncate block'>{purchasedTicket.walletAddress}</span>
                </div>
                <div>
                  <span className='text-slate-400 block mb-0.5'>ช่องทางบันทึก</span>
                  <span className='text-emerald-300 font-semibold'>
                    {purchasedTicket.purchaseTxHash ? 'Sepolia Smart Contract' : 'Database & Local Storage'}
                  </span>
                </div>
              </div>

              {purchasedTicket.purchaseTxHash && (
                <div className='text-xs flex flex-wrap items-center gap-2 text-slate-300'>
                  <span>Tx Hash : </span>
                  <a
                    href={`${POLYGON_AMOY_CONFIG.blockExplorerUrl}/tx/${purchasedTicket.purchaseTxHash}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-amber-400 underline font-mono flex items-center space-x-1 break-all'
                  >
                    <span>{purchasedTicket.purchaseTxHash.slice(0, 20)}...</span>
                    <ExternalLink className='w-3 h-3 flex-shrink-0' />
                  </a>
                </div>
              )}

              <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2'>
                <Link href='/my-tickets' className='w-full sm:w-auto'>
                  <Button variant='gold' size='md' icon={<ArrowRight className='w-4 h-4' />} className='w-full sm:w-auto justify-center'>
                    ไปดูตั๋วใน My Tickets ทันที
                  </Button>
                </Link>
                <Button
                  variant='dark'
                  size='md'
                  onClick={() => {
                    setPurchasedTicket(null);
                    setMintStatus('');
                  }}
                  icon={<RefreshCw className='w-4 h-4' />}
                  className='w-full sm:w-auto justify-center font-semibold'
                >
                  เลือกซื้อตั๋วเพิ่มอีกใบ
                </Button>
              </div>
            </div>
          ) : (
            <div className='flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4'>
              <div className='text-xs text-slate-400 leading-relaxed'>
                {purchaseMode === 'FAST'
                  ? '⚡ โหมดออกตั๋วด่วน (แนะนำ) : บันทึกตั๋วจริงลงฐานข้อมูล Supabase ทันที ฟรี 100% ไม่เสียเงิน และไม่ต้องใช้ค่า Gas'
                  : '🔗 โหมดบล็อกเชน Sepolia : เรียก Smart Contract บนเครือข่ายทดสอบ Sepolia (ฟรี 100% ใช้เหรียญทดสอบ Faucet เท่านั้น ไม่เสียเงินจริง)'}
              </div>

              <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto flex-shrink-0'>
                {mintStatus && (
                  <span className='text-xs text-amber-300 font-medium px-3 py-1.5 bg-white/10 rounded-lg text-center sm:text-left'>
                    {mintStatus}
                  </span>
                )}
                <Button
                  variant={
                    selectedTier && selectedTier.availableSeats !== undefined && selectedTier.availableSeats <= 0
                      ? 'secondary'
                      : 'gold'
                  }
                  size='lg'
                  disabled={
                    isMinting ||
                    (selectedTier !== null && selectedTier.availableSeats !== undefined && selectedTier.availableSeats <= 0)
                  }
                  loading={isMinting}
                  onClick={handlePurchaseTicket}
                  icon={<Ticket className='w-5 h-5' />}
                  className='w-full sm:w-auto justify-center'
                >
                  {selectedTier && selectedTier.availableSeats !== undefined && selectedTier.availableSeats <= 0
                    ? 'ที่นั่งโซนนี้เต็มแล้ว (SOLD OUT)'
                    : purchaseMode === 'FAST'
                    ? 'ยืนยันการออกตั๋ว (ได้ตั๋วทันที)'
                    : 'ยืนยันและ Mint บน Sepolia'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* หน้าต่างโมดัลเพิ่มแมตช์การแข่งขันใหม่ */}
      <AddMatchModal
        isOpen={isAddMatchOpen}
        onClose={() => setIsAddMatchOpen(false)}
        onMatchAdded={async (newMatch) => {
          const freshMatches = await MatchService.getMatches();
          setMatches(freshMatches);
          setSelectedMatch(newMatch.matchId);
        }}
      />
    </div>
  );
}
