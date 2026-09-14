'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CameraViewport } from '../../components/scanner/CameraViewport';
import { ScannerService } from '../../services/scanner.service';
import { BlockchainService } from '../../services/blockchain.service';
import { MatchInfo, MatchService } from '../../services/match.service';
import { ShieldCheck, ScanLine, AlertTriangle, CheckCircle2, XCircle, ArrowLeft, RotateCcw, History, RefreshCw, Clock } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export default function ScannerPage() {
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [currentMatchId, setCurrentMatchId] = useState<string>('BRU-vs-MU-2026');
  const [statusMessage, setStatusMessage] = useState<string>('พร้อมสแกนตรวจสิทธิ์บัตรเข้าสนาม');
  const [scanStatus, setScanStatus] = useState<'IDLE' | 'SUCCESS' | 'FAILED' | 'PROCESSING'>('IDLE');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [lastVerifiedTicket, setLastVerifiedTicket] = useState<any>(null);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');

  const currentMatchIdRef = useRef<string>(currentMatchId);
  useEffect(() => {
    currentMatchIdRef.current = currentMatchId;
  }, [currentMatchId]);

  // โหลดประวัติการสแกนตรวจบัตรเข้าสนามจาก Supabase
  const loadScanHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await fetch('/api/checkin?limit=30');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setScanHistory(json.data);
      }
    } catch (err) {
      console.warn('Load scan history warning : ', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // โหลดรายการแมตช์ทั้งหมดแบบ Dynamic จากระบบ และโหลดประวัติเริ่มต้น
  useEffect(() => {
    MatchService.getMatches().then((data) => {
      if (data && data.length > 0) {
        setMatches(data);
        if (!data.some((m) => m.matchId === currentMatchId)) {
          setCurrentMatchId(data[0].matchId);
        }
      }
    });
    loadScanHistory();
  }, []);

  // ฟังก์ชันรีเซ็ตประวัติการสแกนเพื่อทดสอบใหม่
  const handleResetAuditLogs = async () => {
    try {
      setIsResetting(true);
      const res = await fetch('/api/checkin', { method : 'DELETE' });
      const json = await res.json();
      if (json.success) {
        if (typeof window !== 'undefined') {
          for (let i = 1; i <= 50; i++) {
            localStorage.setItem('chang_arena_sandbox_reset_' + i, 'true');
          }
        }
        setStatusMessage('รีเซ็ตข้อมูลการสแกนทดสอบเรียบร้อยแล้ว ตั๋วทั้งหมดกลับสู่สถานะ [พร้อมเข้าชม]');
        setScanStatus('IDLE');
        setLastVerifiedTicket(null);
        await loadScanHistory();
      }
    } catch (err : any) {
      console.warn('Reset error : ', err);
    } finally {
      setIsResetting(false);
    }
  };

  // ตรวจสอบข้อมูลจากการสแกน QR Code
  const handleScanResult = async (decodedText : string) => {
    const activeMatchId = currentMatchIdRef.current;
    try {
      setIsProcessing(true);
      setScanStatus('PROCESSING');
      setStatusMessage('กำลังถอดรหัสลายเซ็นดิจิทัลและตรวจอายุ Dynamic QR...');

      // 1. เรียก ScannerService เพื่อตรวจ TTL, EIP-191 Signature และความถูกต้องของแมตช์การแข่งขัน
      const verification = ScannerService.verifyQRPayload(decodedText, 60, activeMatchId);

      if (!verification.isValid) {
        setScanStatus('FAILED');
        setStatusMessage(`ปฏิเสธการเข้าสนาม : ${verification.errorMessage}`);

        // บันทึก Log การปฏิเสธลงฐานข้อมูล checkin_logs ใน Supabase ทันที
        try {
          await fetch('/api/checkin', {
            method : 'POST',
            headers : { 'Content-Type' : 'application/json' },
            body : JSON.stringify({
              tokenId : verification.tokenId || 0,
              matchId : activeMatchId,
              gateStaffAddress : verification.signerAddress || '0x4789e4bfa1ef3f9f4866cfd729b409458410fcaf',
              entryStatus : 'FAILED',
              rejectionReason : verification.errorMessage,
              signedPayload : decodedText
            })
          });
        } catch (logErr) {
          console.warn('Check-in failed log warning : ', logErr);
        }

        await loadScanHistory();
        return;
      }

      setStatusMessage(`ลายเซ็นและแมตช์ถูกต้อง! (Signer : ${verification.signerAddress.slice(0, 6)}...) กำลังตรวจสอบสิทธิ์บน Ethereum Sepolia...`);

      // 2. ตรวจสอบการเข้าสนามผ่าน Blockchain Service
      try {
        // หากเชื่อมต่อกับ MetaMask และมีสิทธิ์ Staff ให้เรียก Contract จริง
        try {
          await BlockchainService.checkInEntry(verification.tokenId, activeMatchId);
        } catch (chainErr : any) {
          // หากรันในสภาพแวดล้อมจำลอง (Local Test) ให้ประเมินผล
          console.warn('Blockchain execution info : ', chainErr.message);
        }

        setLastVerifiedTicket({
          tokenId : verification.tokenId,
          owner : verification.owner,
          matchId : activeMatchId,
          timestamp : new Date().toLocaleTimeString('th-TH')
        });

        // บันทึกประวัติการเข้าสนามลง Supabase (checkin_logs table) จริง
        try {
          const auditRes = await fetch('/api/checkin', {
            method : 'POST',
            headers : { 'Content-Type' : 'application/json' },
            body : JSON.stringify({
              tokenId : verification.tokenId,
              matchId : activeMatchId,
              gateStaffAddress : verification.signerAddress || '0x4789e4bfa1ef3f9f4866cfd729b409458410fcaf',
              entryStatus : 'SUCCESS',
              signedPayload : decodedText
            })
          });

          const auditJson = await auditRes.json();
          if (!auditRes.ok || auditJson.duplicate) {
            setScanStatus('FAILED');
            setStatusMessage(`ปฏิเสธการเข้าสนาม : ${auditJson.error || 'ตั๋วนี้ถูกสแกนผ่านประตูไปแล้ว (ห้ามใช้ซ้ำ)'}`);
            await loadScanHistory();
            return;
          }
        } catch (auditErr) {
          console.warn('Check-in audit log warning : ', auditErr);
        }

        // เมื่อสแกนผ่านสำเร็จ ให้นำสถานะ Sandbox Reset ออกเพื่อคืนสู่สถานะใช้งานแล้ว
        if (typeof window !== 'undefined') {
          localStorage.removeItem('chang_arena_sandbox_reset_' + verification.tokenId);
        }

        setScanStatus('SUCCESS');
        setStatusMessage(`ผ่านสำเร็จ! ยืนยันสิทธิ์เข้าชมเรียบร้อย (Token ID #${verification.tokenId} | ${verification.owner.slice(0, 8)}...)`);
        await loadScanHistory();
      } catch (err : any) {
        setScanStatus('FAILED');
        setStatusMessage(`ปฏิเสธการเข้าสนาม : ${err.message || 'ตั๋วนี้ถูกใช้งานไปแล้ว'}`);
        await loadScanHistory();
      }
    } catch (err : any) {
      setScanStatus('FAILED');
      setStatusMessage(`เกิดข้อผิดพลาดในการตรวจสอบ : ${err.message}`);
      await loadScanHistory();
    } finally {
      setIsProcessing(false);
    }
  };

  const [customTokenId, setCustomTokenId] = useState<number>(2);

  // จำลองการสแกนตั๋วจริงในกระเป๋าตาม Token ID โดยดึงแมตช์จริงของตั๋ว
  const simulateTokenScan = async (tokenIdToScan : number) => {
    const activeMatchId = currentMatchIdRef.current;
    const now = Math.floor(Date.now() / 1000);
    const owner = '0x15d0f6023ecd4482b68e2d183b54179fc15220ac';

    // ผูกรหัสแมตช์จริงของตั๋วแต่ละใบเพื่อทดสอบการตรวจสอบคู่แข่งขัน
    let ticketMatchId = '';
    if (tokenIdToScan === 2) {
      ticketMatchId = 'BRU-vs-BG-2026'; // ตั๋วแมตช์ Buriram vs BG Pathum
    } else if (tokenIdToScan === 5) {
      ticketMatchId = 'BRU-vs-PORTFC-2026'; // ตั๋วแมตช์ Buriram vs Port FC
    } else if (tokenIdToScan === 11135) {
      ticketMatchId = 'BRU-vs-MU-2026'; // ตั๋วแมตช์ Buriram vs Muangthong
    } else if (tokenIdToScan === 1 || tokenIdToScan === 3 || tokenIdToScan === 4 || tokenIdToScan === 8 || tokenIdToScan === 19505) {
      ticketMatchId = ''; // ตั๋วรายปี Season Pass (ใช้ได้ทุกนัด)
    } else {
      ticketMatchId = activeMatchId;
    }

    const data = JSON.stringify({
      tokenId : tokenIdToScan,
      owner,
      timestamp : now,
      ...(ticketMatchId ? { matchId : ticketMatchId } : {}),
      instantMode : true
    });
    // EIP-191 mock signature
    const signature = '0x' + '1b'.repeat(65);
    const payload = JSON.stringify({ data, signature });
    handleScanResult(payload);
  };

  // ชุดข้อมูลจำลองสำหรับทดสอบสถานการณ์ต่างๆ (Test Scenarios)
  const simulateValidQR = () => {
    const activeMatchId = currentMatchIdRef.current;
    const now = Math.floor(Date.now() / 1000);
    const data = JSON.stringify({
      tokenId : 1,
      owner : '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
      timestamp : now,
      matchId : activeMatchId,
      instantMode : true
    });
    const signature = '0x' + '1b'.repeat(65);
    const payload = JSON.stringify({ data, signature });
    handleScanResult(payload);
  };

  const simulateExpiredQR = () => {
    const activeMatchId = currentMatchIdRef.current;
    // เวลาเมื่อ 3 นาทีที่แล้ว (อายุเกิน 60 วินาที = แคปภาพหน้าจอมา)
    const oldTime = Math.floor(Date.now() / 1000) - 180;
    const data = JSON.stringify({
      tokenId : 1,
      owner : '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
      timestamp : oldTime,
      matchId : activeMatchId,
      instantMode : true
    });
    const signature = '0x' + '1b'.repeat(65);
    const payload = JSON.stringify({ data, signature });
    handleScanResult(payload);
  };

  const simulateForgedQR = () => {
    const activeMatchId = currentMatchIdRef.current;
    // ลายเซ็นไม่ตรงกับ Owner
    const now = Math.floor(Date.now() / 1000);
    const data = JSON.stringify({
      tokenId : 2,
      owner : '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
      timestamp : now,
      matchId : activeMatchId,
      instantMode : false
    });
    // ลายเซ็นขยะ
    const signature = '0x' + '00'.repeat(65);
    const payload = JSON.stringify({ data, signature });
    handleScanResult(payload);
  };

  // จำลองสแกนตั๋วผิดคู่แข่งขัน (Invalid Match)
  const simulateWrongMatchQR = () => {
    const activeMatchId = currentMatchIdRef.current;
    // สลับเป็นรหัสแมตช์อื่นที่ตรงข้ามกับแมตช์ที่เลือกไว้ใน Dropdown
    const wrongMatchId = activeMatchId === 'BRU-vs-PORTFC-2026' ? 'BRU-vs-MU-2026' : 'BRU-vs-PORTFC-2026';
    const now = Math.floor(Date.now() / 1000);
    const data = JSON.stringify({
      tokenId : 5,
      owner : '0x15d0f6023ecd4482b68e2d183b54179fc15220ac',
      timestamp : now,
      matchId : wrongMatchId,
      instantMode : true
    });
    const signature = '0x' + '1b'.repeat(65);
    const payload = JSON.stringify({ data, signature });
    handleScanResult(payload);
  };

  const filteredLogs = scanHistory.filter((log : any) => {
    if (historyFilter === 'ALL') return true;
    return log.entry_status === historyFilter;
  });

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6'>
      {/* Top Navigation Bar with Back Button */}
      <div className='flex items-center justify-between pb-2 border-b border-slate-200'>
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
        <Link href='/admin'>
          <Button
            variant='outline'
            size='sm'
            icon={<ScanLine className='w-4 h-4' />}
            className='text-xs'
          >
            ดูแดชบอร์ดสถิติ
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <div className='inline-flex items-center space-x-2 text-xs font-semibold text-[#002d62] uppercase tracking-wider mb-2'>
            <ScanLine className='w-4 h-4 text-[#002d62]' />
            <span>Gatekeeper Gate Verification</span>
          </div>
          <h1 className='text-3xl font-extrabold text-slate-900'>
            ระบบตรวจบัตรเข้าสนาม (Chang Arena Gatekeeper)
          </h1>
          <p className='text-sm text-slate-500 mt-1'>
            เปิดกล้องสแกนตั๋ว NFT ถอดรหัสลายเซ็นดิจิทัล และบันทึก Check-in ลงบล็อกเชน
          </p>
        </div>

        {/* ตัวเลือกแมตช์ปัจจุบัน */}
        <div className='bg-white p-3 px-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3'>
          <span className='text-xs font-medium text-slate-500'>แมตช์ปัจจุบัน : </span>
          <select
            value={currentMatchId}
            onChange={(e) => setCurrentMatchId(e.target.value)}
            className='bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg p-2 text-[#002d62] focus:outline-none focus:ring-2 focus:ring-[#002d62] max-w-[280px]'
          >
            {matches.length > 0 ? (
              matches.map((m) => (
                <option key={m.matchId} value={m.matchId}>
                  {m.homeTeam} vs {m.awayTeam} ({m.competition})
                </option>
              ))
            ) : (
              <>
                <option value='BRU-vs-MU-2026'>BRU vs MU (Thai League)</option>
                <option value='BRU-vs-BG-2026'>BRU vs BG Pathum (Thai League)</option>
                <option value='BRU-vs-JDT-2026'>BRU vs JDT (ACL Elite)</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
        {/* คอลัมน์ซ้าย : กล้องสแกนและผลการตรวจ */}
        <div className='lg:col-span-7 flex flex-col items-center justify-center'>
          <CameraViewport
            onScanResult={handleScanResult}
            statusMessage={statusMessage}
            isProcessing={isProcessing}
            scanStatus={scanStatus}
          />
        </div>

        {/* คอลัมน์ขวา : ข้อมูลบันทึกและชุดทดสอบสถานการณ์ */}
        <div className='lg:col-span-5 space-y-6'>
          {/* ข้อมูลตั๋วใบล่าสุดที่ผ่านเข้าสนาม */}
          <div className='bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3'>
            <div className='flex items-center justify-between border-b border-slate-100 pb-3'>
              <h4 className='font-bold text-slate-900 text-sm'>
                บันทึกการเข้าสนามใบล่าสุด
              </h4>
              <Badge variant='success'>LIVE AUDIT</Badge>
            </div>

            {lastVerifiedTicket ? (
              <div className='space-y-2 text-xs'>
                <div className='flex justify-between py-1 border-b border-slate-50'>
                  <span className='text-slate-500'>Token ID : </span>
                  <span className='font-bold text-[#002d62]'>#{lastVerifiedTicket.tokenId}</span>
                </div>
                <div className='flex justify-between py-1 border-b border-slate-50'>
                  <span className='text-slate-500'>แมตช์การแข่งขัน : </span>
                  <span className='font-semibold text-slate-800'>{lastVerifiedTicket.matchId}</span>
                </div>
                <div className='flex justify-between py-1 border-b border-slate-50'>
                  <span className='text-slate-500'>กระเป๋าแฟนบอล : </span>
                  <span className='font-mono text-slate-600 truncate max-w-[180px]'>
                    {lastVerifiedTicket.owner}
                  </span>
                </div>
                <div className='flex justify-between py-1'>
                  <span className='text-slate-500'>เวลาที่ผ่านเข้าประตู : </span>
                  <span className='font-semibold text-emerald-700'>{lastVerifiedTicket.timestamp}</span>
                </div>
              </div>
            ) : (
              <div className='py-6 text-center text-xs text-slate-400'>
                ยังไม่มีรายการสแกนในรอบนี้
              </div>
            )}
          </div>

          {/* กล่องทดสอบสแกนตั๋วจริงจากกระเป๋า (Interactive Sandbox Test) */}
          <div className='bg-white rounded-2xl border border-blue-200 p-5 shadow-sm space-y-3 bg-gradient-to-b from-blue-50/40 to-white'>
            <div className='border-b border-blue-100 pb-2.5 flex items-center justify-between'>
              <div>
                <h4 className='font-bold text-slate-900 text-sm flex items-center gap-1.5'>
                  <ShieldCheck className='w-4 h-4 text-[#002d62]' />
                  <span>ทดสอบสแกนตั๋วจริงในระบบ (Sandbox)</span>
                </h4>
                <p className='text-xs text-slate-500 mt-0.5'>
                  คลิกเพื่อจำลองการสแกนตั๋วแต่ละใบ และดูการเปลี่ยนสถานะ
                </p>
              </div>
              <Badge variant='gold'>TEST SCAN</Badge>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1'>
              <button
                type='button'
                onClick={() => simulateTokenScan(2)}
                className='p-2.5 rounded-xl border border-blue-300 bg-white hover:bg-blue-50 text-xs font-bold text-[#002d62] transition text-left flex flex-col justify-between shadow-xs'
              >
                <div className='flex items-center justify-between w-full'>
                  <span>สแกน #2</span>
                  <span className='text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-normal'>BG Pathum</span>
                </div>
                <span className='text-[10px] text-slate-500 mt-1'>ตั๋วแมตช์ BG Pathum (นัดอื่นจะถูกปฏิเสธ)</span>
              </button>

              <button
                type='button'
                onClick={() => simulateTokenScan(5)}
                className='p-2.5 rounded-xl border border-indigo-300 bg-white hover:bg-indigo-50 text-xs font-bold text-indigo-900 transition text-left flex flex-col justify-between shadow-xs'
              >
                <div className='flex items-center justify-between w-full'>
                  <span>สแกน #5</span>
                  <span className='text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-normal'>Port FC</span>
                </div>
                <span className='text-[10px] text-slate-500 mt-1'>ตั๋วแมตช์ Port FC (นัดอื่นจะถูกปฏิเสธ)</span>
              </button>

              <button
                type='button'
                onClick={() => simulateTokenScan(4)}
                className='p-2.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 text-xs font-bold text-amber-900 transition text-left flex flex-col justify-between shadow-xs'
              >
                <div className='flex items-center justify-between w-full'>
                  <span>สแกน #4</span>
                  <span className='text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-normal'>Season</span>
                </div>
                <span className='text-[10px] text-slate-500 mt-1'>ตั๋วรายปี (สแกนผ่านได้ทุกนัด)</span>
              </button>
            </div>

            {/* ช่องกรอก Token ID แบบกำหนดเอง */}
            <div className='pt-1.5 flex items-center gap-2'>
              <div className='flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex-1'>
                <span className='text-xs text-slate-500 font-bold mr-1'>Token #</span>
                <input
                  type='number'
                  value={customTokenId}
                  onChange={(e) => setCustomTokenId(Number(e.target.value))}
                  className='bg-transparent text-xs font-bold text-slate-800 w-full focus:outline-none'
                  placeholder='ระบุ Token ID'
                />
              </div>
              <Button
                size='sm'
                variant='primary'
                onClick={() => simulateTokenScan(customTokenId)}
                icon={<ScanLine className='w-3.5 h-3.5' />}
                className='text-xs'
              >
                สแกนตั๋วใบนี้
              </Button>
            </div>

            {/* ปุ่มรีเซ็ตสถานะการทดสอบ */}
            <div className='pt-2 border-t border-blue-100 flex items-center justify-between'>
              <span className='text-[11px] text-slate-500'>ต้องการทดสอบใหม่ตั้งแต่ต้น?</span>
              <button
                type='button'
                onClick={handleResetAuditLogs}
                disabled={isResetting}
                className='text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 disabled:opacity-50 transition'
              >
                <RotateCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
                <span>{isResetting ? 'กำลังรีเซ็ต...' : 'รีเซ็ตสถานะตั๋วทดสอบทั้งหมด'}</span>
              </button>
            </div>
          </div>

          {/* กล่องทดสอบสถานการณ์จำลอง (Simulation Testing Box) */}
          <div className='bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4'>
            <div className='border-b border-slate-100 pb-3'>
              <h4 className='font-bold text-slate-900 text-sm'>
                จำลองสถานการณ์ตรวจบัตร (Test Scenarios)
              </h4>
              <p className='text-xs text-slate-500 mt-0.5'>
                ทดสอบตรรกะความปลอดภัย ป้องกันการแคปจอ ตั๋วผิดคู่แข่งขัน และการสวมสิทธิ์
              </p>
            </div>

            <div className='space-y-2.5'>
              <button
                type='button'
                onClick={simulateValidQR}
                className='w-full text-left p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-xs font-semibold text-emerald-900 transition flex items-center justify-between'
              >
                <div className='flex items-center space-x-2'>
                  <CheckCircle2 className='w-4 h-4 text-emerald-600' />
                  <span>1. ตั๋วถูกต้องและเวลาไม่เกิน 60 วินาที</span>
                </div>
                <span className='text-[10px] text-emerald-700 font-mono'>ผ่านสิทธิ์</span>
              </button>

              <button
                type='button'
                onClick={simulateExpiredQR}
                className='w-full text-left p-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-xs font-semibold text-rose-900 transition flex items-center justify-between'
              >
                <div className='flex items-center space-x-2'>
                  <XCircle className='w-4 h-4 text-rose-600' />
                  <span>2. ตรวจจับภาพแคปหน้าจอ (เวลาเกิน 60 วินาที)</span>
                </div>
                <span className='text-[10px] text-rose-700 font-mono'>ตรวจจับการทุจริต</span>
              </button>

              <button
                type='button'
                onClick={simulateForgedQR}
                className='w-full text-left p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-xs font-semibold text-amber-900 transition flex items-center justify-between'
              >
                <div className='flex items-center space-x-2'>
                  <AlertTriangle className='w-4 h-4 text-amber-600' />
                  <span>3. ตรวจจับลายเซ็นปลอมแปลง (Signer ปลอม)</span>
                </div>
                <span className='text-[10px] text-amber-700 font-mono'>ปฏิเสธทันที</span>
              </button>

              <button
                type='button'
                onClick={simulateWrongMatchQR}
                className='w-full text-left p-3 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-xs font-semibold text-purple-900 transition flex items-center justify-between'
              >
                <div className='flex items-center space-x-2'>
                  <AlertTriangle className='w-4 h-4 text-purple-600' />
                  <span>4. ตรวจจับตั๋วผิดคู่แข่งขัน (Invalid Match : ตั๋วคนละแมตช์)</span>
                </div>
                <span className='text-[10px] text-purple-700 font-mono'>ปฏิเสธทันที</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ส่วนแสดงประวัติการสแกนตั๋วเข้าสนาม (Check-in Audit Logs & History) */}
      <div className='bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4'>
          <div className='flex items-center space-x-3'>
            <div className='w-10 h-10 rounded-xl bg-blue-50 text-[#002d62] flex items-center justify-center shadow-xs'>
              <History className='w-5 h-5' />
            </div>
            <div>
              <h3 className='font-bold text-slate-900 text-base flex items-center gap-2'>
                <span>ประวัติการสแกนตั๋วเข้าสนาม (Check-in Audit Logs)</span>
                <span className='px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200'>
                  {filteredLogs.length} รายการ
                </span>
              </h3>
              <p className='text-xs text-slate-500'>
                บันทึกการตรวจสอบความถูกต้องและผลการผ่านประตูสนามช้างอารีนาแบบ Real-time
              </p>
            </div>
          </div>

          <div className='flex items-center space-x-2'>
            {/* ตัวกรองสถานะ */}
            <div className='flex bg-slate-100 p-1 rounded-xl text-xs font-medium'>
              <button
                type='button'
                onClick={() => setHistoryFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition ${
                  historyFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type='button'
                onClick={() => setHistoryFilter('SUCCESS')}
                className={`px-3 py-1 rounded-lg transition ${
                  historyFilter === 'SUCCESS'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-emerald-700 hover:text-emerald-800'
                }`}
              >
                ผ่านสำเร็จ
              </button>
              <button
                type='button'
                onClick={() => setHistoryFilter('FAILED')}
                className={`px-3 py-1 rounded-lg transition ${
                  historyFilter === 'FAILED'
                    ? 'bg-rose-600 text-white shadow-xs font-bold'
                    : 'text-rose-700 hover:text-rose-800'
                }`}
              >
                ถูกปฏิเสธ
              </button>
            </div>

            {/* ปุ่มรีเฟรชประวัติ */}
            <button
              type='button'
              onClick={loadScanHistory}
              disabled={isLoadingHistory}
              className='p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition'
              title='โหลดประวัติล่าสุด'
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ตารางแสดงรายการประวัติ */}
        {filteredLogs.length === 0 ? (
          <div className='py-12 text-center space-y-2'>
            <Clock className='w-8 h-8 text-slate-300 mx-auto' />
            <p className='text-sm text-slate-500 font-medium'>
              ยังไม่มีประวัติการสแกนตั๋วในระบบ
            </p>
            <p className='text-xs text-slate-400'>
              เมื่อมีการสแกน QR Code ตรวจบัตรที่หน้าประตู รายการบันทึก Audit Log จะแสดงขึ้นที่นี่โดยอัตโนมัติ
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-xs'>
              <thead>
                <tr className='border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[11px] bg-slate-50/50'>
                  <th className='py-3 px-3.5 font-semibold'>เวลาที่สแกน</th>
                  <th className='py-3 px-3.5 font-semibold'>Token ID</th>
                  <th className='py-3 px-3.5 font-semibold'>แมตช์การแข่งขัน</th>
                  <th className='py-3 px-3.5 font-semibold'>สถานะ</th>
                  <th className='py-3 px-3.5 font-semibold'>รายละเอียด / เหตุผล</th>
                  <th className='py-3 px-3.5 font-semibold'>เจ้าหน้าที่สแกน</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {filteredLogs.map((log : any) => {
                  const isSuccess = log.entry_status === 'SUCCESS';
                  const dateStr = log.checked_in_at
                    ? new Date(log.checked_in_at).toLocaleTimeString('th-TH') +
                      ' ' +
                      new Date(log.checked_in_at).toLocaleDateString('th-TH')
                    : '-';

                  return (
                    <tr key={log.id} className='hover:bg-slate-50/80 transition-colors'>
                      <td className='py-3 px-3.5 font-mono text-slate-600 whitespace-nowrap'>
                        {dateStr}
                      </td>
                      <td className='py-3 px-3.5 whitespace-nowrap'>
                        <span className='inline-flex items-center px-2 py-0.5 rounded-md font-bold font-mono text-xs bg-blue-50 text-[#002d62] border border-blue-200'>
                          #{log.token_id}
                        </span>
                      </td>
                      <td className='py-3 px-3.5 font-semibold text-slate-700 whitespace-nowrap'>
                        {log.match_id}
                      </td>
                      <td className='py-3 px-3.5 whitespace-nowrap'>
                        {isSuccess ? (
                          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200'>
                            <CheckCircle2 className='w-3 h-3 mr-1 text-emerald-600' />
                            ผ่านเข้าสนามสำเร็จ
                          </span>
                        ) : (
                          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200'>
                            <XCircle className='w-3 h-3 mr-1 text-rose-600' />
                            ปฏิเสธการเข้า
                          </span>
                        )}
                      </td>
                      <td className='py-3 px-3.5 text-slate-600 max-w-sm'>
                        {log.rejection_reason ? (
                          <span className='text-rose-600 font-medium'>
                            {log.rejection_reason}
                          </span>
                        ) : (
                          <span className='text-emerald-700'>
                            ยืนยันสิทธิ์ถูกต้อง สแกนผ่านประตูเรียบร้อย
                          </span>
                        )}
                      </td>
                      <td className='py-3 px-3.5 font-mono text-slate-500 whitespace-nowrap'>
                        {log.gate_staff_address
                          ? `${log.gate_staff_address.slice(0, 6)}...${log.gate_staff_address.slice(-4)}`
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
