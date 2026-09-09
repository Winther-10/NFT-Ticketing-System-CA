import { NextRequest, NextResponse } from 'next/server';
import { ScannerService } from '../../../services/scanner.service';
import { getSupabaseClient } from '../../../../database/supabase';

export async function POST(req : NextRequest) {
  try {
    const body = await req.json();
    const { qrPayload, matchId, gateStaffAddress } = body;

    if (!qrPayload) {
      return NextResponse.json(
        { success : false, error : 'ไม่พบข้อมูล qrPayload' },
        { status : 400 }
      );
    }

    // เรียกใช้ ScannerService ตามหลัก Separation of Concerns (SoC)
    const verification = ScannerService.verifyQRPayload(qrPayload, 60);

    if (!verification.isValid) {
      // บันทึก Log การปฏิเสธลงใน Supabase
      const supabase = getSupabaseClient();
      if (supabase && verification.tokenId) {
        await supabase.from('checkin_logs').insert([
          {
            token_id : verification.tokenId,
            match_id : matchId || 'UNKNOWN',
            gate_staff_address : gateStaffAddress || '0x0000000000000000000000000000000000000000',
            entry_status : 'REJECTED',
            rejection_reason : verification.errorMessage,
            signed_payload : qrPayload
          }
        ]);
      }

      return NextResponse.json(
        {
          success : false,
          error : verification.errorMessage,
          details : verification
        },
        { status : 422 }
      );
    }

    // บันทึก Log การผ่านสิทธิ์เข้าสนามลงใน Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('checkin_logs').insert([
        {
          token_id : verification.tokenId,
          match_id : matchId || 'UNKNOWN',
          gate_staff_address : gateStaffAddress || '0x0000000000000000000000000000000000000000',
          entry_status : 'SUCCESS',
          signed_payload : qrPayload
        }
      ]);
    }

    return NextResponse.json({
      success : true,
      message : 'ยืนยันสิทธิ์เข้าชมสนามสำเร็จ',
      data : {
        tokenId : verification.tokenId,
        owner : verification.owner,
        signerAddress : verification.signerAddress,
        ageInSeconds : verification.ageInSeconds
      }
    });
  } catch (err : any) {
    return NextResponse.json(
      { success : false, error : err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status : 500 }
    );
  }
}
