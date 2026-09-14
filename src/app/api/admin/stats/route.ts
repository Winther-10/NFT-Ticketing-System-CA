import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../../../../../database/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req : NextRequest) {
  try {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://flrmfirclyukblpjfyjc.supabase.co';
    const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscm1maXJjbHl1a2JscGpmeWpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODkxOTMwMywiZXhwIjoyMTA0NDk1MzAzfQ.Q2X6HtBfzHh82lc5b2pcGCBNzTzSOcAWMwqZlEqQc0I';
    
    let supabase = createClient(cleanUrl, serviceKey, {
      auth : { autoRefreshToken : false, persistSession : false },
      global : {
        fetch : (url, options) => fetch(url, { ...options, cache : 'no-store' })
      }
    });

    if (!supabase) {
      return NextResponse.json(
        { success : false, error : 'ไม่สามารถเชื่อมต่อฐานข้อมูล Supabase ได้' },
        { status : 500 }
      );
    }

    // 1. ดึงข้อมูลตั๋วทั้งหมด
    const { data : tickets, error : ticketsErr } = await supabase
      .from('tickets')
      .select('token_id, wallet_address, ticket_type, tier_id, target_match_id, seat_zone, seat_number, season_year, metadata_uri, purchase_tx_hash, created_at')
      .order('created_at', { ascending : false });

    if (ticketsErr) {
      console.error('Fetch tickets error : ', ticketsErr);
    }

    // 2. ดึงประวัติการสแกนตรวจตั๋วทั้งหมด
    const { data : checkinLogs, error : logsErr } = await supabase
      .from('checkin_logs')
      .select('id, token_id, match_id, gate_staff_address, entry_status, rejection_reason, blockchain_tx_hash, signed_payload, checked_in_at')
      .order('checked_in_at', { ascending : false });

    if (logsErr) {
      console.error('Fetch checkin logs error : ', logsErr);
    }

    // 3. ดึงรายการแมตช์การแข่งขันทั้งหมด
    const { data : matchesData } = await supabase
      .from('matches')
      .select('*')
      .order('match_datetime', { ascending : true });

    const rawMatches = matchesData && matchesData.length > 0 ? matchesData : [
      {
        match_id : 'BRU-vs-MU-2026',
        home_team : 'Buriram United',
        away_team : 'Muangthong United',
        competition : 'Thai League 1 (Super Big Match)',
        match_datetime : '2026-09-20T19:00:00+07:00',
        stadium : 'Chang Arena, Buriram'
      },
      {
        match_id : 'BRU-vs-BG-2026',
        home_team : 'Buriram United',
        away_team : 'BG Pathum United',
        competition : 'Thai League 1',
        match_datetime : '2026-10-04T18:00:00+07:00',
        stadium : 'Chang Arena, Buriram'
      },
      {
        match_id : 'BRU-vs-JDT-2026',
        home_team : 'Buriram United',
        away_team : "Johor Darul Ta'zim",
        competition : 'AFC Champions League Elite',
        match_datetime : '2026-10-22T19:15:00+07:00',
        stadium : 'Chang Arena, Buriram'
      }
    ];

    const allTickets = tickets || [];
    const allLogs = checkinLogs || [];

    // 4. คำนวณสถิติแยกรายแมตช์ (Per-Match Breakdown)
    const matchBreakdown = rawMatches.map((m : any) => {
      const mId = m.match_id;
      const mTickets = allTickets.filter(
        (t) => t.ticket_type === 'SEASON_PASS' || t.target_match_id === mId
      );
      const mLogs = allLogs.filter((l) => l.match_id === mId);
      const mSuccess = mLogs.filter((l) => l.entry_status === 'SUCCESS');
      const mRejected = mLogs.filter((l) => l.entry_status === 'FAILED');
      const mCheckedInSet = new Set(mSuccess.map((l) => l.token_id));
      const mCheckedInCount = mCheckedInSet.size;
      const mTotalTickets = mTickets.length;
      const mRate = mTotalTickets > 0 ? ((mCheckedInCount / mTotalTickets) * 100).toFixed(1) : '0.0';
      const mOnchain = mTickets.filter((t) => !!t.purchase_tx_hash && t.purchase_tx_hash.startsWith('0x')).length;

      return {
        matchId : mId,
        homeTeam : m.home_team,
        awayTeam : m.away_team,
        competition : m.competition,
        matchDatetime : m.match_datetime,
        stadium : m.stadium,
        totalTickets : mTotalTickets,
        checkedInCount : mCheckedInCount,
        rejectedCount : mRejected.length,
        totalScans : mLogs.length,
        attendanceRate : Number(mRate),
        onchainTickets : mOnchain,
        fastModeTickets : mTotalTickets - mOnchain,
        singleTickets : mTickets.filter((t) => t.ticket_type === 'SINGLE_MATCH').length,
        seasonTickets : mTickets.filter((t) => t.ticket_type === 'SEASON_PASS').length
      };
    });

    // 3. ประมวลผลสถิติภาพรวม (Overview Metrics)
    const totalTickets = allTickets.length;
    const successfulCheckins = allLogs.filter((l) => l.entry_status === 'SUCCESS');
    const rejectedCheckins = allLogs.filter((l) => l.entry_status === 'FAILED');

    // นับจำนวนตั๋วที่ไม่ซ้ำที่ผ่านประตูแล้ว
    const checkedInTokenSet = new Set(successfulCheckins.map((l) => l.token_id));
    const uniqueCheckedInCount = checkedInTokenSet.size;

    const attendanceRate =
      totalTickets > 0 ? ((uniqueCheckedInCount / totalTickets) * 100).toFixed(1) : '0.0';

    const onchainTickets = allTickets.filter((t) => !!t.purchase_tx_hash && t.purchase_tx_hash.startsWith('0x')).length;
    const fastModeTickets = totalTickets - onchainTickets;

    // 4. สถิติแยกตามโซนที่นั่ง (Zone Breakdown)
    const zoneMap : { [key : string] : { total : number; checkedIn : number } } = {
      'East Stand' : { total : 0, checkedIn : 0 },
      'West Stand' : { total : 0, checkedIn : 0 },
      'North Curva' : { total : 0, checkedIn : 0 },
      'South Goal' : { total : 0, checkedIn : 0 },
      'VIP Lounge' : { total : 0, checkedIn : 0 }
    };

    allTickets.forEach((t) => {
      let zone = t.seat_zone || 'East Stand';
      if (t.tier_id === 'PLATINUM_VIP' || zone.includes('VIP')) {
        zone = 'VIP Lounge';
      } else if (zone.includes('West')) {
        zone = 'West Stand';
      } else if (zone.includes('North')) {
        zone = 'North Curva';
      } else if (zone.includes('South')) {
        zone = 'South Goal';
      } else {
        zone = 'East Stand';
      }

      if (!zoneMap[zone]) {
        zoneMap[zone] = { total : 0, checkedIn : 0 };
      }
      zoneMap[zone].total += 1;
      if (checkedInTokenSet.has(t.token_id)) {
        zoneMap[zone].checkedIn += 1;
      }
    });

    const zoneBreakdown = Object.keys(zoneMap).map((zoneName) => ({
      zoneName,
      totalTickets : zoneMap[zoneName].total,
      checkedInCount : zoneMap[zoneName].checkedIn,
      rate :
        zoneMap[zoneName].total > 0
          ? ((zoneMap[zoneName].checkedIn / zoneMap[zoneName].total) * 100).toFixed(0)
          : '0'
    }));

    // 5. สถิติแยกตามประเภทบัตร (Single Match vs Season Pass)
    const singleMatchCount = allTickets.filter((t) => t.ticket_type === 'SINGLE_MATCH').length;
    const seasonPassCount = allTickets.filter((t) => t.ticket_type === 'SEASON_PASS').length;

    return NextResponse.json({
      success : true,
      data : {
        overview : {
          totalTickets,
          totalCheckedIn : uniqueCheckedInCount,
          totalScans : allLogs.length,
          totalRejected : rejectedCheckins.length,
          attendanceRate : Number(attendanceRate),
          onchainTickets,
          fastModeTickets,
          singleMatchCount,
          seasonPassCount
        },
        zoneBreakdown,
        matchBreakdown,
        recentCheckins : allLogs.slice(0, 15),
        recentTickets : allTickets.slice(0, 10),
        lastUpdated : new Date().toISOString()
      }
    });
  } catch (err : any) {
    return NextResponse.json(
      { success : false, error : err.message || 'Server Internal Error' },
      { status : 500 }
    );
  }
}
