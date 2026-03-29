import { useRouter } from 'next/router';
import { useBets } from '../context/BetContext'; 
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import { ChevronLeft, Clock, Shield, Lock, X, Trophy, LayoutGrid, List } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MatchDetail({ match }) {
  const router = useRouter();
  const { slipItems, setSlipItems } = useBets();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobileSlipOpen, setIsMobileSlipOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const isStarted = () => {
    const startTime = match?.commence_time;
    if (!startTime) return false;
    const cleanTime = startTime.replace('+00', '').replace('Z', '').replace(' ', 'T');
    const matchDate = new Date(cleanTime);
    return currentTime >= matchDate;
  };

  const locked = isStarted();
  const cleanName = (name) => name ? name.replace(/['"]+/g, '') : 'TBD';

  const formatFixedTime = (dateString) => {
    if (!dateString) return 'TBD';
    const timeMatch = dateString.match(/(\d{2}:\d{2})/);
    return timeMatch ? timeMatch[0] : 'TBD';
  };

  if (router.isFallback || !match) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center font-black uppercase italic tracking-tighter">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin" />
          Loading Match...
        </div>
      </div>
    );
  }

  const toggleBet = (marketName, selectionLabel, value, uniqueId) => {
    if (locked) return;
    setSlipItems(prev => {
      if (prev.find(item => item.id === uniqueId)) {
        return prev.filter(item => item.id !== uniqueId);
      }
      const otherMatches = prev.filter(item => item.matchId !== match.id);
      return [...otherMatches, {
        id: uniqueId,
        matchId: match.id,
        matchName: `${cleanName(match.home_team)} vs ${cleanName(match.away_team)}`,
        startTime: match.commence_time,
        marketName: marketName,
        selection: selectionLabel,
        odds: value
      }];
    });
  };

  const mainMarkets = [
    { label: '1', display: cleanName(match.home_team), val: match.home_odds },
    { label: 'X', display: 'Draw', val: match.draw_odds },
    { label: '2', display: cleanName(match.away_team), val: match.away_odds }
  ];

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white font-sans selection:bg-[#10b981]/30">
      <Navbar />

      {/* Mobile Betslip Portal */}
      {isMobileSlipOpen && (
        <div className="fixed inset-0 z-[120] bg-[#0b0f1a] lg:hidden flex flex-col">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#111926]">
            <h3 className="font-black uppercase italic text-[#10b981] flex items-center gap-2">
              <Trophy size={18}/> SLIP
            </h3>
            <button onClick={() => setIsMobileSlipOpen(false)} className="bg-white/5 p-2 rounded-full active:scale-90 transition-transform">
              <X size={20}/>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-[#0b0f1a]">
            <Betslip items={slipItems} setItems={setSlipItems} />
          </div>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-0 lg:gap-8 p-0 lg:p-8">
        
        {/* Left Content Area */}
        <main className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6">
          
          {/* Header & Breadcrumb */}
          <div className="flex items-center justify-between px-4 lg:px-0">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2.5 bg-[#1c2636] border border-white/5 hover:border-[#10b981]/50 hover:bg-[#253247] rounded-xl transition-all group">
                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              <div>
                <h1 className="text-[10px] font-black uppercase italic tracking-widest text-[#10b981] opacity-80">
                  {match.league_name}
                </h1>
                <p className="text-xs font-bold text-slate-500 uppercase">Match Center</p>
              </div>
            </div>
            {locked && (
              <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
                <Lock size={14} className="text-red-500" />
                <span className="text-[10px] font-black uppercase italic text-red-500">Markets Closed</span>
              </div>
            )}
          </div>

          {/* Epic Hero Section */}
          <div className={`relative overflow-hidden bg-[#111926] lg:rounded-3xl border-y lg:border border-white/5 min-h-[250px] flex items-center transition-all duration-700 ${locked ? 'saturate-50' : ''}`}>
            {/* Background Texture */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#10b981]/10 via-transparent to-blue-500/5" />
            
            <div className="w-full flex justify-around items-center px-4 relative z-10">
              {/* Home Team */}
              <div className="flex-1 flex flex-col items-center text-center group">
                <div className="w-20 h-20 bg-[#0b0f1a] rounded-2xl flex items-center justify-center border border-white/5 mb-4 group-hover:border-[#10b981]/40 transition-colors shadow-2xl">
                  <Shield size={40} className="text-[#10b981]" />
                </div>
                <h2 className="text-xl md:text-4xl font-black uppercase italic tracking-tighter leading-none max-w-[200px]">
                  {cleanName(match.home_team)}
                </h2>
              </div>

              {/* VS Divider */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[#f59e0b] text-5xl font-black italic tracking-tighter drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">VS</span>
                <div className={`px-4 py-1 rounded-full text-[11px] font-black uppercase italic border ${locked ? 'bg-red-500 border-red-400 text-white' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                  {locked ? 'LIVE' : formatFixedTime(match.commence_time)}
                </div>
              </div>

              {/* Away Team */}
              <div className="flex-1 flex flex-col items-center text-center group">
                <div className="w-20 h-20 bg-[#0b0f1a] rounded-2xl flex items-center justify-center border border-white/5 mb-4 group-hover:border-[#10b981]/40 transition-colors shadow-2xl">
                  <Shield size={40} className="text-[#10b981]" />
                </div>
                <h2 className="text-xl md:text-4xl font-black uppercase italic tracking-tighter leading-none max-w-[200px]">
                  {cleanName(match.away_team)}
                </h2>
              </div>
            </div>
          </div>

          {/* Odds Markets Container */}
          <div className={`px-4 lg:px-0 grid grid-cols-1 gap-6 pb-20 transition-all ${locked ? 'opacity-60 grayscale-[0.3]' : ''}`}>
            
            {/* Main Market: 1X2 */}
            <section>
              <h3 className="text-[11px] font-black uppercase italic text-slate-500 mb-3 tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse" />
                Winner (3-Way)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {mainMarkets.map((odd, idx) => {
                  const uniqueId = `${match.id}-1x2-${idx}`;
                  const isSelected = slipItems.find(item => item.id === uniqueId);
                  return (
                    <button 
                      key={idx}
                      disabled={locked}
                      onClick={() => toggleBet('Match Winner', odd.display, odd.val, uniqueId)}
                      className={`relative flex items-center justify-between h-14 px-6 rounded-2xl transition-all duration-300 border-2 overflow-hidden ${
                        isSelected 
                        ? 'bg-[#10b981] border-[#10b981] text-white shadow-lg shadow-[#10b981]/20 scale-[1.02]' 
                        : 'bg-[#111926] border-white/5 text-slate-300 hover:border-white/20 active:scale-95'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase italic leading-none truncate max-w-[70%]">{odd.display}</span>
                      <span className="text-base font-black italic tracking-tighter">{odd.val || '—'}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Scraped Deep Markets */}
            {match.deep_markets?.map((market, mIdx) => (
              <section key={mIdx}>
                <h3 className="text-[11px] font-black uppercase italic text-slate-500 mb-3 tracking-widest px-1">
                  {market.name}
                </h3>
                <div className={`grid gap-2 ${market.odds?.length > 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                  {market.odds?.map((odd, oIdx) => {
                    const uniqueId = `${match.id}-${market.name}-${oIdx}`;
                    const isSelected = slipItems.find(item => item.id === uniqueId);
                    const oddValue = odd.value || odd.odd_value;
                    return (
                      <button 
                        key={oIdx}
                        disabled={locked}
                        onClick={() => toggleBet(market.name, odd.display, oddValue, uniqueId)}
                        className={`flex items-center justify-between h-12 px-5 rounded-xl transition-all duration-200 border ${
                          isSelected 
                          ? 'bg-[#10b981] border-[#10b981] text-white shadow-md' 
                          : 'bg-[#1c2636]/50 border-white/5 text-slate-400 hover:bg-[#1c2636]'
                        }`}
                      >
                        <span className="text-[9px] font-black uppercase italic truncate max-w-[75%]">{odd.display}</span>
                        <span className="text-xs font-black italic">{oddValue || '—'}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </main>

        {/* Right Sidebar - Sticky Desktop Betslip */}
        <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
          <div className="sticky top-8 h-[calc(100vh-100px)] flex flex-col">
            <Betslip items={slipItems} setItems={setSlipItems} />
          </div>
        </aside>
      </div>

      {/* Mobile Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0b0f1a]/80 backdrop-blur-xl border-t border-white/5 h-20 flex lg:hidden z-[100] items-center justify-around px-6 pb-4">
        <Link href="/" className="flex flex-col items-center gap-1 text-slate-500">
          <LayoutGrid size={22} />
          <span className="text-[8px] font-black uppercase italic">Home</span>
        </Link>
        <div className="relative">
          <button 
            onClick={() => setIsMobileSlipOpen(true)}
            className="bg-[#10b981] w-14 h-14 rounded-2xl -mt-10 rotate-3 flex items-center justify-center text-white shadow-2xl shadow-[#10b981]/40 border-4 border-[#0b0f1a] active:scale-90 transition-transform"
          >
            <Trophy size={26} className="-rotate-3" />
            {slipItems.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-white text-black text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-[#10b981]">
                {slipItems.length}
              </span>
            )}
          </button>
        </div>
        <button className="flex flex-col items-center gap-1 text-slate-500">
          <Clock size={22} />
          <span className="text-[8px] font-black uppercase italic">Live</span>
        </button>
      </nav>
    </div>
  );
}

// getServerSideProps remains the same to handle your Supabase structure
export async function getServerSideProps({ params }) {
  const { matchId } = params;
  try {
    const { data, error } = await supabase
      .from('api_events')
      .select(`*, api_event_details ( markets )`)
      .eq('id', matchId)
      .single();

    if (error || !data) return { notFound: true };

    const details = data.api_event_details;
    let rawMarkets = [];
    
    if (Array.isArray(details) && details.length > 0) {
      rawMarkets = details[0]?.markets?.data || details[0]?.markets || [];
    } else if (details) {
      rawMarkets = details.markets?.data || details.markets || [];
    }

    return {
      props: {
        match: JSON.parse(JSON.stringify({ ...data, deep_markets: rawMarkets }))
      }
    };
  } catch (err) {
    return { notFound: true };
  }
}
