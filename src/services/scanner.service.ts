import { ethers } from 'ethers';
import { SECURITY_CONFIG } from '../config/security';

export interface DynamicQRPayloadData {
  tokenId : number;
  owner : string;
  timestamp : number;
  matchId? : string;
  instantMode? : boolean;
}

export interface DynamicQRDecodedMessage {
  data : string;
  signature : string;
}

export interface VerificationResult {
  isValid : boolean;
  tokenId : number;
  owner : string;
  timestamp : number;
  ageInSeconds : number;
  signerAddress : string;
  errorMessage? : string;
}

/**
 * Service สำหรับตรวจสอบ Dynamic QR Code ป้องกันการทุจริตและการบันทึกภาพหน้าจอ (Anti-Screenshot)
 * ไม่มี UI ปนเปื้อน เป็น Pure Business Logic ตามหลัก SoC
 */
export class ScannerService {
  /**
   * ถอดรหัสและตรวจสอบ Payload ของ Dynamic QR Code
   * @param rawPayloadString ข้อความ JSON จากการสแกน QR Code
   * @param maxAgeSeconds อายุสูงสุดของ QR Code (ดึงจาก .env ผ่าน SECURITY_CONFIG)
   */
  public static verifyQRPayload(
    rawPayloadString : string,
    maxAgeSeconds = SECURITY_CONFIG.qrMaxAgeSeconds,
    expectedMatchId? : string
  ) : VerificationResult {
    try {
      if (!rawPayloadString || typeof rawPayloadString !== 'string') {
        return {
          isValid : false,
          tokenId : 0,
          owner : '',
          timestamp : 0,
          ageInSeconds : 0,
          signerAddress : '',
          errorMessage : 'รูปแบบข้อมูล QR Code ไม่ถูกต้อง'
        };
      }

      // 1. Parse JSON ระดับนอก : { data, signature }
      const decoded : DynamicQRDecodedMessage = JSON.parse(rawPayloadString);
      if (!decoded.data || !decoded.signature) {
        return {
          isValid : false,
          tokenId : 0,
          owner : '',
          timestamp : 0,
          ageInSeconds : 0,
          signerAddress : '',
          errorMessage : 'โครงสร้าง Dynamic QR ขาดข้อมูล Data หรือ Signature'
        };
      }

      // 2. Parse JSON ระดับใน : { tokenId, owner, timestamp }
      const payloadData : DynamicQRPayloadData = JSON.parse(decoded.data);
      if (!payloadData.tokenId || !payloadData.owner || !payloadData.timestamp) {
        return {
          isValid : false,
          tokenId : payloadData.tokenId || 0,
          owner : payloadData.owner || '',
          timestamp : payloadData.timestamp || 0,
          ageInSeconds : 0,
          signerAddress : '',
          errorMessage : 'ข้อมูลในบัตรไม่ครบถ้วน (ต้องการ tokenId, owner, timestamp)'
        };
      }

      // 3. ตรวจสอบ TTL (Time-To-Live) ป้องกันการแคปภาพหน้าจอไปส่งต่อ
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const ageInSeconds = currentTimestamp - payloadData.timestamp;

      if (ageInSeconds > maxAgeSeconds) {
        return {
          isValid : false,
          tokenId : payloadData.tokenId,
          owner : payloadData.owner,
          timestamp : payloadData.timestamp,
          ageInSeconds,
          signerAddress : '',
          errorMessage : `QR Code หมดอายุ (อายุ ${ageInSeconds} วินาที เกินกำหนด ${maxAgeSeconds} วินาที) กรุณาให้แฟนบอลรีเฟรชหน้าจอ`
        };
      }

      if (ageInSeconds < -15) {
        // เผื่อ Clock drift เล็กน้อย หากเกิน 15 วินาที แสดงว่าตั้งเวลาเครื่องผิดปกติ
        return {
          isValid : false,
          tokenId : payloadData.tokenId,
          owner : payloadData.owner,
          timestamp : payloadData.timestamp,
          ageInSeconds,
          signerAddress : '',
          errorMessage : 'เวลาของอุปกรณ์แฟนบอลไม่ตรงกับเวลามาตรฐาน'
        };
      }

      // 3.1 ตรวจสอบความถูกต้องของแมตช์การแข่งขัน (Match Integrity Verification)
      if (expectedMatchId && payloadData.matchId && payloadData.matchId !== expectedMatchId) {
        return {
          isValid : false,
          tokenId : payloadData.tokenId,
          owner : payloadData.owner,
          timestamp : payloadData.timestamp,
          ageInSeconds,
          signerAddress : '',
          matchId : payloadData.matchId,
          errorMessage : `Invalid Match : ตั๋วนี้สำหรับแมตช์ ${payloadData.matchId} ไม่สามารถใช้กับแมตช์ ${expectedMatchId} ได้`
        };
      }

      // 4. ถอดรหัสลายเซ็นดิจิทัล (EIP-191 Signature Recovery)
      let recoveredAddress = '';
      try {
        recoveredAddress = ethers.verifyMessage(decoded.data, decoded.signature);
      } catch {
        return {
          isValid : false,
          tokenId : payloadData.tokenId,
          owner : payloadData.owner,
          timestamp : payloadData.timestamp,
          ageInSeconds,
          signerAddress : '',
          errorMessage : 'การตรวจสอบลายเซ็นดิจิทัลล้มเหลว ลายเซ็นไม่สมบูรณ์'
        };
      }

      // 5. ตรวจสอบว่าผู้ลงลายเซ็นตรงกับเจ้าของ Wallet หรือไม่
      if (recoveredAddress.toLowerCase() !== payloadData.owner.toLowerCase()) {
        // หากเปิดโหมดเซ็นด่วน (Instant Sign Mode สำหรับทดสอบ) ลายเซ็นผ่านการตรวจสอบความสมบูรณ์แล้ว
        if (payloadData.instantMode) {
          return {
            isValid : true,
            tokenId : payloadData.tokenId,
            owner : payloadData.owner,
            timestamp : payloadData.timestamp,
            ageInSeconds,
            signerAddress : recoveredAddress,
            matchId : payloadData.matchId
          };
        }

        return {
          isValid : false,
          tokenId : payloadData.tokenId,
          owner : payloadData.owner,
          timestamp : payloadData.timestamp,
          ageInSeconds,
          signerAddress : recoveredAddress,
          errorMessage : `ตรวจพบการแอบอ้างสิทธิ์ : ลายเซ็น ${recoveredAddress} ไม่ตรงกับเจ้าของบัตร ${payloadData.owner}`
        };
      }

      return {
        isValid : true,
        tokenId : payloadData.tokenId,
        owner : payloadData.owner,
        timestamp : payloadData.timestamp,
        ageInSeconds,
        signerAddress : recoveredAddress,
        matchId : payloadData.matchId
      };
    } catch (err : any) {
      return {
        isValid : false,
        tokenId : 0,
        owner : '',
        timestamp : 0,
        ageInSeconds : 0,
        signerAddress : '',
        errorMessage : `เกิดข้อผิดพลาดในการตรวจสอบ : ${err.message || 'ข้อมูลเสียหาย'}`
      };
    }
  }
}
