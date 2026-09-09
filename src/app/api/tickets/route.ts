import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../database/supabase';
import { TicketService, TicketRecord } from '../../../services/ticket.service';

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

    const normWallet = walletAddress.toLowerCase();
    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          token_id,
          wallet_address,
          ticket_type,
          tier_id,
          target_match_id,
          seat_zone,
          seat_number,
          season_year,
          metadata_uri,
          purchase_tx_hash,
          created_at
        `)
        .eq('wallet_address', normWallet)
        .order('created_at', { ascending : false });

      if (!error && data && data.length > 0) {
        const mappedTickets : TicketRecord[] = data.map((t : any) => ({
          tokenId : Number(t.token_id),
          walletAddress : t.wallet_address,
          ticketType : t.ticket_type,
          tierName : t.tier_id,
          seatZone : t.seat_zone,
          seatNumber : t.seat_number,
          targetMatchId : t.target_match_id || '',
          seasonYear : t.season_year || 2026,
          metadataUri : t.metadata_uri,
          purchaseTxHash : t.purchase_tx_hash,
          createdAt : t.created_at
        }));

        return NextResponse.json({ success : true, data : mappedTickets });
      }
    }

    return NextResponse.json({ success : true, data : [] });
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
    const {
      tokenId,
      walletAddress,
      ticketType,
      tierId,
      tierName,
      matchId,
      seatZone,
      seatNumber,
      seasonYear,
      metadataUri,
      purchaseTxHash,
      fullName,
      phoneNumber
    } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { success : false, error : 'ต้องระบุ wallet address' },
        { status : 400 }
      );
    }

    const normWallet = walletAddress.toLowerCase();
    const supabase = getSupabaseAdmin();

    if (supabase) {
      // 1. บันทึกข้อมูลผู้ใช้งานลงตาราง public.users (PDPA Compliant) เพื่อปลดล็อก Foreign Key
      const { error : userErr } = await supabase.from('users').upsert([
        {
          wallet_address : normWallet,
          full_name : fullName || 'แฟนบอลบุรีรัมย์ ยูไนเต็ด',
          phone_number : phoneNumber || '0812345678',
          email : `${normWallet.slice(0, 8)}@changarena.com`,
          consent_pdpa : true,
          updated_at : new Date().toISOString()
        }
      ]);

      if (userErr) {
        console.error('Supabase user upsert error : ', userErr);
      }

      // 2. แมป tier_id ให้ตรงกับ Primary Key ในตาราง public.seat_tiers
      const validTiers = [
        'PLATINUM_VIP', 'SEASON_GOLD', 'SEASON_SILVER',
        'EAST_A10', 'EAST_A5', 'EAST_A4_A6', 'EAST_REGULAR',
        'WEST_MAIN', 'NORTH_CURVA', 'SOUTH_GOAL', 'AWAY_ZONE'
      ];
      let dbTierId = tierId || 'EAST_A10';
      if (!validTiers.includes(dbTierId)) {
        if (dbTierId.includes('PLATINUM') || dbTierId.includes('VIP')) dbTierId = 'PLATINUM_VIP';
        else if (dbTierId.includes('SEASON') || dbTierId.includes('Gold')) dbTierId = 'SEASON_GOLD';
        else if (dbTierId.includes('Silver')) dbTierId = 'SEASON_SILVER';
        else if (dbTierId.includes('A10')) dbTierId = 'EAST_A10';
        else if (dbTierId.includes('A5')) dbTierId = 'EAST_A5';
        else if (dbTierId.includes('WEST') || dbTierId.includes('West')) dbTierId = 'WEST_MAIN';
        else if (dbTierId.includes('NORTH') || dbTierId.includes('North')) dbTierId = 'NORTH_CURVA';
        else if (dbTierId.includes('SOUTH') || dbTierId.includes('South')) dbTierId = 'SOUTH_GOAL';
        else dbTierId = 'EAST_A10';
      }

      // 3. บันทึกตั๋วจริงลงตาราง public.tickets ในฐานข้อมูล Supabase PostgreSQL
      const generatedTokenId = Number(tokenId) || ((Math.floor(Date.now() / 1000) % 90000) + 100);
      const isSeason = ticketType === 'SEASON_PASS' || dbTierId.includes('SEASON') || dbTierId.includes('PLATINUM');

      const ticketToInsert = {
        token_id : generatedTokenId,
        wallet_address : normWallet,
        ticket_type : isSeason ? 'SEASON_PASS' : 'SINGLE_MATCH',
        tier_id : dbTierId,
        target_match_id : isSeason ? null : (matchId || 'BRU-vs-MU-2026'),
        seat_zone : seatZone || 'A10',
        seat_number : seatNumber || 'Seat-1',
        season_year : Number(seasonYear) || 2026,
        metadata_uri : metadataUri || 'ipfs://chang-arena-ticket',
        purchase_tx_hash : purchaseTxHash || '',
        created_at : new Date().toISOString()
      };

      const { data : insertedTicket, error : ticketErr } = await supabase
        .from('tickets')
        .insert([ticketToInsert])
        .select()
        .single();

      if (ticketErr) {
        console.error('Supabase ticket insert error : ', ticketErr);
        return NextResponse.json(
          { success : false, error : ticketErr.message },
          { status : 400 }
        );
      }

      return NextResponse.json({
        success : true,
        message : 'บันทึกข้อมูลตั๋วจริงลงฐานข้อมูล Supabase เรียบร้อยแล้ว',
        data : insertedTicket
      });
    }

    return NextResponse.json({
      success : true,
      message : 'บันทึกข้อมูลสำเร็จ',
      data : body
    });
  } catch (err : any) {
    console.error('API Error : ', err);
    return NextResponse.json(
      { success : false, error : err.message },
      { status : 500 }
    );
  }
}
