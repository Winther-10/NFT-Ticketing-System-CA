import { ethers } from 'ethers';
import { getSupabaseClient } from '../../database/supabase';

export interface TicketRecord {
  tokenId : number;
  walletAddress : string;
  ticketType : 'SINGLE_MATCH' | 'SEASON_PASS';
  tierName : string;
  seatZone : string;
  seatNumber : string;
  targetMatchId? : string;
  seasonYear? : number;
  metadataUri? : string;
  purchaseTxHash? : string;
  createdAt? : string;
}

/**
 * Service สำหรับจัดการตั๋วเข้าชม การสร้างข้อความเพื่อ Sign Dynamic QR และ Idempotent Operations
 */
export class TicketService {
  /**
   * สร้าง Payload String สำหรับเตรียมส่งให้ MetaMask ทำการ SignMessage
   */
  public static createSigningMessage(
    tokenId : number,
    ownerAddress : string,
    matchId? : string
  ) : string {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = {
      tokenId,
      owner : ownerAddress.toLowerCase(),
      timestamp,
      ...(matchId ? { matchId } : {})
    };
    return JSON.stringify(payload);
  }

  /**
   * ร้องขอให้ผู้ถือบัตรเซ็นชื่อบน Payload ด้วย EIP-191 ผ่าน MetaMask
   */
  public static async signDynamicQRPayload(
    message : string,
    signer : ethers.Signer
  ) : Promise<{ qrString : string; signature : string }> {
    const signature = await signer.signMessage(message);
    const fullPayload = JSON.stringify({
      data : message,
      signature
    });

    return {
      qrString : fullPayload,
      signature
    };
  }

  /**
   * ตรวจสอบ Idempotency Key ในฐานข้อมูล เพื่อป้องกันการทำธุรกรรมซ้ำซ้อน
   */
  public static async checkIdempotency(
    key : string
  ) : Promise<{ exists : boolean; isCompleted : boolean; response? : any }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      // โหมด In-Memory / Local Fallback หากยังไม่ได้ผูก Supabase
      return { exists : false, isCompleted : false };
    }

    const { data, error } = await supabase
      .from('idempotency_keys')
      .select('status, response_payload, expires_at')
      .eq('key', key)
      .single();

    if (error || !data) {
      return { exists : false, isCompleted : false };
    }

    return {
      exists : true,
      isCompleted : data.status === 'COMPLETED',
      response : data.response_payload
    };
  }

  /**
   * บันทึกการเริ่มต้นประมวลผล Idempotency Key
   */
  public static async recordIdempotencyStart(
    key : string,
    requestPath : string,
    walletAddress? : string,
    ttlSeconds = 300
  ) : Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return true;

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const { error } = await supabase.from('idempotency_keys').insert([
      {
        key,
        request_path : requestPath,
        wallet_address : walletAddress,
        status : 'PROCESSING',
        expires_at : expiresAt
      }
    ]);

    return !error;
  }

  /**
   * อัปเดตผลลัพธ์ของ Idempotency Key เมื่อทำธุรกรรมสำเร็จ
   */
  public static async completeIdempotency(
    key : string,
    responsePayload : any
  ) : Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    await supabase
      .from('idempotency_keys')
      .update({
        status : 'COMPLETED',
        response_payload : responsePayload
      })
      .eq('key', key);
  }

  /**
   * ดึงรายการตั๋วทั้งหมดของ Wallet Address จาก Supabase หรือ Mock Local Data
   */
  public static async getTicketsByWallet(
    walletAddress : string
  ) : Promise<TicketRecord[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase());

      if (!error && data && data.length > 0) {
        return data.map((t : any) => ({
          tokenId : t.token_id,
          walletAddress : t.wallet_address,
          ticketType : t.ticket_type,
          tierName : t.tier_id,
          seatZone : t.seat_zone,
          seatNumber : t.seat_number,
          targetMatchId : t.target_match_id,
          seasonYear : t.season_year,
          metadataUri : t.metadata_uri,
          purchaseTxHash : t.purchase_tx_hash,
          createdAt : t.created_at
        }));
      }
    }

    // Default Demo Tickets ประจำสนามช้างอารีนา เพื่อความพร้อมในการทดสอบระบบทันที
    return [
      {
        tokenId : 1,
        walletAddress : walletAddress.toLowerCase(),
        ticketType : 'SINGLE_MATCH',
        tierName : 'East Stand A10 Premium',
        seatZone : 'A10',
        seatNumber : 'Seat-14',
        targetMatchId : 'BRU-vs-MU-2026',
        createdAt : new Date().toISOString()
      },
      {
        tokenId : 2,
        walletAddress : walletAddress.toLowerCase(),
        ticketType : 'SEASON_PASS',
        tierName : 'Platinum VIP Pass (Fast Lane)',
        seatZone : 'VIP-Lounge',
        seatNumber : 'VIP-08',
        seasonYear : 2026,
        createdAt : new Date().toISOString()
      }
    ];
  }
}
