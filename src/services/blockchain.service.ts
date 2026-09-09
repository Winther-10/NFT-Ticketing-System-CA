import { ethers } from 'ethers';
import {
  CHANG_ARENA_ABI,
  CHANG_ARENA_CONTRACT_ADDRESS,
  POLYGON_AMOY_CONFIG
} from '../config/contracts';

export interface OnChainTicketData {
  tokenId : number;
  owner : string;
  ticketType : number; // 0 = SINGLE_MATCH, 1 = SEASON_PASS
  tierName : string;
  seatZone : string;
  seatNumber : string;
  targetMatchId : string;
  seasonYear : number;
  isUsedSingle : boolean;
  isMatchUsed? : boolean;
}

/**
 * Service สำหรับติดต่อกับ Smart Contract บนบล็อกเชน Polygon Amoy
 * แยกการเชื่อมต่อและการแปลงข้อมูลให้ออกจาก UI Components อย่างสมบูรณ์
 */
export class BlockchainService {
  /**
   * ดึง Browser Web3 Provider จากกระเป๋า MetaMask
   */
  public static async getBrowserProvider() : Promise<ethers.BrowserProvider> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('ไม่พบ MetaMask กรุณาติดตั้ง Extension ในเบราว์เซอร์');
    }
    return new ethers.BrowserProvider((window as any).ethereum);
  }

  /**
   * ดึง Default Read-only Provider (JSON-RPC) สำหรับกรณีไม่ได้ต่อ MetaMask
   */
  public static getReadOnlyProvider() : ethers.JsonRpcProvider {
    return new ethers.JsonRpcProvider(POLYGON_AMOY_CONFIG.rpcUrl);
  }

  /**
   * บังคับสลับเครือข่ายไปยัง Ethereum Sepolia Testnet อัตโนมัติ เพื่อป้องกันการเสียเงินจริงบน Mainnet
   */
  public static async ensureSepoliaNetwork() : Promise<void> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('ไม่พบ MetaMask กรุณาติดตั้ง Extension ในเบราว์เซอร์');
    }

    const targetChainIdHex = '0x' + POLYGON_AMOY_CONFIG.chainId.toString(16);
    try {
      // ตรวจสอบ Chain ID ปัจจุบันก่อน หากอยู่บน Sepolia อยู่แล้ว ไม่ต้องส่งคำขอสลับซ้ำ
      const currentChainId = await (window as any).ethereum.request({ method : 'eth_chainId' });
      if (currentChainId && currentChainId.toLowerCase() === targetChainIdHex.toLowerCase()) {
        return;
      }

      await (window as any).ethereum.request({
        method : 'wallet_switchEthereumChain',
        params : [{ chainId : targetChainIdHex }]
      });
    } catch (switchError : any) {
      if (switchError.code === 4902) {
        await (window as any).ethereum.request({
          method : 'wallet_addEthereumChain',
          params : [
            {
              chainId : targetChainIdHex,
              chainName : POLYGON_AMOY_CONFIG.chainName,
              rpcUrls : [POLYGON_AMOY_CONFIG.rpcUrl],
              nativeCurrency : {
                name : 'Sepolia ETH',
                symbol : 'ETH',
                decimals : 18
              },
              blockExplorerUrls : [POLYGON_AMOY_CONFIG.blockExplorerUrl]
            }
          ]
        });
      } else {
        // หากผู้ใช้กดยกเลิกหรือไม่ยอมสลับ ให้ข้ามข้อผิดพลาดเพื่อไม่ให้เกิด crash
        console.warn('Network switch warning : ', switchError);
      }
    }
  }

  /**
   * ดึง Signer จาก MetaMask พร้อมตรวจสอบเครือข่าย Sepolia
   */
  public static async getSigner() : Promise<ethers.Signer> {
    await this.ensureSepoliaNetwork();
    const provider = await this.getBrowserProvider();
    return await provider.getSigner();
  }

  /**
   * ดึง Instance ของ ChangArenaNFT Contract
   */
  public static getContract(
    runner : ethers.ContractRunner
  ) : ethers.Contract {
    return new ethers.Contract(
      CHANG_ARENA_CONTRACT_ADDRESS,
      CHANG_ARENA_ABI,
      runner
    );
  }

  /**
   * อ่านรายละเอียดตั๋วจาก Smart Contract
   */
  public static async getTicketDetails(
    tokenId : number,
    currentMatchId? : string
  ) : Promise<OnChainTicketData> {
    let runner : ethers.ContractRunner;
    try {
      runner = await this.getBrowserProvider();
    } catch {
      runner = this.getReadOnlyProvider();
    }

    const contract = this.getContract(runner);
    const owner = await contract.ownerOf(tokenId);
    const details = await contract.getTicketDetails(tokenId);

    let isMatchUsed = false;
    if (details.ticketType === 1 && currentMatchId) {
      // ตั๋วรายปี : ตรวจสอบว่าในแมตช์นี้สแกนไปแล้วหรือยัง
      isMatchUsed = await contract.seasonMatchCheckedIn(tokenId, currentMatchId);
    }

    return {
      tokenId,
      owner,
      ticketType : Number(details.ticketType),
      tierName : details.tierName,
      seatZone : details.seatZone,
      seatNumber : details.seatNumber,
      targetMatchId : details.targetMatchId,
      seasonYear : Number(details.seasonYear),
      isUsedSingle : details.isUsedSingle,
      isMatchUsed
    };
  }

  /**
   * ยืนยันสิทธิ์เข้าสนามหน้าประตู (Gatekeeper Check-in)
   */
  public static async checkInEntry(
    tokenId : number,
    currentMatchId : string
  ) : Promise<ethers.ContractTransactionReceipt | null> {
    const signer = await this.getSigner();
    const contract = this.getContract(signer);

    const tx = await contract.checkInEntry(tokenId, currentMatchId);
    const receipt = await tx.wait();
    return receipt;
  }

  /**
   * สร้างตั๋วรายแมตช์ (Mint Single Ticket)
   */
  public static async mintSingleTicket(
    to : string,
    tokenURI : string,
    tierName : string,
    seatZone : string,
    seatNumber : string,
    matchId : string
  ) : Promise<{ txHash : string; tokenId? : number }> {
    const signer = await this.getSigner();
    const contract = this.getContract(signer);

    const tx = await contract.mintSingleTicket(
      to,
      tokenURI,
      tierName,
      seatZone,
      seatNumber,
      matchId
    );
    const receipt = await tx.wait();

    let tokenId : number | undefined;
    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === 'TicketMinted') {
            tokenId = Number(parsed.args[0]);
            break;
          }
        } catch {}
      }
    }

    return {
      txHash : receipt?.hash || tx.hash,
      tokenId
    };
  }

  /**
   * สร้างตั๋วรายปี (Mint Season Pass)
   */
  public static async mintSeasonPass(
    to : string,
    tokenURI : string,
    tierName : string,
    seatZone : string,
    seatNumber : string,
    seasonYear : number
  ) : Promise<{ txHash : string; tokenId? : number }> {
    const signer = await this.getSigner();
    const contract = this.getContract(signer);

    const tx = await contract.mintSeasonPass(
      to,
      tokenURI,
      tierName,
      seatZone,
      seatNumber,
      seasonYear
    );
    const receipt = await tx.wait();

    let tokenId : number | undefined;
    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === 'TicketMinted') {
            tokenId = Number(parsed.args[0]);
            break;
          }
        } catch {}
      }
    }

    return {
      txHash : receipt?.hash || tx.hash,
      tokenId
    };
  }
}

