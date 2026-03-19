import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, Timer, ShieldCheck } from 'lucide-react';

export default function MatchDetail({ odds = [], matchInfo }) {
  const router = useRouter();

  // Handle loading state
  if (router.isFallback) {
    return (
      <div className="min-h-screen bg-lucra-dark flex items-center justify-center">
        <div className="animate-pulse text-lucra-green font-black text-xl italic uppercase">
          Loading Lucra Data...
        </div>
      </div>
    );
  }

  // Handle case where match is not found
  if (!matchInfo) {
    return (
      <div className="min-h-screen bg-lucra-dark text-white p-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Match Not Found</h1>
        <Link href="/" className="text-lucra-green hover:underline">Return Home</Link>
      </div>
    );
  }

  // Filter for the main 1X2 Market
  const mainMarket = odds.filter(o => 
    o.market_name?.toUpperCase() === "1X2" || 
    o.market_name?.toLowerCase().includes("winner")
  );

  return (
    <div className="min-h-screen bg-lucra-dark text-white p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation */}
        <Link 
          href="/" 
          className="flex items-center gap-2 text-gray-400 hover:text-lucra-green text-sm mb-8 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Lobby
        </Link>
        
        {/* Match Header Card */}
        <div className="bg-lucra-card border border-gray-800 rounded-3xl p-8 mb-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-lucra-green to-transparent opacity-50" />
          
          <div className="flex flex-col items-center gap-4 relative z-10">
            <span className="text-[10px] bg-slate-800 text-lucra-green px-3 py-1 rounded-full font-black uppercase tracking-[0.2em] border border-lucra-green/20">
              {matchInfo.competition}
            </span>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 w-full py-4">
              <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter text-center uppercase">
                {matchInfo.home}
              </h1>
              <div className="bg-lucra-green text-black px-3 py-1 rounded font-black italic text-sm skew-x-[-10deg]">
                VS
              </div>
              <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter text-center uppercase text-gray-300">
                {matchInfo.away}
              </h1>
            </div>

            <div className="flex items-center gap-2 text-gray-500 font-bold text-sm">
              <Timer size={14} />
              {new Date(matchInfo.start).toLocaleString([], { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        </div>

        {/* Odds Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <span className="w-1.5 h-6 bg-lucra-green rounded-full shadow-[0_0_10px_rgba(0,255,135,0.5)]"></span> 
              Match Result (1X2)
            </h2>
            <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase font-black">
              <ShieldCheck size={12} className="text-lucra-green" />
              Verified Odds
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mainMarket.length > 0 ? (
              mainMarket.map((odd, i) => (
                <button 
                  key={i} 
                  className="bg-slate-900/50 border border-gray-800 p-8 rounded-2xl hover:border-lucra-green group transition-all relative overflow-hidden active:scale-95"
                >
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Trophy size={40} />
                  </div>
                  <p className="text-gray-500 text-xs mb-2 uppercase font-black tracking-widest">{odd.display}</p>
                  <p className="text-4xl font-black text-white group-hover:text-lucra-green transition-colors">
                    {odd.value}
                  </p>
                </button>
              ))
            ) : (
              <div className="col-span-3 py-10 text-center bg-lucra-card/20 rounded-2xl border border-dashed border-gray-800">
                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Odds suspended or unavailable</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const { matchId } = context.params;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bet-backend-q7vi.onrender.com';

  try {
    // 1. Fetch the odds for this match
    const res = await fetch(`${API_URL}/matches/${matchId}/odds`);
    const odds = await res.json();

    // 2. Fetch the basic match info if odds are empty
    // If your backend doesn't have a /matches/${matchId} endpoint, 
    // we use the first odd's info as fallback
    let matchInfo = null;
    if (odds && odds.length > 0) {
      matchInfo = {
        home: odds[0].home,
        away: odds[0].away,
        competition: odds[0].competition,
        start: odds[0].start,
      };
    }

    return { 
      props: { 
        odds: Array.isArray(odds) ? odds : [], 
        matchInfo 
      } 
    };
  } catch (err) {
    console.error("Detail Fetch Error:", err);
    return { props: { odds: [], matchInfo: null } };
  }
}
