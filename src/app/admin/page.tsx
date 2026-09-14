'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Users,
  Ticket,
  CheckCircle2,
  ShieldAlert,
  Clock,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ScanLine,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  Layers,
  Calendar,
  Trophy,
  Filter,
  PlusCircle
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { AddMatchModal } from '../../components/matches/AddMatchModal';

interface OverviewStats {
  totalTickets : number;
  totalCheckedIn : number;
  totalScans : number;
  totalRejected : number;
  attendanceRate : number;
  onchainTickets : number;
  fastModeTickets : number;
  singleMatchCount : number;
  seasonPassCount : number;
}

interface ZoneStat {
  zoneName : string;
  totalTickets : number;
  checkedInCount : number;
  rate : string;
}

interface CheckinLog {
  id : string;
  token_id : number;
  match_id : string;
  gate_staff_address : string;
  entry_status : string;
  rejection_reason? : string;
  blockchain_tx_hash? : string;
  checked_in_at : string;
}

interface TicketItem {
  token_id : number;
  wallet_address : string;
  ticket_type : string;
  tier_id : string;
  target_match_id? : string;
  seat_zone : string;
  seat_number : string;
  created_at : string;
  purchase_tx_hash? : string;
}

interface MatchBreakdownItem {
  matchId : string;
  homeTeam : string;
  awayTeam : string;
  competition : string;
  matchDatetime : string;
  stadium : string;
  totalTickets : number;
  checkedInCount : number;
  rejectedCount : number;
  totalScans : number;
  attendanceRate : number;
  onchainTickets : number;
  fastModeTickets : number;
  singleTickets : number;
  seasonTickets : number;
}

interface DashboardData {
  overview : OverviewStats;
  zoneBreakdown : ZoneStat[];
  matchBreakdown? : MatchBreakdownItem[];
  recentCheckins : CheckinLog[];
  recentTickets : TicketItem[];
  lastUpdated : string;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'CHECKINS' | 'TICKETS'>('CHECKINS');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('ALL');
  const [isAddMatchOpen, setIsAddMatchOpen] = useState<boolean>(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.error('Fetch admin stats error : ', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Auto-refresh ทุก 10 วินาทีเมื่อเปิดโหมด Auto
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const globalOverview = data?.overview || {
    totalTickets : 0,
    totalCheckedIn : 0,
    totalScans : 0,
    totalRejected : 0,
    attendanceRate : 0,
    onchainTickets : 0,
    fastModeTickets : 0,
    singleMatchCount : 0,
    seasonPassCount : 0
  };

  const matches = data?.matchBreakdown || [];
  const selectedMatch = matches.find((m) => m.matchId === selectedMatchId);

  // คำนวณค่า KPI ตามแมตช์ที่เลือก (หรือแสดงภาพรวมทั้งหมดหากเลือก ALL)
  const currentOverview = selectedMatch
    ? {
        totalTickets : selectedMatch.totalTickets,
        totalCheckedIn : selectedMatch.checkedInCount,
        totalScans : selectedMatch.totalScans,
        totalRejected : selectedMatch.rejectedCount,
        attendanceRate : selectedMatch.attendanceRate,
        onchainTickets : selectedMatch.onchainTickets,
        fastModeTickets : selectedMatch.fastModeTickets,
        singleMatchCount : selectedMatch.singleTickets,
        seasonPassCount : selectedMatch.seasonTickets
      }
    : globalOverview;

  // กรองตารางสแกนและตั๋วตามแมตช์ที่เลือก
  const checkins = (data?.recentCheckins || []).filter((item) =>
    selectedMatchId === 'ALL' ? true : item.match_id === selectedMatchId
  );

  const tickets = (data?.recentTickets || []).filter((t) =>
    selectedMatchId === 'ALL'
      ? true
      : t.ticket_type === 'SEASON_PASS' || t.target_match_id === selectedMatchId
  );

  const zones = data?.zoneBreakdown || [];

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7'>
      {/* Top Navigation Bar with Back Button & Sandbox Tag */}
      <div className='flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200'>
        <Link href='/'>
          <Button
            variant='secondary'
            size='sm'
            icon={<ArrowLeft className='w-4 h-4' />}
            className='text-xs font-semibold shadow-sm'
          >
            ย้อนกลับสู่หน้าหลัก
          </Button>
        </Link>
        <div className='inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium'>
          <ShieldCheck className='w-3.5 h-3.5 text-amber-600' />
          <span>ระบบนี้ทำมาเพื่อทดสอบการทำงาน Blockchain &middot; Sepolia Testnet Sandbox</span>
        </div>
      </div>

      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <div className='inline-flex items-center space-x-2 text-xs font-semibold text-[#002d62] uppercase tracking-wider mb-2'>
            <BarChart3 className='w-4 h-4 text-[#c59b27]' />
            <span>Chang Arena Stadium Operations</span>
          </div>
          <h1 className='text-3xl font-extrabold text-slate-900'>
            แดชบอร์ดสถิติเจ้าหน้าที่สนาม (Gatekeeper Stats)
          </h1>
          <p className='text-sm text-slate-500 mt-1'>
            ติดตามยอดจำหน่ายตั๋ว NFT และสถิติการสแกนผ่านประตูเข้าสนามแบบ Real-time แยกรายแมตช์การแข่งขัน
          </p>
        </div>

        {/* Action Buttons */}
        <div className='flex flex-wrap items-center gap-2.5'>
          {/* สวิตช์ Auto Refresh */}
          <button
            type='button'
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Clock className='w-3.5 h-3.5 text-emerald-600' />
            <span>{autoRefresh ? 'อัปเดตอัตโนมัติ (10s)' : 'เปิดอัปเดตอัตโนมัติ'}</span>
          </button>

          {/* ปุ่มรีเฟรชข้อมูล */}
          <button
            type='button'
            onClick={fetchStats}
            disabled={loading}
            className='flex items-center space-x-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:text-[#002d62] hover:bg-slate-50 rounded-xl text-xs font-semibold transition-all shadow-sm'
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#002d62]' : ''}`} />
            <span>รีเฟรช</span>
          </button>

          {/* ปุ่มไปยังเครื่องสแกนประตู */}
          <Link href='/scanner'>
            <Button
              variant='primary'
              size='sm'
              icon={<ScanLine className='w-4 h-4' />}
              className='text-xs'
            >
              ไปที่เครื่องสแกนประตู
            </Button>
          </Link>

          {/* ปุ่มเปิดหน้าต่างเพิ่มแมตช์ใหม่ */}
          <Button
            type='button'
            variant='gold'
            size='sm'
            onClick={() => setIsAddMatchOpen(true)}
            icon={<PlusCircle className='w-4 h-4 text-white' />}
            className='text-xs font-semibold shadow-sm'
          >
            + เพิ่มแมตช์ใหม่
          </Button>
        </div>
      </div>

      {/* แถบตัวกรองสถิติแยกรายแมตช์ (Match Filter & Selector Bar) */}
      <div className='bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3'>
          <div className='flex items-center space-x-2 text-xs font-bold text-slate-700'>
            <Filter className='w-4 h-4 text-[#002d62]' />
            <span>เลือกกรองดูสถิติตามแมตช์การแข่งขัน : </span>
          </div>
          <div className='text-xs text-slate-500'>
            {selectedMatchId === 'ALL' ? (
              <span className='font-semibold text-[#002d62]'>แสดงภาพรวมยอดสะสมทุกแมตช์</span>
            ) : (
              <span>
                กำลังดูสถิติแมตช์ : <strong className='text-[#002d62]'>{selectedMatch?.homeTeam} vs {selectedMatch?.awayTeam}</strong>
              </span>
            )}
          </div>
        </div>

        {/* ปุ่มแท็บเลือกแมตช์ */}
        <div className='flex flex-wrap items-center gap-2'>
          <button
            type='button'
            onClick={() => setSelectedMatchId('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedMatchId === 'ALL'
                ? 'bg-[#002d62] text-white shadow-sm ring-2 ring-blue-900/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ภาพรวมทุกแมตช์ ({matches.length})
          </button>

          {matches.map((m) => (
            <button
              key={m.matchId}
              type='button'
              onClick={() => setSelectedMatchId(m.matchId)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedMatchId === m.matchId
                  ? 'bg-[#002d62] text-white shadow-sm ring-2 ring-blue-900/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Trophy className={`w-3.5 h-3.5 ${selectedMatchId === m.matchId ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>vs {m.awayTeam}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                selectedMatchId === m.matchId ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {m.totalTickets} ใบ
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* การ์ดสรุปเปรียบเทียบสถิติแยกรายแมตช์ (Match-by-Match Cards Grid) */}
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <Trophy className='w-4 h-4 text-[#c59b27]' />
            <h3 className='font-bold text-slate-900 text-base'>
              ตารางสถิติเปรียบเทียบแยกรายแมตช์การแข่งขัน
            </h3>
          </div>
          <span className='text-xs text-slate-400 hidden sm:inline-block'>
            คลิกที่การ์ดเพื่อกรองดูรายละเอียดเฉพาะแมตช์นั้น
          </span>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {matches.map((m) => {
            const isCurrent = selectedMatchId === m.matchId;
            return (
              <div
                key={m.matchId}
                onClick={() => setSelectedMatchId(m.matchId)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-4 shadow-sm ${
                  isCurrent
                    ? 'bg-gradient-to-br from-blue-50/90 to-amber-50/40 border-[#002d62] ring-2 ring-[#002d62]/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow'
                }`}
              >
                <div className='flex items-start justify-between gap-2'>
                  <span className='inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#002d62]/10 text-[#002d62]'>
                    {m.competition}
                  </span>
                  <span className='text-[11px] text-slate-400 font-mono'>
                    {new Date(m.matchDatetime).toLocaleDateString('th-TH', { month : 'short', day : 'numeric' })}
                  </span>
                </div>

                <div>
                  <h4 className='font-bold text-sm text-slate-900 leading-snug'>
                    {m.homeTeam} <br />
                    <span className='text-amber-700 font-extrabold'>vs {m.awayTeam}</span>
                  </h4>
                  <p className='text-[11px] text-slate-500 mt-0.5'>{m.stadium}</p>
                </div>

                {/* Progress Bar อัตราการเข้าสนาม */}
                <div className='space-y-1.5'>
                  <div className='flex items-center justify-between text-xs'>
                    <span className='text-slate-500'>เข้าสนามแล้ว</span>
                    <span className='font-bold text-[#002d62]'>
                      {m.checkedInCount} / {m.totalTickets} ใบ ({m.attendanceRate}%)
                    </span>
                  </div>
                  <div className='w-full bg-slate-100 rounded-full h-2 overflow-hidden'>
                    <div
                      className='bg-[#c59b27] h-2 rounded-full transition-all duration-500'
                      style={{ width : `${Math.min(m.attendanceRate, 100)}%` }}
                    />
                  </div>
                </div>

                {/* สถิติย่อย 3 ช่อง */}
                <div className='grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs'>
                  <div className='bg-slate-50 p-2 rounded-xl'>
                    <span className='text-[10px] text-slate-400 block'>ตั๋วทั้งหมด</span>
                    <strong className='font-mono text-slate-800 text-sm'>{m.totalTickets}</strong>
                  </div>
                  <div className='bg-emerald-50/70 p-2 rounded-xl'>
                    <span className='text-[10px] text-emerald-700 block'>เข้าสนามแล้ว</span>
                    <strong className='font-mono text-emerald-800 text-sm'>{m.checkedInCount}</strong>
                  </div>
                  <div className='bg-rose-50/70 p-2 rounded-xl'>
                    <span className='text-[10px] text-rose-700 block'>สกัดกั้นทุจริต</span>
                    <strong className='font-mono text-rose-700 text-sm'>{m.rejectedCount}</strong>
                  </div>
                </div>

                {/* ปุ่มสถานะการเลือก */}
                <div className='text-center pt-1'>
                  <span className={`text-[11px] font-semibold ${isCurrent ? 'text-[#002d62]' : 'text-slate-400'}`}>
                    {isCurrent ? '● กำลังแสดงสถิตินี้' : 'คลิกเพื่อดูสถิติแมตช์นี้'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overview 4 KPI Cards (ปรับเปลี่ยนตามแมตช์ที่เลือกแบบ Real-time) */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5'>
        {/* Card 1 : Total Tickets */}
        <div className='bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-bold text-slate-500 uppercase tracking-wider'>
              ตั๋วที่จำหน่ายแล้ว
            </span>
            <div className='w-9 h-9 rounded-xl bg-blue-50 text-[#002d62] flex items-center justify-center'>
              <Ticket className='w-5 h-5' />
            </div>
          </div>
          <div className='text-3xl font-extrabold text-slate-900'>
            {currentOverview.totalTickets.toLocaleString()} <span className='text-sm font-normal text-slate-500'>ใบ</span>
          </div>
          <div className='text-xs text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between'>
            <span>รายแมตช์ : {currentOverview.singleMatchCount}</span>
            <span>รายปี : {currentOverview.seasonPassCount}</span>
          </div>
        </div>

        {/* Card 2 : Attendance */}
        <div className='bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-bold text-slate-500 uppercase tracking-wider'>
              ยอดเข้าสนามแล้ว
            </span>
            <div className='w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center'>
              <CheckCircle2 className='w-5 h-5' />
            </div>
          </div>
          <div className='text-3xl font-extrabold text-emerald-700'>
            {currentOverview.totalCheckedIn.toLocaleString()} <span className='text-sm font-normal text-slate-500'>คน</span>
          </div>
          <div className='text-xs text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between'>
            <span>จำนวนสแกนทั้งหมด : {currentOverview.totalScans} ครั้ง</span>
          </div>
        </div>

        {/* Card 3 : Attendance Rate */}
        <div className='bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-bold text-slate-500 uppercase tracking-wider'>
              อัตราการเข้าสนาม
            </span>
            <div className='w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center'>
              <TrendingUp className='w-5 h-5' />
            </div>
          </div>
          <div className='text-3xl font-extrabold text-[#c59b27]'>
            {currentOverview.attendanceRate}%
          </div>
          {/* Progress Bar */}
          <div className='w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-1'>
            <div
              className='bg-[#c59b27] h-2 rounded-full transition-all duration-500'
              style={{ width : `${Math.min(currentOverview.attendanceRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Card 4 : Security Interceptions */}
        <div className='bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-bold text-slate-500 uppercase tracking-wider'>
              การตรวจจับผิดปกติ
            </span>
            <div className='w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center'>
              <ShieldAlert className='w-5 h-5' />
            </div>
          </div>
          <div className='text-3xl font-extrabold text-rose-600'>
            {currentOverview.totalRejected.toLocaleString()} <span className='text-sm font-normal text-slate-500'>ครั้ง</span>
          </div>
          <div className='text-xs text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between'>
            <span>สแกนซ้ำ / QR หมดอายุ</span>
            <span className='text-emerald-600 font-medium'>ระบบบล็อก 100%</span>
          </div>
        </div>
      </div>

      {/* Two Columns : Zone Breakdown & Channel Distribution */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Zone Breakdown (2 Cols) */}
        <div className='lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <Layers className='w-5 h-5 text-[#002d62]' />
              <h3 className='font-bold text-slate-900 text-lg'>
                สถิติการเข้าสนามแยกตามโซนอัฒจันทร์
              </h3>
            </div>
            <span className='text-xs text-slate-400'>
              อ้างอิงผังสนามช้างอารีนา
            </span>
          </div>

          <div className='space-y-4'>
            {zones.map((z) => (
              <div key={z.zoneName} className='space-y-1.5'>
                <div className='flex items-center justify-between text-xs'>
                  <span className='font-semibold text-slate-800'>{z.zoneName}</span>
                  <div className='space-x-2'>
                    <span className='text-slate-500'>
                      เข้าสนามแล้ว <strong>{z.checkedInCount}</strong> / {z.totalTickets} ใบ
                    </span>
                    <span className='font-mono font-bold text-[#002d62]'>
                      ({z.rate}%)
                    </span>
                  </div>
                </div>
                <div className='w-full bg-slate-100 rounded-full h-2.5 overflow-hidden'>
                  <div
                    className='bg-[#002d62] h-2.5 rounded-full transition-all duration-500'
                    style={{ width : `${Math.min(Number(z.rate), 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Issuance Channel Breakdown (1 Col) */}
        <div className='bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5 flex flex-col justify-between'>
          <div className='space-y-2'>
            <div className='flex items-center space-x-2'>
              <ShieldCheck className='w-5 h-5 text-emerald-600' />
              <h3 className='font-bold text-slate-900 text-lg'>
                ช่องทางการออกตั๋ว
              </h3>
            </div>
            <p className='text-xs text-slate-500'>
              สัดส่วนการบันทึกระหว่างบล็อกเชน Sepolia และระบบฐานข้อมูล
            </p>
          </div>

          <div className='space-y-3 py-2'>
            {/* Sepolia Smart Contract */}
            <div className='p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1'>
              <div className='flex items-center justify-between text-xs'>
                <span className='font-bold text-[#002d62]'>Sepolia Smart Contract</span>
                <span className='font-mono font-extrabold text-[#002d62] text-sm'>
                  {currentOverview.onchainTickets} ใบ
                </span>
              </div>
              <p className='text-[11px] text-slate-600'>
                บันทึกสิทธิ์บน Smart Contract จริง พร้อม TX Hash และ Etherscan
              </p>
            </div>

            {/* Fast Mode */}
            <div className='p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1'>
              <div className='flex items-center justify-between text-xs'>
                <span className='font-bold text-amber-900'>โหมดออกตั๋วด่วน (Fast Mode)</span>
                <span className='font-mono font-extrabold text-amber-900 text-sm'>
                  {currentOverview.fastModeTickets} ใบ
                </span>
              </div>
              <p className='text-[11px] text-slate-600'>
                บันทึกเข้าสู่ระบบฐานข้อมูลทันที ฟรี 100% ไม่เสียค่า Gas
              </p>
            </div>
          </div>

          <div className='pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed'>
            ตั๋วทุกช่องทางรองรับ Dynamic QR และลายเซ็นดิจิทัล EIP-191 ตรวจสอบผ่านเครื่องสแกนประตูได้เหมือนกัน 100%
          </div>
        </div>
      </div>

      {/* Data Table Section */}
      <div className='bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden'>
        {/* Table Tabs Header */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between px-6 pt-5 pb-3 border-b border-slate-200 gap-3'>
          <div className='flex items-center space-x-2'>
            <button
              type='button'
              onClick={() => setActiveTab('CHECKINS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'CHECKINS'
                  ? 'bg-[#002d62] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              ประวัติการสแกนผ่านประตู ({checkins.length})
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('TICKETS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'TICKETS'
                  ? 'bg-[#002d62] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              รายการตั๋วที่ออกล่าสุด ({tickets.length})
            </button>
          </div>

          <div className='flex items-center space-x-3 text-[11px] text-slate-400'>
            {selectedMatchId !== 'ALL' && (
              <span className='px-2 py-0.5 bg-blue-50 text-[#002d62] border border-blue-200 rounded-md font-medium'>
                กรองเฉพาะ : {selectedMatch?.awayTeam}
              </span>
            )}
            {data?.lastUpdated && (
              <span>
                อัปเดตล่าสุด : {new Date(data.lastUpdated).toLocaleTimeString('th-TH')}
              </span>
            )}
          </div>
        </div>

        {/* Content Table */}
        <div className='overflow-x-auto'>
          {activeTab === 'CHECKINS' ? (
            /* Checkin Logs Table */
            <table className='w-full text-left text-xs'>
              <thead className='bg-slate-50 text-slate-600 font-semibold border-b border-slate-200'>
                <tr>
                  <th className='py-3.5 px-4'>เวลาที่สแกน</th>
                  <th className='py-3.5 px-4'>Token ID</th>
                  <th className='py-3.5 px-4'>แมตช์การแข่งขัน</th>
                  <th className='py-3.5 px-4'>เจ้าหน้าที่ประตู (Staff)</th>
                  <th className='py-3.5 px-4'>สถานะ</th>
                  <th className='py-3.5 px-4'>หมายเหตุ / เหตุผล</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {checkins.length === 0 ? (
                  <tr>
                    <td colSpan={6} className='py-8 text-center text-slate-400'>
                      ยังไม่มีประวัติการสแกนผ่านประตูสำหรับแมตช์นี้ในระบบ
                    </td>
                  </tr>
                ) : (
                  checkins.map((item) => (
                    <tr key={item.id} className='hover:bg-slate-50/70 transition-colors'>
                      <td className='py-3 px-4 font-mono text-slate-500 whitespace-nowrap'>
                        {new Date(item.checked_in_at).toLocaleString('th-TH')}
                      </td>
                      <td className='py-3 px-4 font-mono font-bold text-[#002d62]'>
                        #{item.token_id}
                      </td>
                      <td className='py-3 px-4 text-slate-700 font-medium'>
                        {item.match_id}
                      </td>
                      <td className='py-3 px-4 font-mono text-slate-500 truncate max-w-[120px]'>
                        {item.gate_staff_address ? `${item.gate_staff_address.slice(0, 6)}...${item.gate_staff_address.slice(-4)}` : '-'}
                      </td>
                      <td className='py-3 px-4'>
                        {item.entry_status === 'SUCCESS' ? (
                          <span className='inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200'>
                            <CheckCircle2 className='w-3 h-3' />
                            <span>ผ่านประตูสำเร็จ</span>
                          </span>
                        ) : (
                          <span className='inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200'>
                            <ShieldAlert className='w-3 h-3' />
                            <span>ปฏิเสธสิทธิ์</span>
                          </span>
                        )}
                      </td>
                      <td className='py-3 px-4 text-slate-500 text-[11px]'>
                        {item.rejection_reason || 'ยืนยันลายเซ็นดิจิทัล EIP-191 ถูกต้อง'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* Tickets Table */
            <table className='w-full text-left text-xs'>
              <thead className='bg-slate-50 text-slate-600 font-semibold border-b border-slate-200'>
                <tr>
                  <th className='py-3.5 px-4'>Token ID</th>
                  <th className='py-3.5 px-4'>ประเภทตั๋ว</th>
                  <th className='py-3.5 px-4'>โซนและที่นั่ง</th>
                  <th className='py-3.5 px-4'>กระเป๋าผู้ถือบัตร</th>
                  <th className='py-3.5 px-4'>ช่องทางออกตั๋ว</th>
                  <th className='py-3.5 px-4'>วันที่ออกตั๋ว</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className='py-8 text-center text-slate-400'>
                      ยังไม่มีรายการตั๋วสำหรับแมตช์นี้ในระบบ
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr key={t.token_id} className='hover:bg-slate-50/70 transition-colors'>
                      <td className='py-3 px-4 font-mono font-bold text-[#002d62]'>
                        #{t.token_id}
                      </td>
                      <td className='py-3 px-4'>
                        <Badge variant={t.ticket_type === 'SEASON_PASS' ? 'gold' : 'default'}>
                          {t.ticket_type}
                        </Badge>
                      </td>
                      <td className='py-3 px-4 font-medium text-slate-800'>
                        {t.seat_number} ({t.seat_zone})
                      </td>
                      <td className='py-3 px-4 font-mono text-slate-500 truncate max-w-[140px]'>
                        {t.wallet_address}
                      </td>
                      <td className='py-3 px-4'>
                        {t.purchase_tx_hash && t.purchase_tx_hash.startsWith('0x') ? (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${t.purchase_tx_hash}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='inline-flex items-center space-x-1 text-[#002d62] font-semibold hover:underline'
                          >
                            <span>Sepolia On-Chain</span>
                            <ExternalLink className='w-3 h-3' />
                          </a>
                        ) : (
                          <span className='text-amber-800 font-medium'>Database Fast Mode</span>
                        )}
                      </td>
                      <td className='py-3 px-4 font-mono text-slate-500 whitespace-nowrap'>
                        {new Date(t.created_at).toLocaleString('th-TH')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* หน้าต่างโมดัลเพิ่มแมตช์การแข่งขันใหม่ */}
      <AddMatchModal
        isOpen={isAddMatchOpen}
        onClose={() => setIsAddMatchOpen(false)}
        onMatchAdded={(newMatch) => {
          fetchStats();
          setSelectedMatchId(newMatch.matchId);
        }}
      />
    </div>
  );
}
