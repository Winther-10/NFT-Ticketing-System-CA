import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../database/supabase';

export async function POST(req : NextRequest) {
  try {
    const body = await req.json();
    const { tokenId, matchId, gateStaffAddress, entryStatus, rejectionReason, blockchainTxHash, signedPayload } = body;

    const supabase = getSupabaseAdmin();
    if (supabase && tokenId) {
      const targetMatch = matchId || 'BRU-vs-MU-2026';

      // 1. ตรวจสอบการใช้ซ้ำ (Anti-Duplicate / Anti-Double-Entry Protection)
      const { data : existingCheckin } = await supabase
        .from('checkin_logs')
        .select('id, token_id, checked_in_at')
        .eq('token_id', Number(tokenId))
        .eq('match_id', targetMatch)
        .eq('entry_status', 'SUCCESS')
        .maybeSingle();

      if (existingCheckin) {
        // บันทึก Log การสกัดกั้นการใช้ตั๋วซ้ำ (Security Interception Audit Log)
        const { data : insData, error : insErr } = await supabase.from('checkin_logs').insert([
          {
            token_id : Number(tokenId),
            match_id : targetMatch,
            gate_staff_address : (gateStaffAddress || '0x4789e4bfa1ef3f9f4866cfd729b409458410fcaf').toLowerCase(),
            entry_status : 'FAILED',
            rejection_reason : 'Fraud Alert : ตั๋วนี้ถูกสแกนผ่านประตูไปแล้ว (ห้ามใช้ซ้ำ)',
            blockchain_tx_hash : blockchainTxHash || '',
            signed_payload : signedPayload || 'DUPLICATE_ENTRY_ATTEMPT',
            checked_in_at : new Date().toISOString()
          }
        ]);

        return NextResponse.json(
          {
            success : false,
            duplicate : true,
            error : 'Fraud Alert : ตั๋วนี้ถูกสแกนผ่านประตูไปแล้ว (ห้ามใช้ซ้ำ)'
          },
          { status : 409 }
        );
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
