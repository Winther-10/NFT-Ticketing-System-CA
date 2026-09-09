import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../database/supabase';

export async function POST(req : NextRequest) {
  try {
    const body = await req.json();
    const { tokenId, matchId, gateStaffAddress, entryStatus, rejectionReason, blockchainTxHash, signedPayload } = body;

    const supabase = getSupabaseAdmin();
    if (supabase && tokenId) {
      const { data, error } = await supabase.from('checkin_logs').insert([
        {
          token_id : Number(tokenId),
          match_id : matchId || 'BRU-vs-MU-2026',
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
