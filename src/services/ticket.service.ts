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
    matchId? : string,
    instantMode? : boolean
  ) : string {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = {
      tokenId,
      owner : ownerAddress.toLowerCase(),
      timestamp,
      ...(matchId ? { matchId } : {}),
      ...(instantMode ? { instantMode : true } : {})
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
   * บันทึกข้อมูลตั๋วที่เพิ่งซื้อใหม่ลงฐานข้อมูล Supabase (PostgreSQL) ผ่าน Server API และ LocalStorage
   */
  public static async savePurchasedTicket(
    ticket : TicketRecord,
    tierId? : string
  ) : Promise<TicketRecord> {
    const normWallet = ticket.walletAddress.toLowerCase();

    // 1. ส่งข้อมูลไปยัง Server API เพื่อบันทึกลงตาราง users และ tickets ใน Supabase จริง
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/tickets', {
          method : 'POST',
          headers : { 'Content-Type' : 'application/json' },
          body : JSON.stringify({
            tokenId : ticket.tokenId,
            walletAddress : normWallet,
            ticketType : ticket.ticketType,
            tierId : tierId || ticket.tierName,
            tierName : ticket.tierName,
            matchId : ticket.targetMatchId,
            seatZone : ticket.seatZone,
            seatNumber : ticket.seatNumber,
            seasonYear : ticket.seasonYear || 2026,
            metadataUri : ticket.metadataUri || 'ipfs://chang-arena-ticket',
            purchaseTxHash : ticket.purchaseTxHash || ''
          })
        });
      } catch (err) {
        console.warn('API /api/tickets call warning : ', err);
      }
    }

    // 2. บันทึกลงใน LocalStorage เสมอ เพื่อให้การทดสอบในเครื่องจดจำข้อมูลตั๋วที่ซื้อจริง
    if (typeof window !== 'undefined') {
      try {
        const storageKey = 'chang_arena_tickets_' + normWallet;
        const existingRaw = localStorage.getItem(storageKey);
        const existing : TicketRecord[] = existingRaw ? JSON.parse(existingRaw) : [];
        const updated = [ticket, ...existing.filter((t) => t.tokenId !== ticket.tokenId)];
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.error('LocalStorage save error : ', e);
      }
    }

    return ticket;
  }

  /**
   * ดึงรายการตั๋วทั้งหมดของ Wallet Address จากฐานข้อมูลจริง Supabase PostgreSQL
   */
  public static async getTicketsByWallet(
    walletAddress : string
  ) : Promise<TicketRecord[]> {
    if (!walletAddress) return [];

    const normAddr = walletAddress.toLowerCase();
    let tickets : TicketRecord[] = [];

    // 1. อ่านจาก Server API (/api/tickets) ซึ่งดึงจากตาราง tickets ใน Supabase จริง
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/tickets?wallet=${normAddr}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            return json.data;
          }
        }
      } catch (err) {
        console.warn('API /api/tickets fetch warning : ', err);
      }
    }

    // 2. กรณีออฟไลน์หรือเรียก API ไม่สำเร็จ ให้อ่านจาก LocalStorage เฉพาะตั๋วที่บันทึกไว้จริง
    if (typeof window !== 'undefined') {
      try {
        const storageKey = 'chang_arena_tickets_' + normAddr;
        const storedRaw = localStorage.getItem(storageKey);
        if (storedRaw) {
          const stored : TicketRecord[] = JSON.parse(storedRaw);
          if (Array.isArray(stored)) {
            return stored;
          }
        }
      } catch (e) {
        console.error('LocalStorage read error : ', e);
      }
    }

    // ส่งคืนรายการจริงเท่านั้น (หากไม่มีตั๋วให้ส่งอาร์เรย์ว่าง ไม่ใส่ mock up)
    return tickets;
  }
}
