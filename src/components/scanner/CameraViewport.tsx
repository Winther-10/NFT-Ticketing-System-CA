'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, AlertCircle, CheckCircle2, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';

export interface CameraViewportProps {
  onScanResult : (decodedText : string) => Promise<void>;
  statusMessage : string;
  isProcessing : boolean;
  scanStatus : 'IDLE' | 'SUCCESS' | 'FAILED' | 'PROCESSING';
}

export const CameraViewport : React.FC<CameraViewportProps> = ({
  onScanResult,
  statusMessage,
  isProcessing,
  scanStatus
}) => {
  const [cameraError, setCameraError] = useState<string>('');
  const [manualInput, setManualInput] = useState<string>('');
  const [showManual, setShowManual] = useState<boolean>(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    try {
      const scanner = new Html5QrcodeScanner(
        'reader',
        {
          fps : 10,
          qrbox : { width : 250, height : 250 },
          aspectRatio : 1.0
        },
        false
      );

      scanner.render(
        async (decodedText : string) => {
          if (isProcessing) return;
          try {
            await onScanResult(decodedText);
          } catch (e) {
            console.error(e);
          }
        },
        (errorMessage : string) => {
          // Frame error (normal when QR is not in frame)
        }
      );

      scannerRef.current = scanner;
    } catch (err : any) {
      setCameraError('ไม่สามารถเข้าถึงกล้องเว็บแคมได้ หรืออุปกรณ์ไม่มีกล้อง');
      setShowManual(true);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, []);

  const handleManualSubmit = async (e : React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    await onScanResult(manualInput.trim());
  };

  return (
    <div className='flex flex-col items-center w-full max-w-md mx-auto'>
      {/* Scanner Box */}
      <div className='w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-5 overflow-hidden'>
        <div className='flex items-center justify-between pb-3 mb-4 border-b border-slate-100'>
          <div className='flex items-center space-x-2'>
            <Camera className='w-4 h-4 text-[#002d62]' />
            <span className='font-bold text-sm text-slate-800'>
              Gate Optical Scanner
            </span>
          </div>
          <button
            type='button'
            onClick={() => setShowManual(!showManual)}
            className='text-xs text-slate-500 hover:text-slate-800 underline'
          >
            {showManual ? 'เปิดมุมมองกล้อง' : 'กรอกโค้ดทดสอบ'}
          </button>
        </div>

        {/* Viewport กล้อง */}
        {!showManual ? (
          <div>
            <div id='reader' className='overflow-hidden rounded-xl bg-slate-900 border border-slate-800 text-white min-h-[260px]' />
            {cameraError && (
              <div className='mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start space-x-2'>
                <AlertCircle className='w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5' />
                <span>{cameraError} คุณสามารถสลับไปใช้ช่องกรอกโค้ดทดสอบเพื่อจำลองการสแกนได้</span>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className='space-y-3'>
            <label className='block text-xs font-medium text-slate-600'>
              วาง JSON Payload ของ Dynamic QR เพื่อทดสอบ : 
            </label>
            <textarea
              rows={4}
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder='{"data":"{...}","signature":"0x..."}'
              className='w-full p-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#002d62] focus:outline-none'
            />
            <Button
              type='submit'
              size='sm'
              variant='primary'
              loading={isProcessing}
              className='w-full'
            >
              ทดสอบส่งข้อมูลเข้าตรวจสิทธิ์
            </Button>
          </form>
        )}

        {/* ป้ายแสดงผลการตรวจสอบ Gate Check-in Status */}
        {statusMessage && (
          <div
            className={`mt-4 p-4 rounded-xl border text-sm font-medium transition-all shadow-sm ${
              scanStatus === 'SUCCESS'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : scanStatus === 'FAILED'
                ? 'bg-rose-600 text-white border-rose-500'
                : scanStatus === 'PROCESSING'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-[#002d62] text-white border-[#001c3d]'
            }`}
          >
            <div className='flex items-start space-x-2.5 text-white'>
              {scanStatus === 'SUCCESS' && <CheckCircle2 className='w-5 h-5 text-emerald-200 flex-shrink-0 mt-0.5' />}
              {scanStatus === 'FAILED' && <ShieldAlert className='w-5 h-5 text-rose-200 flex-shrink-0 mt-0.5' />}
              {scanStatus === 'PROCESSING' && <RefreshCw className='w-5 h-5 text-blue-200 animate-spin flex-shrink-0 mt-0.5' />}
              {scanStatus === 'IDLE' && <CheckCircle2 className='w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5' />}
              <div className='leading-relaxed text-white font-semibold'>{statusMessage}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
