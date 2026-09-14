import { describe, it, expect } from 'vitest';
import { ethers } from 'ethers';
import { ScannerService } from '../../src/services/scanner.service';

describe('ScannerService - Anti-Screenshot & Dynamic QR Verification', () => {
  it('ต้องผ่านการตรวจสอบเมื่อมี Dynamic QR ที่ถูกต้องและเวลาไม่เกินกำหนด (Valid QR)', async () => {
    // 1. จำลอง Wallet เจ้าของตั๋ว
    const wallet = ethers.Wallet.createRandom();
    const ownerAddress = await wallet.getAddress();
    const tokenId = 101;
    const now = Math.floor(Date.now() / 1000);

    const messageObj = {
      tokenId,
      owner : ownerAddress.toLowerCase(),
      timestamp : now
    };
    const messageString = JSON.stringify(messageObj);

    // 2. เซ็นข้อความแบบ EIP-191
    const signature = await wallet.signMessage(messageString);

    // 3. แพ็กลง Dynamic QR Payload
    const qrPayload = JSON.stringify({
      data : messageString,
      signature
    });

    // 4. ทดสอบ Verify
    const result = ScannerService.verifyQRPayload(qrPayload, 60);

    expect(result.isValid).toBe(true);
    expect(result.tokenId).toBe(101);
    expect(result.owner.toLowerCase()).toBe(ownerAddress.toLowerCase());
    expect(result.signerAddress.toLowerCase()).toBe(ownerAddress.toLowerCase());
    expect(result.ageInSeconds).toBeLessThanOrEqual(5);
  });

  it('ต้องปฏิเสธทันทีเมื่อ QR Code มีอายุเกิน 60 วินาที เพื่อป้องกันการแคปจอ (Anti-Screenshot Protection)', async () => {
    const wallet = ethers.Wallet.createRandom();
    const ownerAddress = await wallet.getAddress();
    const tokenId = 102;
    // เวลาเมื่อ 120 วินาทีที่แล้ว (เกิน TTL 60 วินาที)
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 120;

    const messageObj = {
      tokenId,
      owner : ownerAddress.toLowerCase(),
      timestamp : expiredTimestamp
    };
    const messageString = JSON.stringify(messageObj);
    const signature = await wallet.signMessage(messageString);

    const qrPayload = JSON.stringify({
      data : messageString,
      signature
    });

    const result = ScannerService.verifyQRPayload(qrPayload, 60);

    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('QR Code หมดอายุ');
  });

  it('ต้องปฏิเสธเมื่อลายเซ็นไม่ตรงกับเจ้าของ Wallet (Impersonation / Fraud Alert)', async () => {
    const realOwnerWallet = ethers.Wallet.createRandom();
    const realOwnerAddress = await realOwnerWallet.getAddress();

    const impostorWallet = ethers.Wallet.createRandom(); // คนอื่นแอบเซ็นแทน
    const tokenId = 103;
    const now = Math.floor(Date.now() / 1000);

    const messageObj = {
      tokenId,
      owner : realOwnerAddress.toLowerCase(), // อ้างว่าเป็นของ realOwner
      timestamp : now
    };
    const messageString = JSON.stringify(messageObj);
    // แต่ใช้กุญแจของ impostorWallet เซ็น
    const forgedSignature = await impostorWallet.signMessage(messageString);

    const qrPayload = JSON.stringify({
      data : messageString,
      signature : forgedSignature
    });

    const result = ScannerService.verifyQRPayload(qrPayload, 60);

    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('ตรวจพบการแอบอ้างสิทธิ์');
  });

  it('ต้องรับมือกับข้อมูลที่เสียหาย (Corrupted / Malformed Payload) ได้อย่างปลอดภัย', () => {
    const corruptedResult = ScannerService.verifyQRPayload('invalid json string', 60);
    expect(corruptedResult.isValid).toBe(false);
    expect(corruptedResult.errorMessage).toBeDefined();

    const emptyDataResult = ScannerService.verifyQRPayload(JSON.stringify({}), 60);
    expect(emptyDataResult.isValid).toBe(false);
    expect(emptyDataResult.errorMessage).toContain('ขาดข้อมูล');
  });

  it('ต้องผ่านการตรวจสอบเมื่อใช้ Instant Sign Mode สำหรับการนำเสนอและการทดสอบด่วน', async () => {
    const realOwner = '0x4789e4bfa1ef3f9f4866cfd729b409458410fcaf';
    const localSigner = ethers.Wallet.createRandom();
    const now = Math.floor(Date.now() / 1000);

    const messageObj = {
      tokenId : 999,
      owner : realOwner.toLowerCase(),
      timestamp : now,
      instantMode : true
    };
    const messageString = JSON.stringify(messageObj);
    const signature = await localSigner.signMessage(messageString);

    const qrPayload = JSON.stringify({
      data : messageString,
      signature
    });

    const result = ScannerService.verifyQRPayload(qrPayload, 60);

    expect(result.isValid).toBe(true);
    expect(result.tokenId).toBe(999);
    expect(result.owner.toLowerCase()).toBe(realOwner.toLowerCase());
  });
});
