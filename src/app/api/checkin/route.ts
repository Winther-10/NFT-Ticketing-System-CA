import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../database/supabase';

export async function POST(req : NextRequest) {
  try {
    const body = await req.json();
    const { tokenId, matchId, gateStaffAddress, entryStatus, rejectionReason, blockchainTxHash, signedPayload } = body;

    const supabase = getSupabaseAdmin();
    if (supabase && tokenId) {
      const targetMatch = matchId || 'BRU-vs-MU-2026';

      // 1. ดึงข้อมูลตั๋วเพื่อตรวจสอบประเภทตั๋ว (SINGLE_MATCH หรือ SEASON_PASS) และ Match ID
      const { data : ticketData } = await supabase
        .from('tickets')
        .select('ticket_type, target_match_id, season_year')
        .eq('token_id', Number(tokenId))
        .maybeSingle();

      if (ticketData) {
        // กรณีตั๋วรายแมตช์ (SINGLE_MATCH)
        if (ticketData.ticket_type === 'SINGLE_MATCH') {
          // ตรวจสอบว่าตั๋วตรงกับแมตช์ที่กำลังสแกนเข้าชมหรือไม่
          if (ticketData.target_match_id && ticketData.target_match_id !== targetMatch) {
            await supabase.from('checkin_logs').insert([
              {
                token_id : Number(tokenId),
                match_id : targetMatch,
                gate_staff_address : (gateStaffAddress || '0x4789e4bfa1ef3f9f4866cfd729b409458410fcaf').toLowerCase(),
                entry_status : 'FAILED',
                rejection_reason : `Invalid Match : ตั๋วนี้สำหรับแมตช์ ${ticketData.target_match_id} ไม่สามารถใช้กับแมตช์ ${targetMatch} ได้`,
                blockchain_tx_hash : blockchainTxHash || '',
                signed_payload : signedPayload || 'INVALID_MATCH_ATTEMPT',
                checked_in_at : new Date().toISOString()
              }
            ]);

            return NextResponse.json(
              {
                success : false,
                invalidMatch : true,
                error : `Invalid Match : ตั๋วนี้สำหรับแมตช์ ${ticketData.target_match_id} ไม่สามารถใช้กับแมตช์ ${targetMatch} ได้`
              },
              { status : 400 }
            );
          }

          // ตรวจสอบว่าตั๋วรายแมตช์ใบนี้เคยสแกนเข้าประตูไปแล้วหรือไม่
          const { data : usedSingle } = await supabase
            .from('checkin_logs')
            .select('id, match_id, checked_in_at')
            .eq('token_id', Number(tokenId))
            .eq('entry_status', 'SUCCESS')
            .maybeSingle();

          if (usedSingle) {
            await supabase.from('checkin_logs').insert([
              {
                token_id : Number(tokenId),
                match_id : targetMatch,
                gate_staff_address : (gateStaffAddress || '0x4789e4bfa1ef3f9f4866cfd729b409458410fcaf').toLowerCase(),
                entry_status : 'FAILED',
                rejection_reason : 'Fraud Alert : ตั๋วรายแมตช์นี้ถูกสแกนผ่านประตูไปแล้ว (ห้ามใช้ซ้ำ)',
                blockchain_tx_hash : blockchainTxHash || '',
                signed_payload : signedPayload || 'DUPLICATE_ENTRY_ATTEMPT',
                checked_in_at : new Date().toISOString()
              }
            ]);

            return NextResponse.json(
              {
                success : false,
                duplicate : true,
                error : 'Fraud Alert : ตั๋วรายแมตช์นี้ถูกสแกนผ่านประตูไปแล้ว (ห้ามใช้ซ้ำ)'
              },
              { status : 409 }
            );
          }
        } else if (ticketData.ticket_type === 'SEASON_PASS') {
          // กรณีตั๋วรายปี (SEASON_PASS) : ตรวจสอบว่าในแมตช์นี้เคยสแกนไปแล้วหรือยัง (ห้ามเข้าซ้ำในนัดเดียวกัน)
          const { data : existingSeasonCheckin } = await supabase
            .from('checkin_logs')
            .select('id, token_id, checked_in_at')
            .eq('token_id', Number(tokenId))
            .eq('match_id', targetMatch)
            .eq('entry_status', 'SUCCESS')
            .maybeSingle();

          if (existingSeasonCheckin) {
            await supabase.from('checkin_logs').insert([
              {
                token_id : Number(tokenId),
                match_id : targetMatch,
                gate_staff_address : (gateStaffAddress || '0x4789e4bfa1ef3f9f4866cfd729b409458410fcaf').toLowerCase(),
                entry_status : 'FAILED',
                rejection_reason : `Fraud Alert : ตั๋วรายปีใบนี้สแกนเข้าชมแมตช์ ${targetMatch} ไปแล้ว (ห้ามเข้าซ้ำในแมตช์เดียวกัน)`,
                blockchain_tx_hash : blockchainTxHash || '',
                signed_payload : signedPayload || 'DUPLICATE_SEASON_ATTEMPT',
                checked_in_at : new Date().toISOString()
              }
            ]);

            return NextResponse.json(
              {
                success : false,
                duplicate : true,
                error : `Fraud Alert : ตั๋วรายปีใบนี้สแกนเข้าชมแมตช์ ${targetMatch} ไปแล้ว (ห้ามเข้าซ้ำในแมตช์เดียวกัน)`
              },
              { status : 409 }
            );
          }
        }
      }

      // 2. ถ้ายังไม่เคยใช้ ให้บันทึกการผ่านประตูสำเร็จ
      const { data, error } = await supabase.from('checkin_logs').insert([
        {
          token_id : Number(tokenId),
          match_id : targetMatch,
          gate_staff_address : (gateStaffAddress || '0x4789e4bfa1ef3f9f4866cfd729b409458410fcaf').toLowerCase(),
          entry_status : entryStatus || 'SUCCESS',
          rejection_reason : rejectionReason || null,
          blockchain_tx_hash : blockchainTxHash || '',
          signed_payload : signedPayload || 'DYNAMIC_QR_VERIFIED',
          checked_in_at : new Date().toISOString()
        }
      ]).select().single();

      if (error) {
        console.warn('Check-in log insert warning : ', error);
      } else {
        return NextResponse.json({ success : true, data });
      }
    }

    return NextResponse.json({ success : true, message : 'Check-in processed' });
  } catch (err : any) {
    return NextResponse.json({ success : false, error : err.message }, { status : 500 });
  }
}

export async function DELETE(req : NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success : false, error : 'Database connection error' }, { status : 500 });
    }

    const { searchParams } = new URL(req.url);
    const tokenId = searchParams.get('tokenId');

    if (tokenId) {
      await supabase.from('checkin_logs').delete().eq('token_id', Number(tokenId));
    } else {
      // ลบ Log การสแกนสำหรับการทดสอบ (Token 1, 2, 3, 4)
      await supabase.from('checkin_logs').delete().in('token_id', [1, 2, 3, 4]);
    }

    return NextResponse.json({ success : true, message : 'รีเซ็ตข้อมูลการสแกนทดสอบเรียบร้อยแล้ว' });
  } catch (err : any) {
    return NextResponse.json({ success : false, error : err.message }, { status : 500 });
  }
}

