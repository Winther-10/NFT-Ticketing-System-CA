'use client';

import React, { useState } from 'react';
import {
  X,
  Trophy,
  Calendar,
  MapPin,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  PlusCircle
} from 'lucide-react';
import { Button } from '../common/Button';
import { MatchInfo, MatchService } from '../../services/match.service';

interface AddMatchModalProps {
  isOpen : boolean;
  onClose : () => void;
  onMatchAdded : (newMatch : MatchInfo) => void;
}

interface MatchPreset {
  label : string;
  awayTeam : string;
  competition : string;
  daysFromNow : number;
  matchIdPrefix : string;
}

const POPULAR_PRESETS : MatchPreset[] = [
  {
    label : '⚡ vs การท่าเรือ เอฟซี (Thai League 1)',
    awayTeam : 'Port FC',
    competition : 'Thai League 1 (Big Match)',
    daysFromNow : 10,
    matchIdPrefix : 'PORT'
  },
  {
    label : '⚡ vs ทรู แบงค็อก ยูไนเต็ด (Chang FA Cup)',
    awayTeam : 'True Bangkok United',
    competition : 'Chang FA Cup (Round of 16)',
    daysFromNow : 18,
    matchIdPrefix : 'BKU'
  },
  {
    label : '⚡ vs โยโกฮาม่า เอฟ มารินอส (ACL Elite)',
    awayTeam : 'Yokohama F. Marinos',
    competition : 'AFC Champions League Elite',
    daysFromNow : 25,
    matchIdPrefix : 'YFM'
  },
  {
    label : '⚡ vs ชลบุรี เอฟซี (Thai League 1)',
    awayTeam : 'Chonburi FC',
    competition : 'Thai League 1',
    daysFromNow : 32,
    matchIdPrefix : 'CBR'
  },
  {
    label : '⚡ vs สิงห์ เชียงราย ยูไนเต็ด (Thai League Cup)',
    awayTeam : 'Chiangrai United',
    competition : 'Thai League Cup (Quarter-Final)',
    daysFromNow : 40,
    matchIdPrefix : 'CRU'
  }
];

export const AddMatchModal : React.FC<AddMatchModalProps> = ({
  isOpen,
  onClose,
  onMatchAdded
}) => {
  const getDefaultDateTime = (daysAhead = 7) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(19, 0, 0, 0);
    // Format YYYY-MM-DDTHH:mm
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const [homeTeam, setHomeTeam] = useState<string>('Buriram United');
  const [awayTeam, setAwayTeam] = useState<string>('');
  const [competition, setCompetition] = useState<string>('Thai League 1');
  const [matchDatetime, setMatchDatetime] = useState<string>(getDefaultDateTime(14));
  const [stadium, setStadium] = useState<string>('Chang Arena, Buriram');
  const [customMatchId, setCustomMatchId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  if (!isOpen) return null;

  // คำนวณ Match ID อัตโนมัติ
  const generatedMatchId = () => {
    if (customMatchId.trim()) return customMatchId.trim();
    const cleanAway = awayTeam.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'AWAY';
    const year = matchDatetime ? new Date(matchDatetime).getFullYear() : 2026;
    return `BRU-vs-${cleanAway}-${year}`;
  };

  const handleApplyPreset = (preset : MatchPreset) => {
    setAwayTeam(preset.awayTeam);
    setCompetition(preset.competition);
    setMatchDatetime(getDefaultDateTime(preset.daysFromNow));
    setCustomMatchId(`BRU-vs-${preset.matchIdPrefix}-2026`);
    setErrorMessage('');
  };

  const handleSubmit = async (e : React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!awayTeam.trim()) {
      setErrorMessage('กรุณาระบุชื่อทีมเยือน (Away Team)');
      return;
    }

    if (!matchDatetime) {
      setErrorMessage('กรุณาระบุวันและเวลาการแข่งขัน');
      return;
    }

    try {
      setIsLoading(true);
      const matchIdToUse = generatedMatchId();

      const res = await MatchService.createMatch({
        matchId : matchIdToUse,
        homeTeam : homeTeam.trim(),
        awayTeam : awayTeam.trim(),
        competition : competition.trim(),
        matchDatetime : new Date(matchDatetime).toISOString(),
        stadium : stadium.trim()
      });

      if (res.success && res.data) {
        setSuccessMessage(`เพิ่มแมตช์ ${res.data.homeTeam} vs ${res.data.awayTeam} เรียบร้อยแล้ว`);
        onMatchAdded(res.data);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMessage(res.error || 'ไม่สามารถเพิ่มแมตช์ได้ กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err : any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200'>
      <div className='relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8'>
        {/* Header */}
        <div className='bg-gradient-to-r from-[#002d62] via-[#001c3d] to-[#00142e] text-white p-6 pb-5'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2.5'>
              <div className='w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-sm'>
                <Trophy className='w-5 h-5' />
              </div>
              <div>
                <h3 className='font-bold text-lg text-white'>
                  เพิ่มแมตช์การแข่งขันใหม่ (Add Match Fixture)
                </h3>
                <p className='text-xs text-slate-300 mt-0.5'>
                  กำหนดโปรแกรมการแข่งขันและเปิดจำหน่ายตั๋ว NFT สนามช้างอารีนา
                </p>
              </div>
            </div>
            <button
              type='button'
              onClick={onClose}
              className='p-1.5 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors'
            >
              <X className='w-5 h-5' />
            </button>
          </div>

          {/* Quick Presets Bar */}
          <div className='mt-4 pt-3 border-t border-white/10 space-y-2'>
            <div className='flex items-center space-x-1 text-[11px] text-amber-300 font-medium'>
              <Sparkles className='w-3.5 h-3.5' />
              <span>ทางลัดกรอกข้อมูลแมตช์ยอดนิยม (1-Click Quick Presets) : </span>
            </div>
            <div className='flex flex-wrap gap-1.5'>
              {POPULAR_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type='button'
                  onClick={() => handleApplyPreset(p)}
                  className='text-[10px] px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 hover:text-white transition-all font-medium whitespace-nowrap'
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          {errorMessage && (
            <div className='p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start space-x-2'>
              <AlertCircle className='w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5' />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className='p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start space-x-2'>
              <CheckCircle2 className='w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5' />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Home & Away Teams Grid */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
            <div>
              <label className='block text-xs font-bold text-slate-700 mb-1.5'>
                ทีมเหย้า (Home Team)
              </label>
              <input
                type='text'
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                placeholder='Buriram United'
                required
                className='w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 font-medium focus:ring-2 focus:ring-[#002d62] focus:outline-none'
              />
            </div>

            <div>
              <label className='block text-xs font-bold text-slate-700 mb-1.5'>
                ทีมเยือน (Away Team) <span className='text-rose-500'>*</span>
              </label>
              <input
                type='text'
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                placeholder='เช่น Port FC, Chonburi FC'
                required
                className='w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-[#002d62] focus:outline-none shadow-sm'
              />
            </div>
          </div>

          {/* Competition & Stadium */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
            <div>
              <label className='block text-xs font-bold text-slate-700 mb-1.5'>
                รายการแข่งขัน (Competition)
              </label>
              <select
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
                className='w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-[#002d62] focus:outline-none shadow-sm'
              >
                <option value='Thai League 1'>Thai League 1</option>
                <option value='Thai League 1 (Big Match)'>Thai League 1 (Big Match)</option>
                <option value='Chang FA Cup'>Chang FA Cup</option>
                <option value='Thai League Cup'>Thai League Cup</option>
                <option value='AFC Champions League Elite'>AFC Champions League Elite</option>
                <option value='Shopee Cup (ASEAN Club Championship)'>Shopee Cup (ASEAN)</option>
              </select>
            </div>

            <div>
              <label className='block text-xs font-bold text-slate-700 mb-1.5'>
                สนามแข่งขัน (Stadium)
              </label>
              <div className='relative'>
                <input
                  type='text'
                  value={stadium}
                  onChange={(e) => setStadium(e.target.value)}
                  placeholder='Chang Arena, Buriram'
                  className='w-full px-3 py-2 pl-8 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-[#002d62] focus:outline-none shadow-sm'
                />
                <MapPin className='w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5' />
              </div>
            </div>
          </div>

          {/* Match Date & Time */}
          <div>
            <label className='block text-xs font-bold text-slate-700 mb-1.5'>
              วันและเวลาเริ่มแข่งขัน (Match Date & Time) <span className='text-rose-500'>*</span>
            </label>
            <div className='relative'>
              <input
                type='datetime-local'
                value={matchDatetime}
                onChange={(e) => setMatchDatetime(e.target.value)}
                required
                className='w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-[#002d62] focus:outline-none shadow-sm'
              />
            </div>
          </div>

          {/* Match ID Preview */}
          <div className='p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5'>
            <div className='flex items-center justify-between text-xs'>
              <span className='font-bold text-[#002d62]'>รหัสประจำแมตช์ (Match ID) : </span>
              <span className='font-mono font-bold text-[#002d62] bg-white px-2 py-0.5 rounded border border-blue-200'>
                {generatedMatchId()}
              </span>
            </div>
            <p className='text-[11px] text-slate-600'>
              รหัสนี้ใช้ระบุบน Smart Contract และบันทึกลงตั๋ว Single Match ทุกใบ
            </p>
          </div>

          {/* Notice Banner */}
          <div className='flex items-start space-x-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200'>
            <ShieldCheck className='w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5' />
            <span>
              แมตช์นี้จะถูกบันทึกลงฐานข้อมูล Supabase ทันที และจะเปิดให้เลือกซื้อตั๋ว NFT ทั้งแบบ On-chain และ Fast Mode พร้อมคำนวณเข้าสิทธิ์ Season Pass โดยอัตโนมัติ
            </span>
          </div>

          {/* Action Buttons */}
          <div className='flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100'>
            <Button
              type='button'
              variant='secondary'
              size='sm'
              onClick={onClose}
              disabled={isLoading}
              className='text-xs'
            >
              ยกเลิก
            </Button>
            <Button
              type='submit'
              variant='primary'
              size='sm'
              loading={isLoading}
              icon={<PlusCircle className='w-4 h-4 text-amber-400' />}
              className='text-xs font-semibold shadow-md'
            >
              บันทึกแมตช์ใหม่ลงระบบ
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
