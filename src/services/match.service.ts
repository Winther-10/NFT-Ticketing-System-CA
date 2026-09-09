import { getSupabaseClient } from '../../database/supabase';

export interface MatchInfo {
  matchId : string;
  homeTeam : string;
  awayTeam : string;
  competition : string;
  matchDatetime : string;
  stadium : string;
}

export interface SeatTierInfo {
  tierId : string;
  name : string;
  standLocation : string;
  basePriceThb : number;
  isSeasonPassEligible : boolean;
  totalCapacity : number;
}

const DEFAULT_MATCHES : MatchInfo[] = [
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

const DEFAULT_TIERS : SeatTierInfo[] = [
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

export class MatchService {
  public static async getMatches() : Promise<MatchInfo[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('is_active', true)
        .order('match_datetime', { ascending : true });

      if (!error && data && data.length > 0) {
        return data.map((m : any) => ({
          matchId : m.match_id,
          homeTeam : m.home_team,
          awayTeam : m.away_team,
          competition : m.competition,
          matchDatetime : m.match_datetime,
          stadium : m.stadium
        }));
      }
    }
    return DEFAULT_MATCHES;
  }

  public static async getSeatTiers() : Promise<SeatTierInfo[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('seat_tiers')
        .select('*')
        .order('base_price_thb', { ascending : false });

      if (!error && data && data.length > 0) {
        return data.map((t : any) => ({
          tierId : t.tier_id,
          name : t.name,
          standLocation : t.stand_location,
          basePriceThb : Number(t.base_price_thb),
          isSeasonPassEligible : t.is_season_pass_eligible,
          totalCapacity : t.total_capacity
        }));
      }
    }
    return DEFAULT_TIERS;
  }

  public static async getMatchById(matchId : string) : Promise<MatchInfo | null> {
    const matches = await this.getMatches();
    return matches.find((m) => m.matchId === matchId) || null;
  }
}
