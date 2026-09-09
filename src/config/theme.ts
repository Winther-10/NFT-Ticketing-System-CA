// ธีม Minimalist Light Studio สำหรับระบบ Chang Arena NFT Ticket
// โครงสร้างสีมาตรฐาน คลีน สบายตา พร้อมระบุโทนสีน้ำเงิน-ทอง สัญลักษณ์บุรีรัมย์ ยูไนเต็ด

export const THEME_CONFIG = {
  colors: {
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceSubtle: '#f1f5f9',
    surfaceHover: '#e2e8f0',
    border: '#e2e8f0',
    borderStrong: '#cbd5e1',

    // โทนสีหลัก Chang Arena / Buriram United
    primary: '#002d62',      // Deep Navy
    primaryHover: '#001b3a',
    primaryLight: '#e6f0fa',

    accent: '#c59b27',       // Gold Accent
    accentLight: '#fef7e0',
    accentHover: '#ab8219',

    // สถานะระบบ
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',

    success: '#059669',
    successLight: '#ecfdf5',
    error: '#dc2626',
    errorLight: '#fef2f2',
    warning: '#d97706',
    warningLight: '#fffbeb'
  },
  typography: {
    fontFamily: 'Inter, Prompt, sans-serif',
    headingWeight: '600',
    bodyWeight: '400'
  },
  borders: {
    radiusSm: '6px',
    radiusMd: '10px',
    radiusLg: '16px',
    radiusFull: '9999px'
  },
  shadows: {
    card: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
    elevated: '0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -4px rgba(0, 0, 0, 0.04)'
  }
} as const;
