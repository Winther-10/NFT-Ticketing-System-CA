import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../database/supabase';

export const dynamic = 'force-dynamic';

const DEFAULT_TIERS = [
  {
    tierId : 'PLATINUM_VIP',
    name : 'Platinum VIP (A10) + Fast Lane & Lounge',
    standLocation : 'East Stand',
    basePriceThb : 17000,
    isSeasonPassEligible : true,
    totalCapacity : 200
  },
  {
    tierId : 'EAST_A10',
    name : 'East Stand Premium Center (A10)',
    standLocation : 'East Stand',
    basePriceThb : 1600,
    isSeasonPassEligible : false,
    totalCapacity : 350
  },
  {
    tierId : 'EAST_A5',
    name : 'East Stand Upper (A5)',
    standLocation : 'East Stand',
    basePriceThb : 800,
    isSeasonPassEligible : false,
    totalCapacity : 600
  },
  {
    tierId : 'EAST_A4_A6',
    name : 'East Stand Wing (A4 & A6)',
    standLocation : 'East Stand',
    basePriceThb : 600,
    isSeasonPassEligible : false,
    totalCapacity : 1200
  },
  {
    tierId : 'EAST_REGULAR',
    name : 'East Stand Standard (A1-A3, A7-A9)',
    standLocation : 'East Stand',
    basePriceThb : 250,
    isSeasonPassEligible : false,
    totalCapacity : 2500
  },
  {
    tierId : 'WEST_MAIN',
    name : 'West Stand Grandstand',
    standLocation : 'West Stand',
    basePriceThb : 200,
    isSeasonPassEligible : false,
    totalCapacity : 5000
  },
  {
    tierId : 'NORTH_CURVA',
    name : 'North Stand Hardcore Curva Zone',
    standLocation : 'North Stand',
    basePriceThb : 160,
    isSeasonPassEligible : false,
    totalCapacity : 6000
  },
  {
    tierId : 'SOUTH_GOAL',
    name : 'South Stand Goal Area',
    standLocation : 'South Stand',
    basePriceThb : 160,
    isSeasonPassEligible : false,
    totalCapacity : 6000
  },
  {
    tierId : 'AWAY_ZONE',
    name : 'Away Fan Zone (East Stand Wing)',
    standLocation : 'East Stand',
    basePriceThb : 250,
    isSeasonPassEligible : false,
    totalCapacity : 1500
  }
];

export async function GET(req : NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('matchId') || 'BRU-vs-MU-2026';

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      const defaultWithCapacity = DEFAULT_TIERS.map((t) => ({
        ...t,
        soldCount : 0,
        availableSeats : t.totalCapacity
      }));
      return NextResponse.json({ success : true, data : defaultWithCapacity });
    }

    // 1. ดึงข้อมูลโซนที่นั่งทั้งหมด (Seat Tiers)
    const { data : tiersData, error : tiersErr } = await supabase
      .from('seat_tiers')
      .select('*')
      .order('base_price_thb', { ascending : false });

    const tiers = tiersData && tiersData.length > 0 ? tiersData : DEFAULT_TIERS.map((d) => ({
      tier_id : d.tierId,
      name : d.name,
      stand_location : d.standLocation,
      base_price_thb : d.basePriceThb,
      is_season_pass_eligible : d.isSeasonPassEligible,
      total_capacity : d.totalCapacity
    }));

    // 2. ดึงข้อมูลตั๋วที่ถูกซื้อไปแล้วจากตาราง tickets
    const { data : ticketsData } = await supabase
      .from('tickets')
      .select('tier_id, target_match_id, ticket_type');

    const tickets = ticketsData || [];

    // 3. คำนวณจำนวนที่นั่งคงเหลือแยกตามแมตช์และประเภทตั๋ว
    const result = tiers.map((tier : any) => {
      const tierId = tier.tier_id || tier.tierId;
      const isSeason = tier.is_season_pass_eligible ?? tier.isSeasonPassEligible;
      const totalCapacity = Number(tier.total_capacity ?? tier.totalCapacity) || 0;

      let soldCount = 0;
      if (isSeason) {
        // ตั๋วรายปี (Season Pass) นับยอดรวมที่ถูกซื้อไปในระดับโซนนั้น
        soldCount = tickets.filter(
          (t : any) => t.tier_id === tierId && t.ticket_type === 'SEASON_PASS'
        ).length;
      } else {
        // ตั๋วรายแมตช์ (Single Match) นับเฉพาะตั๋วที่ซื้อในแมตช์ที่ระบุ
        soldCount = tickets.filter(
          (t : any) => t.tier_id === tierId && t.target_match_id === matchId
        ).length;
      }

      const availableSeats = Math.max(0, totalCapacity - soldCount);

      return {
        tierId,
        name : tier.name,
        standLocation : tier.stand_location || tier.standLocation,
        basePriceThb : Number(tier.base_price_thb ?? tier.basePriceThb),
        isSeasonPassEligible : isSeason,
        totalCapacity,
        soldCount,
        availableSeats
      };
    });

    return NextResponse.json({ success : true, data : result });
  } catch (err : any) {
    console.error('API /api/seat-tiers error : ', err);
    return NextResponse.json(
      { success : false, error : err.message || 'Server error' },
      { status : 500 }
    );
  }
}
