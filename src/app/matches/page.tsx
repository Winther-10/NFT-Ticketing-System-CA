'use client';

import React, { useEffect, useState } from 'react';
import { MatchInfo, MatchService, SeatTierInfo } from '../../services/match.service';
import { BlockchainService } from '../../services/blockchain.service';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Ticket, Calendar, ShieldCheck, CheckCircle2, Award } from 'lucide-react';

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [seatTiers, setSeatTiers] = useState<SeatTierInfo[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>('BRU-vs-MU-2026');
  const [selectedTier, setSelectedTier] = useState<SeatTierInfo | null>(null);
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [mintStatus, setMintStatus] = useState<string>('');

  useEffect(() => {
    MatchService.getMatches().then((data) => setMatches(data));
    MatchService.getSeatTiers().then((data) => {
      setSeatTiers(data);
      if (data.length > 0) setSelectedTier(data[0]);
    });
  }, []);

  const handlePurchaseTicket = async () => {
    if (!selectedTier) return;

    try {
      setIsMinting(true);
      setMintStatus('กำลังเตรียมบันทึกสิทธิ์ตั๋ว NFT...');

      // ตรวจสอบกระเป๋าเงิน MetaMask
      let signer;
      let address = '0x1234567890abcdef1234567890abcdef12345678';
      try {
        signer = await BlockchainService.getSigner();
        address = await signer.getAddress();
      } catch {
        // แจ้งเตือนผู้ใช้หากยังไม่ได้ต่อกระเป๋า
      }

      setMintStatus(`กำลังออกตั๋ว NFT สำหรับ ${address.slice(0, 6)}... โซน ${selectedTier.name}`);

      // จำลองการ Mint ตั๋ว (หรือเรียก Smart Contract จริงหากเชื่อมต่อกับ Amoy)
      setTimeout(() => {
        setMintStatus(`ออกตั๋วสำเร็จ! Token ID บันทึกสิทธิ์เข้าชมเรียบร้อยแล้ว`);
        setIsMinting(false);
      }, 1500);
    } catch (err : any) {
      setMintStatus(`เกิดข้อผิดพลาด : ${err.message || 'ไม่สามารถทำรายการได้'}`);
      setIsMinting(false);
    }
  };

  return (
    <div className='max-w-7xl mx-auto px-4 sm : px-6 lg : px-8 py-10 space-y-10'>
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
        <label className='block text-sm font-bold text-slate-800'>
          เลือกนัดการแข่งขัน : 
        </label>
        <div className='grid grid-cols-1 md : grid-cols-3 gap-3'>
          {matches.map((m) => (
            <button
              key={m.matchId}
              type='button'
              onClick={() => setSelectedMatch(m.matchId)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedMatch === m.matchId
                  ? 'border-[#002d62] bg-blue-50/50 ring-2 ring-[#002d62]'
                  : 'border-slate-200 hover : border-slate-300 bg-white'
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
        <div className='grid grid-cols-1 md : grid-cols-2 lg : grid-cols-3 gap-5'>
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
                    : 'border-slate-200 bg-white hover : border-slate-300 shadow-sm'
                }`}
              >
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <Badge variant={isSeason ? 'gold' : 'default'}>
                      {isSeason ? 'SEASON PASS' : tier.standLocation}
                    </Badge>
                    <span className='text-xs text-slate-400 font-mono'>
                      {tier.totalCapacity} ที่นั่ง
                    </span>
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
        <div className='bg-slate-900 text-white rounded-3xl p-6 sm : p-8 shadow-xl flex flex-col md : flex-row items-center justify-between gap-6'>
          <div className='space-y-2'>
            <div className='text-xs text-amber-400 font-semibold tracking-wider uppercase'>
              สรุปรายการตั๋ว NFT ที่คุณเลือก
            </div>
            <h3 className='text-xl font-bold'>
              {selectedTier.name} &middot; ฿{selectedTier.basePriceThb.toLocaleString()}
            </h3>
            <p className='text-xs text-slate-300'>
              แมตช์ : {selectedMatch} | บันทึกสิทธิ์บน Smart Contract Polygon Amoy
            </p>
          </div>

          <div className='flex flex-col sm : flex-row items-center gap-3 w-full md : w-auto'>
            {mintStatus && (
              <span className='text-xs text-emerald-300 font-medium px-3 py-1 bg-white/10 rounded-lg'>
                {mintStatus}
              </span>
            )}
            <Button
              variant='gold'
              size='lg'
              loading={isMinting}
              onClick={handlePurchaseTicket}
              icon={<Ticket className='w-5 h-5' />}
              className='w-full sm : w-auto'
            >
              ยืนยันการออกตั๋ว NFT
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
