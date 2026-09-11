import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const DEFAULT_MATCHES = [
  {
    matchId : 'BRU-vs-MU-2026',
    homeTeam : 'Buriram United',
    awayTeam : 'Muangthong United',
    competition : 'Thai League 1 (Super Big Match)',
    matchDatetime : '2026-09-20T19:00:00+07:00',
    stadium : 'Chang Arena, Buriram'
  },
  {
    matchId : 'BRU-vs-BG-2026',
    homeTeam : 'Buriram United',
    awayTeam : 'BG Pathum United',
    competition : 'Thai League 1',
    matchDatetime : '2026-10-04T18:00:00+07:00',
    stadium : 'Chang Arena, Buriram'
  },
  {
    matchId : 'BRU-vs-JDT-2026',
    homeTeam : 'Buriram United',
    awayTeam : 'Johor Darul Ta`zim',
    competition : 'AFC Champions League Elite',
    matchDatetime : '2026-10-22T19:15:00+07:00',
    stadium : 'Chang Arena, Buriram'
  }
];

function getSupabase() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://flrmfirclyukblpjfyjc.supabase.co';
  const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscm1maXJjbHl1a2JscGpmeWpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODkxOTMwMywiZXhwIjoyMTA0NDk1MzAzfQ.Q2X6HtBfzHh82lc5b2pcGCBNzTzSOcAWMwqZlEqQc0I';

  return createClient(cleanUrl, serviceKey, {
    auth : { autoRefreshToken : false, persistSession : false },
    global : {
      fetch : (url, options) => fetch(url, { ...options, cache : 'no-store' })
    }
  });
}

// GET /api/matches : ดึงรายการแมตช์ทั้งหมดจากระบบ
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('is_active', true)
      .order('match_datetime', { ascending : true });

    if (error) {
      console.warn('Supabase fetch matches error : ', error);
      return NextResponse.json({ success : true, data : DEFAULT_MATCHES });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success : true, data : DEFAULT_MATCHES });
    }

    const formatted = data.map((m : any) => ({
      matchId : m.match_id,
      homeTeam : m.home_team,
      awayTeam : m.away_team,
      competition : m.competition,
      matchDatetime : m.match_datetime,
      stadium : m.stadium
    }));

    return NextResponse.json({ success : true, data : formatted });
  } catch (err : any) {
    console.error('API /api/matches GET error : ', err);
    return NextResponse.json({ success : true, data : DEFAULT_MATCHES });
  }
}

// POST /api/matches : สร้างแมตช์การแข่งขันใหม่
export async function POST(req : NextRequest) {
  try {
    const body = await req.json();
    const {
      matchId,
      homeTeam = 'Buriram United',
      awayTeam,
      competition = 'Thai League 1',
      matchDatetime,
      stadium = 'Chang Arena'
    } = body;

    if (!awayTeam || !awayTeam.trim()) {
      return NextResponse.json(
        { success : false, error : 'กรุณาระบุชื่อทีมเยือน (Away Team)' },
        { status : 400 }
      );
    }

    if (!matchDatetime) {
      return NextResponse.json(
        { success : false, error : 'กรุณาระบุวันและเวลาการแข่งขัน' },
        { status : 400 }
      );
    }

    // สร้าง Match ID อัตโนมัติหากไม่ได้ระบุ เช่น BRU-vs-PORT-2026
    const cleanAway = awayTeam.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'AWAY';
    const year = new Date(matchDatetime).getFullYear() || 2026;
    const finalMatchId = (matchId && matchId.trim())
      ? matchId.trim()
      : `BRU-vs-${cleanAway}-${year}`;

    const supabase = getSupabase();

    const newMatchRecord = {
      match_id : finalMatchId,
      home_team : homeTeam.trim(),
      away_team : awayTeam.trim(),
      competition : competition.trim(),
      match_datetime : new Date(matchDatetime).toISOString(),
      stadium : stadium.trim(),
      is_active : true
    };

    const { data, error } = await supabase
      .from('matches')
      .upsert(newMatchRecord, { onConflict : 'match_id' })
      .select()
      .single();

    if (error) {
      console.error('Insert match error : ', error);
      return NextResponse.json(
        { success : false, error : `ไม่สามารถบันทึกแมตช์ได้ : ${error.message}` },
        { status : 500 }
      );
    }

    return NextResponse.json({
      success : true,
      message : 'เพิ่มแมตช์การแข่งขันสำเร็จ',
      data : {
        matchId : data.match_id,
        homeTeam : data.home_team,
        awayTeam : data.away_team,
        competition : data.competition,
        matchDatetime : data.match_datetime,
        stadium : data.stadium
      }
    });
  } catch (err : any) {
    console.error('API /api/matches POST error : ', err);
    return NextResponse.json(
      { success : false, error : `เกิดข้อผิดพลาดในการประมวลผล : ${err.message || err}` },
      { status : 500 }
    );
  }
}
