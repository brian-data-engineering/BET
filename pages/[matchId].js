import { useRouter } from 'next/router';
import { useBets } from '../context/BetContext'; 
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import { ChevronLeft, Clock, BarChart2, Shield } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function MatchDetail({ match }) {
  const router = useRouter();
  const { slipItems, setSlipItems } = useBets();

  const cleanName = (name) => name ? name.replace(/['"]+/g, '') : 'TBD';

  if (router.isFallback || !match) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center font-black uppercase italic tracking-tighter">
        Loading Match...
      </div>
    );
  }

  const toggleBet = (selection, value) => {
    const betId = `${match.id}-${selection}`;
    setSlipItems(prev => {
      if (prev.find(item => item.id === betId)) {
        return prev.filter(item => item.id !== betId);
      }
      const otherMatches = prev.filter(item => item.matchId !== match.id);
      return [...otherMatches, {
        id: betId,
        matchId: match.id,
        matchName: `${cleanName(match.home_team)} vs ${cleanName(match.away_team)}`,
        selection: selection,
        odds: value
      }];
    });
  };

  const mainMarkets = [
    { label: '1', val: match.home_odds },
    { label: 'X', val: match.draw_odds },
    { label: '2', val: match.away_odds }
  ];

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white font-sans">
      <Navbar />

      <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-0 lg:gap-6 p-0 lg:p-6">
        <main className="col-span-12 lg:col-span-9 space-y-4">
          
          {/* Header Navigation */}
          <div className="flex items-center gap-4 px-4 py-2 lg:px-0">
            <Link href="/" className="p-2 bg-[#1c2636] border border-white/5 hover:bg-[#253247] rounded-md transition">
              <ChevronLeft size={20} />
            </Link>
            <h1 className="text-sm font-black uppercase italic tracking-tighter text-[#10b981]">
              {match.league_name} <span className="text-slate-500 ml-2">/ Match Details</span>
            </h1>
          </div>

          {/* Scoreboard / VS Card (BonusBet Style) */}
          <div className="bg-[#111926] border-y lg:border border-white/5 lg:rounded-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
            
            <div className="flex justify-between items-center p-8 md:p-12 relative z-10">
              {/* Home */}
              <div className="flex-1 flex flex-col items-center text-center">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-[#1c2636] rounded-full mb-4 flex items-center justify-center border border-white/5 shadow-xl">
                  <Shield size={40} className="text-[#10b981] opacity-50" />
                </div>
                <h2 className="text-lg md:text-2xl font-black uppercase italic leading-tight">{cleanName(match.home_team)}</h2>
              </div>

              {/* Center Info */}
              <div className="px-4 flex flex-col items-center">
                <div className="text-[#f59e0b] text-3xl md:text-5xl font-black italic mb-2 tracking-tighter">VS</div>
                <div className="bg-[#0b0f1a] px-4 py-1.5 rounded text-[10px] font-black uppercase italic text-slate-400 border border-white/5 flex items-center gap-2">
                   <Clock size={12} className="text-[#10b981]" />
                   {new Date(match.commence_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>

              {/* Away */}
              <div className="flex-1 flex flex-col items-center text-center">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-[#1c2636] rounded-full mb-4 flex items-center justify-center border border-white/5 shadow-xl">
                  <Shield size={40} className="text-[#10b981] opacity-50" />
                </div>
                <h2 className="text-lg md:text-2xl font-black uppercase italic leading-tight">{cleanName(match.away_team)}</h2>
              </div>
            </div>
          </div>

          {/* Markets Section */}
          <div className="px-4 lg:px-0 space-y-4 pb-20">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-xs font-black uppercase italic flex items-center gap-2 text-slate-400 tracking-widest">
                Main Markets
                </h3>
                <span className="text-[10px] font-bold text-[#10b981] uppercase italic cursor-pointer hover:underline">Full Stats</span>
            </div>

            {/* Match Winner Market Row */}
            <div className="bg-[#1c2636] border border-white/5 rounded-xl p-5">
              <h4 className="text-[10px] font-black uppercase italic text-slate-500 mb-4 tracking-tighter">3-Way Match Winner</h4>
              <div className="grid grid-cols-3 gap-3">
                {mainMarkets.map((odd, idx) => {
                  const isSelected = slipItems.find(item => item.id === `${match.id}-${odd.label}`);
                  return (
                    <button 
                      key={idx}
                      onClick={() => toggleBet(odd.label, odd.val)}
                      className={`flex flex-col items-center justify-center p-4 h-16 rounded-md border transition-all duration-150 ${
                        isSelected 
                          ? 'bg-[#10b981] border-[#10b981] text-white' 
                          : 'bg-[#111926] border-white/5 text-slate-300 hover:border-white/20'
                      }`}
                    >
                      <span className={`text-[9px] font-black uppercase mb-1 ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                        {odd.label === '1' ? 'Home' : odd.label === 'X' ? 'Draw' : 'Away'}
                      </span>
                      <span className="font-black text-sm italic">
                        {odd.val ? parseFloat(odd.val).toFixed(2) : '—'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Placeholder for more markets (Over/Under etc) */}
            <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl text-slate-700 font-black uppercase text-[10px] italic tracking-widest">
              More markets will be available closer to kick-off
            </div>
          </div>
        </main>

        <aside className="hidden lg:col-span-3 lg:block">
          <Betslip items={slipItems} setItems={setSlipItems} />
        </aside>
      </div>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const { matchId } = params;

  try {
    const { data: match, error } = await supabase
      .from('api_events')
      .select('*')
      .eq('id', matchId) // Using 'id' text based on your schema
      .single();

    if (error || !match) {
      return { notFound: true };
    }

    return {
      props: {
        match: JSON.parse(JSON.stringify(match))
      }
    };
  } catch (err) {
    return { notFound: true };
  }
}
