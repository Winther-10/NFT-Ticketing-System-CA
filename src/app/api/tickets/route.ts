import { NextRequest, NextResponse } from 'next/server';
import { TicketService } from '../../../services/ticket.service';

export async function GET(req : NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { success : false, error : 'ต้องระบุ wallet address' },
        { status : 400 }
      );
    }

    const tickets = await TicketService.getTicketsByWallet(walletAddress);
    return NextResponse.json({ success : true, data : tickets });
  } catch (err : any) {
    return NextResponse.json(
      { success : false, error : err.message },
      { status : 500 }
    );
  }
}

export async function POST(req : NextRequest) {
  try {
    const body = await req.json();
    const { idempotencyKey, walletAddress, tierId, matchId, seatZone, seatNumber } = body;

    // ตรวจสอบ Idempotency Key ป้องกันการกดซ้ำซ้อน
    if (idempotencyKey) {
      const check = await TicketService.checkIdempotency(idempotencyKey);
      if (check.exists && check.isCompleted) {
        return NextResponse.json(check.response);
      }
      await TicketService.recordIdempotencyStart(idempotencyKey, '/api/tickets', walletAddress);
    }

    const mockNewTicket = {
      tokenId : Math.floor(Math.random() * 9000) + 1000,
      walletAddress,
      ticketType : tierId.includes('SEASON') || tierId.includes('PLATINUM') ? 'SEASON_PASS' : 'SINGLE_MATCH',
      tierName : tierId,
      seatZone : seatZone || 'East Stand A10',
      seatNumber : seatNumber || 'A-12',
      targetMatchId : matchId,
      seasonYear : 2026,
      createdAt : new Date().toISOString()
    };

    const responsePayload = {
      success : true,
      message : 'ออกตั๋วสำเร็จ',
      data : mockNewTicket
    };

    if (idempotencyKey) {
      await TicketService.completeIdempotency(idempotencyKey, responsePayload);
    }

    return NextResponse.json(responsePayload);
  } catch (err : any) {
    return NextResponse.json(
      { success : false, error : err.message },
      { status : 500 }
    );
  }
}
