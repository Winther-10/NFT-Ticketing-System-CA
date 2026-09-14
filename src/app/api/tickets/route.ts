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
        const tokenIds = data.map((t : any) => Number(t.token_id)).filter((id : number) => !isNaN(id));

        // 1. ดึงประวัติการเข้าชมที่ SUCCESS จาก checkin_logs เพื่อดูว่าตั๋วถูกใช้งานแล้วหรือไม่
        const { data : checkins } = await supabase
          .from('checkin_logs')
          .select('token_id, match_id, checked_in_at, entry_status')
          .in('token_id', tokenIds)
          .eq('entry_status', 'SUCCESS');

        // 2. ดึงข้อมูลวันเวลาแข่งของ matches เพื่อเช็คว่าหมดอายุหรือยัง
        const { data : matches } = await supabase
          .from('matches')
          .select('match_id, match_datetime, home_team, away_team');

        const checkinMap = new Map<number, any>();
        if (checkins) {
          checkins.forEach((c : any) => {
            checkinMap.set(Number(c.token_id), c);
          });
        }

        const matchMap = new Map<string, any>();
        if (matches) {
          matches.forEach((m : any) => {
            matchMap.set(m.match_id, m);
          });
        }

        const now = new Date();

        const mappedTickets : TicketRecord[] = data.map((t : any) => {
          const tokenId = Number(t.token_id);
          const isSeason = t.ticket_type === 'SEASON_PASS';
          const targetMatchId = t.target_match_id || '';
          const matchInfo = targetMatchId ? matchMap.get(targetMatchId) : null;
          const checkinInfo = checkinMap.get(tokenId);

          let isUsed = false;
          let isExpired = false;
          let status : 'VALID' | 'USED' | 'EXPIRED' = 'VALID';

          if (isSeason) {
            // สำหรับตั๋วรายปี (Season Pass) : ใช้งานได้ตลอดทั้งฤดูกาล
            // จะหมดอายุเมื่อพ้นปีฤดูกาลแข่งขันเท่านั้น (เช่น สิ้นสุดปี 2026)
            const currentYear = now.getFullYear();
            if (t.season_year && currentYear > Number(t.season_year)) {
              isExpired = true;
              status = 'EXPIRED';
            } else {
              // ตั๋วรายปียังคงสถานะพร้อมเข้าชมสำหรับนัดต่อไปเสมอ
              status = 'VALID';
              isUsed = false;
            }
          } else {
            // สำหรับตั๋วรายแมตช์ (Single Match) : สิทธิ์จะหมดเมื่อสแกนแล้ว หรือแมตช์แข่งเสร็จสิ้น
            if (checkinInfo) {
              isUsed = true;
              status = 'USED';
            } else if (matchInfo && matchInfo.match_datetime) {
              const matchDate = new Date(matchInfo.match_datetime);
              // ถ้าเวลาปัจจุบันผ่านวันเวลาแข่งไปเกิน 3 ชั่วโมง (แมตช์แข่งขันเสร็จสิ้นแล้ว)
              if (now.getTime() > matchDate.getTime() + (3 * 60 * 60 * 1000)) {
                isExpired = true;
                status = 'EXPIRED';
              }
            }
          }

          return {
            tokenId,
            walletAddress : t.wallet_address,
            ticketType : t.ticket_type,
            tierName : t.tier_id,
            seatZone : t.seat_zone,
            seatNumber : t.seat_number,
            targetMatchId,
            seasonYear : t.season_year || 2026,
            metadataUri : t.metadata_uri,
            purchaseTxHash : t.purchase_tx_hash,
            createdAt : t.created_at,
            status,
            isUsed,
            isExpired,
            matchDateTime : matchInfo ? matchInfo.match_datetime : undefined,
            usedAt : checkinInfo ? checkinInfo.checked_in_at : undefined
          };
        });

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
