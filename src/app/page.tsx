'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MatchInfo, MatchService } from '../services/match.service';
import { Calendar, ShieldCheck, Ticket, QrCode, ArrowRight, CheckCircle2, BarChart3, Cpu } from 'lucide-react';
import { Button } from '../components/common/Button';

export default function HomePage() {
  const [matches, setMatches] = useState<MatchInfo[]>([]);

  useEffect(() => {
    MatchService.getMatches().then((data) => setMatches(data));
  }, []);

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10'>
      {/* Hero Section */}
      <section className='bg-gradient-to-br from-[#002d62] via-[#001b3a] to-[#030b17] rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden'>
        <div className='relative z-10 max-w-2xl space-y-4'>
          <div className='inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-medium backdrop-blur-md border border-white/10'>
            <ShieldCheck className='w-3.5 h-3.5' />
            <span>ระบบทดสอบการทำงาน Blockchain &middot; Ethereum Sepolia Testnet</span>
          </div>

          <h1 className='text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight'>
            ระบบ NFT ตั๋วเข้าชม <br />
            <span className='text-amber-400'>สนามช้างอารีนา</span>
          </h1>

          <p className='text-slate-300 text-sm sm:text-base leading-relaxed'>
            สัมผัสประสบการณ์เข้าชมฟุตบอลระดับสากลของสโมสร บุรีรัมย์ ยูไนเต็ด ด้วยตั๋วดิจิทัล NFT ป้องกันตั๋วผี ตั๋วปลอม และการแคปภาพหน้าจอ (Anti-Screenshot) ด้วย Dynamic QR และการเข้ารหัสลับ EIP-191
          </p>

          <div className='pt-4 flex flex-col sm:flex-row flex-wrap gap-3'>
            <Link href='/matches' className='w-full sm:w-auto'>
              <Button
                variant='gold'
                size='md'
                icon={<Ticket className='w-4 h-4 text-white' />}
                className='w-full sm:w-auto justify-center font-bold shadow-md shadow-amber-950/20'
              >
                เลือกซื้อตั๋วการแข่งขัน
              </Button>
            </Link>
            <Link href='/my-tickets' className='w-full sm:w-auto'>
              <Button
                variant='navy'
                size='md'
                icon={<QrCode className='w-4 h-4 text-cyan-300' />}
                className='w-full sm:w-auto justify-center font-semibold shadow-md'
              >
                ตั๋วของฉัน (My Tickets)
              </Button>
            </Link>
            <Link href='/scanner' className='w-full sm:w-auto'>
              <Button
                variant='dark'
                size='md'
                icon={<ArrowRight className='w-4 h-4 text-emerald-400' />}
                className='w-full sm:w-auto justify-center font-semibold shadow-md'
              >
                เครื่องสแกนประตู
              </Button>
            </Link>
            <Link href='/admin' className='w-full sm:w-auto'>
              <Button
                variant='dark'
                size='md'
                icon={<BarChart3 className='w-4 h-4 text-amber-400' />}
                className='w-full sm:w-auto justify-center font-semibold shadow-md bg-[#001833] border border-amber-400/40 hover:bg-[#00244d] text-amber-300'
              >
                แดชบอร์ดสถิติเจ้าหน้าที่
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* แถบชี้แจงวัตถุประสงค์ระบบทดสอบ Blockchain (Blockchain Testing Purpose Banner) */}
      <section className='bg-gradient-to-r from-blue-50 via-amber-50/60 to-blue-50 border border-blue-200/80 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div className='flex items-start sm:items-center space-x-3.5'>
          <div className='w-10 h-10 rounded-xl bg-[#002d62] text-white flex items-center justify-center flex-shrink-0 shadow-sm'>
            <Cpu className='w-5 h-5 text-amber-400' />
          </div>
          <div>
            <div className='flex items-center space-x-2'>
              <h3 className='text-sm font-bold text-slate-900'>
                ระบบนี้พัฒนาขึ้นเพื่อทดสอบและวิจัยการทำงานของเทคโนโลยี Blockchain
              </h3>
              <span className='hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300'>
                Testnet Sandbox
              </span>
            </div>
            <p className='text-xs text-slate-600 mt-0.5 leading-relaxed'>
              ทดสอบ Smart Contract ERC-721 บน Sepolia, ลายเซ็นดิจิทัล Dynamic QR (EIP-191) และระบบสถิติสำหรับเจ้าหน้าที่ภาคสนาม
            </p>
          </div>
        </div>
        <div className='flex items-center space-x-2.5 flex-shrink-0'>
          <Link href='/admin'>
            <Button variant='primary' size='sm' icon={<BarChart3 className='w-4 h-4 text-amber-400' />} className='text-xs whitespace-nowrap shadow-sm'>
              เข้าสู่แดชบอร์ดสถิติ
            </Button>
          </Link>
          <Link href='/scanner'>
            <Button variant='outline' size='sm' icon={<ArrowRight className='w-4 h-4' />} className='text-xs whitespace-nowrap bg-white'>
              โหมดตรวจบัตร
            </Button>
          </Link>
        </div>
      </section>

      {/* จุดเด่นสถาปัตยกรรมระบบ (Core Architecture Pillars) */}
      <section className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <div className='bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3'>
          <div className='w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#002d62]'>
            <ShieldCheck className='w-5 h-5' />
          </div>
          <h3 className='font-bold text-slate-900 text-base'>
            Anti-Screenshot Dynamic QR
          </h3>
          <p className='text-xs text-slate-600 leading-relaxed'>
            ตั๋วทุกใบสร้างลายเซ็นดิจิทัลใหม่ทุก 60 วินาที ป้องกันการแคปภาพหน้าจอส่งต่อหรือนำตั๋วเวียนมาใช้ซ้ำ (มีโหมดเซ็นด่วนสำหรับการนำเสนองาน)
          </p>
        </div>

        <div className='bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3'>
          <div className='w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700'>
            <Ticket className='w-5 h-5' />
          </div>
          <h3 className='font-bold text-slate-900 text-base'>
            Dual-Mode Ticket Architecture
          </h3>
          <p className='text-xs text-slate-600 leading-relaxed'>
            รองรับทั้งตั๋วรายแมตช์ (Single Match Flag) และตั๋วรายปี (Season Pass Mapping) ภายใน Smart Contract เดียวกัน
          </p>
        </div>

        <div className='bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3'>
          <div className='w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700'>
            <CheckCircle2 className='w-5 h-5' />
          </div>
          <h3 className='font-bold text-slate-900 text-base'>
            PDPA by Design
          </h3>
          <p className='text-xs text-slate-600 leading-relaxed'>
            แยกข้อมูลชื่อและเบอร์โทรศัพท์ไว้ใน Supabase Off-chain เพื่อคุ้มครองข้อมูลส่วนบุคคลตามกฎหมาย โดยเก็บบนเชนเฉพาะสิทธิ์ตั๋ว
          </p>
        </div>
      </section>

      {/* รายการแมตช์แข่งขันถัดไป */}
      <section className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-bold text-slate-900'>
              ตารางการแข่งขันสนามช้างอารีนา
            </h2>
            <p className='text-xs text-slate-500'>
              เลือกแมตช์ที่ต้องการเพื่อสำรวจผังที่นั่งและซื้อตั๋ว NFT
            </p>
          </div>
          <Link href='/matches' className='text-xs font-semibold text-[#002d62] hover:underline flex items-center space-x-1'>
            <span>ดูทั้งหมด</span>
            <ArrowRight className='w-3.5 h-3.5' />
          </Link>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {matches.map((item) => (
            <div
              key={item.matchId}
              className='bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition'
            >
              <div className='space-y-3'>
                <div className='flex items-center justify-between text-xs text-slate-500'>
                  <span className='font-semibold text-[#002d62]'>{item.competition}</span>
                  <span className='flex items-center space-x-1'>
                    <Calendar className='w-3.5 h-3.5' />
                    <span>{new Date(item.matchDatetime).toLocaleDateString('th-TH')}</span>
                  </span>
                </div>

                <div className='py-2'>
                  <h4 className='font-bold text-slate-900 text-base'>
                    {item.homeTeam} vs {item.awayTeam}
                  </h4>
                  <p className='text-xs text-slate-500 mt-1'>
                    {item.stadium}
                  </p>
                </div>
              </div>

              <div className='pt-4 border-t border-slate-100 flex items-center justify-between'>
                <span className='text-xs font-mono text-slate-400'>
                  {item.matchId}
                </span>
                <Link href={`/matches?id=${item.matchId}`}>
                  <Button size='sm' variant='primary'>
                    ดูผังที่นั่ง
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
