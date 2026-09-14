'use client';

import React, { useState } from 'react';
import { TicketRecord } from '../../services/ticket.service';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  QrCode,
  Calendar,
  MapPin,
  CheckCircle,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  AlertCircle
} from 'lucide-react';
import { POLYGON_AMOY_CONFIG } from '../../config/contracts';

export interface TicketCardProps {
  ticket : TicketRecord;
  onOpenQR : (ticket : TicketRecord) => void;
  isLoading? : boolean;
}

export const TicketCard : React.FC<TicketCardProps> = ({
  ticket,
  onOpenQR,
  isLoading = false
}) => {
  const isSeasonPass = ticket.ticketType === 'SEASON_PASS';
  const isUsed = ticket.isUsed || ticket.status === 'USED';
  const isExpired = ticket.isExpired || ticket.status === 'EXPIRED';
  const [copied, setCopied] = useState(false);

  const handleCopyHash = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ticket.purchaseTxHash) return;
    navigator.clipboard.writeText(ticket.purchaseTxHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`rounded-2xl border shadow-sm transition-all duration-200 overflow-hidden flex flex-col justify-between ${
        isUsed
          ? 'bg-slate-50/75 border-slate-200 opacity-90'
          : isExpired
          ? 'bg-rose-50/30 border-rose-200/80 opacity-90'
          : 'bg-white border-slate-200 hover:shadow-md'
      }`}
    >
      {/* Top Banner */}
      <div
        className={`p-4 border-b flex items-center justify-between transition-colors ${
          isUsed
            ? 'bg-slate-100/90 border-slate-200'
            : isExpired
            ? 'bg-rose-50 border-rose-200'
            : isSeasonPass
            ? 'bg-gradient-to-r from-amber-50 to-amber-100/50 border-amber-200/60'
            : 'bg-slate-50 border-slate-100'
        }`}
      >
        <div className='flex items-center space-x-2'>
          <span className='font-mono font-bold text-xs text-slate-600'>
            TOKEN #{ticket.tokenId}
          </span>

          {/* ป้ายสถานะสิทธิ์การเข้าชม */}
          {isUsed ? (
            <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700 border border-slate-300'>
              <CheckCircle className='w-3 h-3 text-slate-500' />
              ใช้งานแล้ว
            </span>
          ) : isExpired ? (
            <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200'>
              <Clock className='w-3 h-3 text-rose-500' />
              หมดอายุ
            </span>
          ) : (
            <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300'>
              <CheckCircle className='w-3 h-3 text-emerald-600' />
              พร้อมเข้าชม
            </span>
          )}
        </div>

        <Badge variant={isUsed ? 'default' : isExpired ? 'error' : isSeasonPass ? 'gold' : 'default'}>
          {isSeasonPass ? 'SEASON PASS 2026' : 'SINGLE MATCH TICKET'}
        </Badge>
      </div>

      {/* Main Content */}
      <div className='p-5 space-y-4'>
        <div>
          <h4 className='text-lg font-bold text-slate-900 leading-snug'>
            {ticket.tierName}
          </h4>
          <p className='text-xs text-slate-500 mt-0.5 flex items-center space-x-1.5'>
            <MapPin className='w-3.5 h-3.5 text-slate-400' />
            <span>สนามช้างอารีนา (Chang Arena, Buriram)</span>
          </p>
        </div>

        {/* แถบแจ้งเตือนสถานะเมื่อถูกใช้งานหรือหมดอายุ */}
        {isUsed ? (
          <div className='bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between text-slate-600'>
            <div className='flex items-center gap-1.5 font-medium'>
              <CheckCircle className='w-4 h-4 text-slate-500 flex-shrink-0' />
              <span>สแกนผ่านประตูสนามเรียบร้อยแล้ว</span>
            </div>
            {ticket.usedAt && (
              <span className='text-[10px] text-slate-400 font-mono'>
                {new Date(ticket.usedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
              </span>
            )}
          </div>
        ) : isExpired ? (
          <div className='bg-rose-50 p-2.5 rounded-xl border border-rose-100 text-xs flex items-center gap-1.5 text-rose-700 font-medium'>
            <AlertCircle className='w-4 h-4 text-rose-500 flex-shrink-0' />
            <span>แมตช์นี้สิ้นสุดลงแล้ว สิทธิ์การเข้าชมหมดอายุ</span>
          </div>
        ) : null}

        {/* รายละเอียดการแข่งขันหรือฤดูกาล */}
        <div className='bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 text-xs'>
          <div className='flex justify-between items-center'>
            <span className='text-slate-500'>ขอบเขตการใช้งาน : </span>
            <span className='font-semibold text-slate-800'>
              {isSeasonPass ? 'ทุกนัดตลอดฤดูกาล 2026' : ticket.targetMatchId || 'นัดระบุในบัตร'}
            </span>
          </div>

          {/* แสดงวันเวลาแข่งขันจริง (Timestamp) */}
          {ticket.matchDateTime && !isSeasonPass && (
            <div className='flex justify-between items-center'>
              <span className='text-slate-500'>วันเวลาแข่งขัน : </span>
              <span className='font-semibold text-slate-700 flex items-center gap-1'>
                <Calendar className='w-3 h-3 text-slate-400' />
                <span>
                  {new Date(ticket.matchDateTime).toLocaleDateString('th-TH', {
                    day : 'numeric',
                    month : 'short',
                    year : 'numeric'
                  })}{' '}
                  ({new Date(ticket.matchDateTime).toLocaleTimeString('th-TH', {
                    hour : '2-digit',
                    minute : '2-digit'
                  })} น.)
                </span>
              </span>
            </div>
          )}

          <div className='flex justify-between items-center'>
            <span className='text-slate-500'>โซนอัฒจันทร์ : </span>
            <span className='font-bold text-[#002d62]'>
              {ticket.seatZone}
            </span>
          </div>

          <div className='flex justify-between items-center'>
            <span className='text-slate-500'>เลขที่นั่ง : </span>
            <span className='font-bold text-slate-800'>
              {ticket.seatNumber}
            </span>
          </div>
        </div>

        {/* เจ้าของกระเป๋า */}
        <div className='text-[11px] text-slate-400 font-mono truncate'>
          Owner : {ticket.walletAddress}
        </div>

        {/* Blockchain Tx Hash บันทึกถาวร */}
        {ticket.purchaseTxHash ? (
          <div className='bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs flex items-center justify-between gap-2'>
            <div className='flex items-center space-x-1.5 text-slate-600 font-medium overflow-hidden'>
              <ShieldCheck className='w-3.5 h-3.5 text-emerald-600 flex-shrink-0' />
              <span className='text-[11px] text-slate-500'>Tx Hash:</span>
              <a
                href={`${POLYGON_AMOY_CONFIG.blockExplorerUrl}/tx/${ticket.purchaseTxHash}`}
                target='_blank'
                rel='noopener noreferrer'
                className='font-mono font-bold text-[#002d62] hover:text-blue-700 hover:underline flex items-center space-x-1 truncate text-[11px]'
                title='คลิกเพื่อดู Transaction บน Sepolia Etherscan'
              >
                <span>{`${ticket.purchaseTxHash.slice(0, 8)}...${ticket.purchaseTxHash.slice(-6)}`}</span>
                <ExternalLink className='w-3 h-3 flex-shrink-0' />
              </a>
            </div>

            <button
              type='button'
              onClick={handleCopyHash}
              title='คัดลอก Tx Hash เต็ม'
              className='p-1 hover:bg-slate-200/70 rounded-lg text-slate-400 hover:text-slate-700 transition flex-shrink-0'
            >
              {copied ? (
                <Check className='w-3.5 h-3.5 text-emerald-600' />
              ) : (
                <Copy className='w-3.5 h-3.5' />
              )}
            </button>
          </div>
        ) : (
          <div className='text-[11px] text-slate-400 flex items-center justify-between px-1'>
            <span>ช่องทางออกตั๋ว :</span>
            <span className='text-slate-500 font-semibold'>Fast Pass (Off-Chain)</span>
          </div>
        )}
      </div>

      {/* Card Action */}
      <div className='p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end'>
        {isUsed ? (
          <Button
            size='sm'
            variant='outline'
            disabled
            icon={<CheckCircle className='w-4 h-4 text-slate-400' />}
            className='w-full bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed font-medium'
          >
            ใช้งานสิทธิ์เข้าสนามแล้ว (Used)
          </Button>
        ) : isExpired ? (
          <Button
            size='sm'
            variant='outline'
            disabled
            icon={<Clock className='w-4 h-4 text-slate-400' />}
            className='w-full bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed font-medium'
          >
            แมตช์สิ้นสุดแล้ว (Expired)
          </Button>
        ) : (
          <Button
            size='sm'
            variant={isSeasonPass ? 'gold' : 'primary'}
            onClick={() => onOpenQR(ticket)}
            loading={isLoading}
            icon={<QrCode className='w-4 h-4' />}
            className='w-full shadow-sm'
          >
            แสดง Dynamic QR เข้าสนาม
          </Button>
        )}
      </div>
    </div>
  );
};
