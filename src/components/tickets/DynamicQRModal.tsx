'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldAlert, RefreshCw, X, Clock, CheckCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../common/Button';
import { SECURITY_CONFIG } from '../../config/security';

export interface DynamicQRModalProps {
  isOpen : boolean;
  onClose : () => void;
  qrPayload : string;
  tokenId : number;
  tierName : string;
  seatZone : string;
  seatNumber : string;
  onRefresh : () => Promise<void>;
}

export const DynamicQRModal : React.FC<DynamicQRModalProps> = ({
  isOpen,
  onClose,
  qrPayload,
  tokenId,
  tierName,
  seatZone,
  seatNumber,
  onRefresh
}) => {
  const refreshInterval = SECURITY_CONFIG.qrRefreshIntervalSeconds;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(refreshInterval);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    setSecondsRemaining(refreshInterval);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, qrPayload, refreshInterval]);

  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      await onRefresh();
      setSecondsRemaining(refreshInterval);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isOpen) return null;

  const progressPercent = (secondsRemaining / refreshInterval) * 100;
  const isExpired = secondsRemaining === 0;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm'>
      <div className='bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col'>
        {/* Modal Header */}
        <div className='px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50'>
          <div className='flex items-center space-x-2'>
            <ShieldCheck className='w-5 h-5 text-[#002d62]' />
            <h3 className='font-bold text-slate-900 text-base'>
              Dynamic Entry QR Code
            </h3>
          </div>
          <button
            onClick={onClose}
            className='text-slate-400 hover : text-slate-600 p-1 rounded-lg hover : bg-slate-200/60 transition'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Modal Body */}
        <div className='p-6 flex flex-col items-center text-center'>
          {/* ข้อมูลที่นั่ง */}
          <div className='w-full bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-xs flex justify-between'>
            <div>
              <span className='text-slate-500 block'>โซนที่นั่ง</span>
              <span className='font-bold text-slate-800 text-sm'>{seatZone}</span>
            </div>
            <div>
              <span className='text-slate-500 block'>หมายเลขเก้าอี้</span>
              <span className='font-bold text-slate-800 text-sm'>{seatNumber}</span>
            </div>
            <div>
              <span className='text-slate-500 block'>Token ID</span>
              <span className='font-bold text-[#002d62] text-sm'>#{tokenId}</span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className='relative p-4 sm : p-5 bg-white border-2 border-slate-200 rounded-2xl shadow-inner flex flex-col items-center justify-center max-w-[280px] sm : max-w-[320px] w-full'>
            {qrPayload ? (
              <div className={`transition-opacity duration-200 ${isExpired ? 'opacity-20 blur-sm' : 'opacity-100'}`}>
                <QRCodeSVG
                  value={qrPayload}
                  size={200}
                  level='M'
                  includeMargin={false}
                  className='w-44 h-44 sm : w-52 sm : h-52'
                />
              </div>
            ) : (
              <div className='w-44 h-44 sm : w-52 sm : h-52 flex items-center justify-center text-xs text-slate-400'>
                กำลังประมวลผล Payload...
              </div>
            )}

            {isExpired && (
              <div className='absolute inset-0 flex flex-col items-center justify-center p-4 bg-white/90 rounded-2xl'>
                <Clock className='w-8 h-8 text-amber-600 mb-2' />
                <span className='text-xs font-bold text-slate-800 mb-2'>
                  QR Code หมดอายุแล้ว
                </span>
                <Button
                  size='sm'
                  variant='primary'
                  onClick={handleManualRefresh}
                  loading={isRefreshing}
                  icon={<RefreshCw className='w-3.5 h-3.5' />}
                >
                  สร้างลายเซ็นใหม่
                </Button>
              </div>
            )}
          </div>

          {/* แถบเวลานับถอยหลัง 60 วินาที */}
          <div className='w-full mt-4'>
            <div className='flex justify-between items-center text-xs font-medium text-slate-600 mb-1.5'>
              <span className='flex items-center space-x-1'>
                <Clock className='w-3.5 h-3.5 text-slate-400' />
                <span>อายุการใช้งาน</span>
              </span>
              <span className={secondsRemaining <= 10 ? 'text-rose-600 font-bold' : 'text-[#002d62] font-semibold'}>
                {secondsRemaining} วินาที
              </span>
            </div>
            <div className='w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200'>
              <div
                className={`h-full transition-all duration-1000 ${
                  secondsRemaining <= 5 ? 'bg-rose-500' : 'bg-[#002d62]'
                }`}
                style={{ width : `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* ป้ายเตือน Anti-Screenshot */}
          <div className='mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left flex items-start space-x-2.5 w-full'>
            <ShieldAlert className='w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5' />
            <div className='text-xs text-amber-800 leading-relaxed'>
              <span className='font-semibold block mb-0.5'>Anti-Screenshot Active</span>
              ห้ามแคปภาพหน้าจอส่งต่อ QR Code จะเปลี่ยนลายเซ็นดิจิทัลทุก {refreshInterval} วินาที เจ้าหน้าที่หน้าประตูจะปฏิเสธภาพถ่ายทันที
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className='px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between'>
          <span className='text-[11px] text-slate-400'>
            EIP-191 Signed by MetaMask
          </span>
          <Button
            size='sm'
            variant='outline'
            onClick={handleManualRefresh}
            loading={isRefreshing}
            icon={<RefreshCw className='w-3 h-3' />}
          >
            รีเฟรชทันที
          </Button>
        </div>
      </div>
    </div>
  );
};
