// การตั้งค่าความปลอดภัย Dynamic QR และ Pinata IPFS จาก .env

export const SECURITY_CONFIG = {
  // อายุสูงสุดของ QR Code (วินาที) ตรวจจับการแคปจอ
  qrMaxAgeSeconds : Number(process.env.NEXT_PUBLIC_QR_MAX_AGE_SECONDS) || 60,

  // ความถี่ในการรีเฟรชลายเซ็นใหม่ (วินาที)
  qrRefreshIntervalSeconds : Number(process.env.NEXT_PUBLIC_QR_REFRESH_INTERVAL_SECONDS) || 30
};

export const IPFS_CONFIG = {
  apiKey : process.env.PINATA_API_KEY || '',
  secretApiKey : process.env.PINATA_SECRET_API_KEY || '',
  jwt : process.env.PINATA_JWT || '',
  gatewayUrl : process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs/'
};
