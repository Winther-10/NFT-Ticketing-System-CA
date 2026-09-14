import { createClient, SupabaseClient } from '@supabase/supabase-js';

// การตั้งค่า Supabase Client สำหรับ Off-chain Database (PDPA Compliant)
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabaseInstance : SupabaseClient | null = null;
let supabaseAdminInstance : SupabaseClient | null = null;

export const getSupabaseClient = () : SupabaseClient | null => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const isRealUrl =
    cleanUrl &&
    !cleanUrl.includes('your-project-id') &&
    !cleanUrl.includes('demo-chang-arena');

  if (isRealUrl && supabaseAnonKey && !supabaseAnonKey.includes('placeholder')) {
    try {
      supabaseInstance = createClient(cleanUrl, supabaseAnonKey, {
        global : {
          fetch : (url, options) => fetch(url, { ...options, cache : 'no-store' })
        }
      });
      return supabaseInstance;
    } catch (err) {
      console.warn('ไม่สามารถสร้าง Supabase Client ได้ : ', err);
      return null;
    }
  }

  return null;
};

export const getSupabaseAdmin = () : SupabaseClient | null => {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }

  const isRealUrl =
    cleanUrl &&
    !cleanUrl.includes('your-project-id') &&
    !cleanUrl.includes('demo-chang-arena');

  const keyToUse = supabaseServiceKey || supabaseAnonKey;

  if (isRealUrl && keyToUse && !keyToUse.includes('placeholder')) {
    try {
      supabaseAdminInstance = createClient(cleanUrl, keyToUse, {
        auth : {
          autoRefreshToken : false,
          persistSession : false
        },
        global : {
          fetch : (url, options) => fetch(url, { ...options, cache : 'no-store' })
        }
      });
      return supabaseAdminInstance;
    } catch (err) {
      console.warn('ไม่สามารถสร้าง Supabase Admin Client ได้ : ', err);
      return null;
    }
  }

  return null;
};
