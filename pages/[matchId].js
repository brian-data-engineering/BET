import { useRouter } from 'next/router';
import { useBets } from '../context/BetContext'; 
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import { ChevronLeft, Clock, Trophy, Activity } from 'lucide-react';
import Link from 'next/link';
// 1. Import Supabase
import { supabase } from '../lib/supabaseClient';

export default function MatchDetail({ match, odds = [] }) {
  const router = useRouter();
  const { slipItems, setSlipItems } = useBets();

  // Helper to clean up team names (removes quotes)
  const cleanName = (name) => name ? name.replace(/['"]+/g, '') : '';

  if (router.isFallback || !match) {
    return (
      <div className="min-h-screen bg-lucra-dark text-white flex items-center justify-center font-black uppercase tracking-widest">
        Loading Lucra Match...
      </div>
    );
  }

  const groupedOdds = odds.reduce((acc, odd) => {
    const name = odd.market_name || "Other Markets";
    if (!acc[name]) acc[name] = [];
    acc[name].push(odd);
    return acc;
  }, {});

  const toggleBet = (odd) => {
    const betId = `${match.match_id}-${odd.odd_key}`;
    setSlipItems(prev => {
      if (prev.find(item => item.id === betId)) {
        return prev.filter(item => item.id !== betId);
      }
      const otherMatches = prev.filter(item => item.matchId !== match.match_id);
      return [...otherMatches, {
        id: betId,
        oddKey: odd.odd_key,
        matchId: match.match_id,
        matchName: `${cleanName(match.home_team)} vs ${cleanName(match.away_team)}`,
        selection: odd.display,
        odds: odd.value
      }];
    });
  };

  return (
    <div className="min-h-screen bg-lucra-dark text-white font-sans">
      <Navbar />

      <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-6 p-4 lg:p-6">
        <main className="col-span-12 lg:col-span-9 space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 bg-slate-900 border border-gray-800 hover:bg-slate-800 rounded-full transition">
              <ChevronLeft size={24} />
            </Link>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-lucra-green">
                {match.competition_name || "Match Details"}
              </h1>
            </div>
          </div>

          <div className="bg-lucra-card border border-gray-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Trophy size={160} />
            </div>
            
            <div className="flex justify-between items-center text-center relative z-10">
              <div className="flex-1">
                <div className="w-20 h-20 bg-slate-900 rounded-3xl mx-auto mb-4 flex items-center justify-center border border-gray-800 shadow-inner">
                  <span className="text-3xl font-black text-lucra-green">{cleanName(match.home_team)?.[0]}</span>
                </div>
                <h2 className="text-2xl font-black tracking-tighter">{cleanName(match.home_team)}</h2>
                <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Home Team</span>
              </div>

              <div className="px-8">
                <div className="bg-lucra-green text-black px-5 py-1.5 rounded-full font-black text-xs mb-3 shadow-[0_0_20px_rgba(0,255,135,0.2)]">VS</div>
                <div className="flex items-center justify-center gap-1.5 text-gray-500 text-[10px] font-black uppercase tracking-widest" suppressHydrationWarning>
                   <Clock size={12} className="text-lucra-green" />
                   {new Date(match.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>

              <div className="flex-1">
                <div className="w-20 h-20 bg-slate-900 rounded-3xl mx-auto mb-4 flex items-center justify-center border border-gray-800 shadow-inner">
                  <span className="text-3xl font-black text-lucra-green">{cleanName(match.away_team)?.[0]}</span>
                </div>
                <h2 className="text-2xl font-black tracking-tighter">{cleanName(match.away_team)}</h2>
                <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Away Team</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gray-400">
              <Activity size={18} className="text-lucra-green" />
              Live Betting Markets
            </h3>

            {Object.entries(groupedOdds).map(([marketName, marketOdds]) => (
              <div key={marketName} className="bg-lucra-card/40 border border-gray-800/60 rounded-2xl p-5 backdrop-blur-sm">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-lucra-green/60 mb-4 px-1">{marketName}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {marketOdds.map((odd, idx) => {
                    const isSelected = slipItems.find(item => item.id === `${match.match_id}-${odd.odd_key}`);
                    return (
                      <button 
                        key={idx}
                        onClick={() => toggleBet(odd)}
                        className={`flex justify-between items-center p-4 rounded-xl border transition-all duration-200 group ${
                          isSelected 
                            ? 'bg-lucra-green border-lucra-green' 
                            : 'bg-slate-900/60 border-gray-800 hover:border-gray-600'
                        }`}
                      >
                        <span className={`text-xs font-black uppercase ${isSelected ? 'text-black/70' : 'text-gray-400'}`}>
                          {odd.display}
                        </span>
                        <span className={`font-black text-lg ${isSelected ? 'text-black' : 'text-lucra-green'}`}>
                          {parseFloat(odd.value).toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </main>

        <aside className="hidden lg:col-span-3 lg:block">
          <Betslip items={slipItems} setItems={setSlipItems} />
        </aside>
      </div>
    </div>
  );
}

// 2. Updated to pull the specific Match and its specific Odds from Supabase
export async function getServerSideProps({ params }) {
  try {
    const { matchId } = params;

    // Fetch the specific match
    const { data: match } = await supabase
      .from('matches')
      .select('*')
      .eq('match_id', matchId)
      .single();

    // Fetch only the odds for this specific match
    const { data: odds } = await supabase
      .from('odds')
      .select('*')
      .eq('match_id', matchId);

    return { 
      props: { 
        match: match || null, 
        odds: odds || [] 
      } 
    };
  } catch (err) {
    console.error("Match Detail Error:", err);
    return { props: { match: null, odds: [] } };
  }
}
