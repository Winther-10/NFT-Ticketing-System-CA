'use client';

import React from 'react';
import { TicketRecord } from '../../services/ticket.service';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { QrCode, Calendar, MapPin, Award, CheckCircle } from 'lucide-react';

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

  return (
    <div className='bg-white rounded-2xl border border-slate-200 shadow-sm hover : shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between'>
      {/* Top Banner */}
      <div className={`p-4 border-b border-slate-100 flex items-center justify-between ${
        isSeasonPass ? 'bg-gradient-to-r from-amber-50 to-amber-100/50' : 'bg-slate-50'
      }`}>
        <div className='flex items-center space-x-2'>
          <span className='font-mono font-bold text-xs text-slate-500'>
            TOKEN #{ticket.tokenId}
          </span>
        </div>
        <Badge variant={isSeasonPass ? 'gold' : 'default'}>
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

        {/* รายละเอียดการแข่งขันหรือฤดูกาล */}
        <div className='bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 text-xs'>
          <div className='flex justify-between items-center'>
            <span className='text-slate-500'>ขอบเขตการใช้งาน : </span>
            <span className='font-semibold text-slate-800'>
              {isSeasonPass ? 'ทุกนัดตลอดฤดูกาล 2026' : ticket.targetMatchId || 'นัดระบุในบัตร'}
            </span>
          </div>

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
      </div>

      {/* Card Action */}
      <div className='p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end'>
        <Button
          size='sm'
          variant={isSeasonPass ? 'gold' : 'primary'}
          onClick={() => onOpenQR(ticket)}
          loading={isLoading}
          icon={<QrCode className='w-4 h-4' />}
          className='w-full'
        >
          แสดง Dynamic QR เข้าสนาม
        </Button>
      </div>
    </div>
  );
};
