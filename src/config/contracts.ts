// การตั้งค่า Web3 และ Smart Contract ABI สำหรับ Polygon Amoy Testnet
// เชื่อมโยงค่าตัวแปรจากไฟล์ .env โดยตรง

export const POLYGON_AMOY_CONFIG = {
  chainId : Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 80002,
  chainName : process.env.NEXT_PUBLIC_CHAIN_NAME || 'Polygon Amoy Testnet',
  rpcUrl : process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
  blockExplorerUrl : process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || 'https://amoy.polygonscan.com',
  currencySymbol : 'MATIC'
};

// อ่านที่อยู่ Contract จาก .env (NEXT_PUBLIC_CONTRACT_ADDRESS)
export const CHANG_ARENA_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x4376f92025De220677102e3b2eE9B1F54B06922C';

export const CHANG_ARENA_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function isStaff(address staff) view returns (bool)',
  'function setStaffStatus(address staff, bool status)',
  'function mintSingleTicket(address to, string tokenURI, string tierName, string seatZone, string seatNumber, string matchId) returns (uint256)',
  'function mintSeasonPass(address to, string tokenURI, string tierName, string seatZone, string seatNumber, uint256 seasonYear) returns (uint256)',
  'function checkInEntry(uint256 tokenId, string currentMatchId)',
  'function getTicketDetails(uint256 tokenId) view returns (tuple(uint8 ticketType, string tierName, string seatZone, string seatNumber, string targetMatchId, uint256 seasonYear, bool isUsedSingle))',
  'function seasonMatchCheckedIn(uint256 tokenId, string matchId) view returns (bool)',
  'event TicketMinted(uint256 indexed tokenId, address indexed to, uint8 tType, string tierName)',
  'event CheckedIn(uint256 indexed tokenId, string matchId, address indexed staff, uint256 timestamp)'
];
