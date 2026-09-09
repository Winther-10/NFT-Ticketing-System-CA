import { describe, it, expect } from 'vitest';
import { ethers } from 'ethers';
import { TicketService } from '../../src/services/ticket.service';

describe('TicketService - Business Logic & Idempotency', () => {
  it('ต้องสร้าง Payload สำหรับการลงลายเซ็นที่ถูกต้องตามมาตรฐาน (createSigningMessage)', () => {
    const ownerAddress = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
    const tokenId = 55;
    const matchId = 'BRU-vs-MU-2026';

    const messageString = TicketService.createSigningMessage(tokenId, ownerAddress, matchId);
    expect(typeof messageString).toBe('string');

    const parsed = JSON.parse(messageString);
    expect(parsed.tokenId).toBe(55);
    expect(parsed.owner).toBe(ownerAddress.toLowerCase());
    expect(parsed.matchId).toBe(matchId);
    expect(parsed.timestamp).toBeGreaterThan(0);
  });

  it('ต้องลงลายเซ็นดิจิทัลสำเร็จและสร้าง QR Payload ได้อย่างสมบูรณ์ (signDynamicQRPayload)', async () => {
    const wallet = ethers.Wallet.createRandom();
    const ownerAddress = await wallet.getAddress();
    const message = TicketService.createSigningMessage(12, ownerAddress);

    const result = await TicketService.signDynamicQRPayload(message, wallet);

    expect(result.qrString).toBeDefined();
    expect(result.signature).toBeDefined();
    expect(result.signature.startsWith('0x')).toBe(true);

    const parsedQR = JSON.parse(result.qrString);
    expect(parsedQR.data).toBe(message);
    expect(parsedQR.signature).toBe(result.signature);
  });

  it('ต้องส่งคืนอาร์เรย์ว่างสำหรับกระเป๋าใหม่ที่ยังไม่มีตั๋วจริง โดยไม่มีข้อมูลจำลอง (getTicketsByWallet)', async () => {
    const freshWalletAddress = '0x1111111111111111111111111111111111111111';
    const tickets = await TicketService.getTicketsByWallet(freshWalletAddress);

    expect(Array.isArray(tickets)).toBe(true);
    expect(tickets.length).toBe(0);

    const emptyWalletTickets = await TicketService.getTicketsByWallet('');
    expect(emptyWalletTickets).toEqual([]);
  });

  it('ต้องตรวจสอบ Idempotency Key ได้อย่างถูกต้องเมื่อยังไม่เคยบันทึก', async () => {
    const testKey = 'test-idempotency-key-' + Date.now();
    const check = await TicketService.checkIdempotency(testKey);

    expect(check.exists).toBe(false);
    expect(check.isCompleted).toBe(false);
  });
});
