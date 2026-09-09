import { createClient, SupabaseClient } from '@supabase/supabase-js';

// การตั้งค่า Supabase Client สำหรับ Off-chain Database (PDPA Compliant)
// อ่านค่าตัวแปรจาก .env : NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseInstance : SupabaseClient | null = null;

export const getSupabaseClient = () : SupabaseClient | null => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // หากระบุ URL และ Key จริง (ไม่ใช่ Placeholder ต้นแบบ) จะสร้าง Client เชื่อมต่อทันที
  const isRealUrl =
    supabaseUrl &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseUrl.includes('demo-chang-arena');

  if (isRealUrl && supabaseAnonKey && !supabaseAnonKey.includes('placeholder')) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
      return supabaseInstance;
    } catch (err) {
      console.warn('ไม่สามารถสร้าง Supabase Client ได้ : ', err);
      return null;
    }
  }

  return null;
};
