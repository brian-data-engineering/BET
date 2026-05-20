import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import Betslip from '../../components/cashier/BetSlip'; 
import PrintableTicket from '../../components/cashier/PrintableTicket'; 
import { Loader2, Search, Wallet, Store } from 'lucide-react';

// Sports Tabs Configuration
const sportTabs = [
  { id: 'all',          name: 'All Sports',   icon: '🏆', sportKey: null          },
  { id: 'soccer',       name: 'Soccer',       icon: '⚽', sportKey: 'soccer'       },
  { id: 'basketball',   name: 'Basketball',   icon: '🏀', sportKey: 'basketball'   },
  { id: 'tennis',       name: 'Tennis',       icon: '🎾', sportKey: 'tennis'       },
  { id: 'ice-hockey',   name: 'Ice Hockey',   icon: '🏒', sportKey: 'ice-hockey'   },
  { id: 'table-tennis', name: 'Table Tennis', icon: '🏓', sportKey: 'table-tennis' },
];

export default function CashierDashboard() {
  // --- STATE MANAGEMENT ---
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState("100");
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTicket, setCurrentTicket] = useState(null);
  const [userProfile, setUserProfile] = useState(null); 
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Game Search & Filter State
  const [games, setGames] = useState([]);
  const [gameSearchQuery, setGameSearchQuery] = useState('');
  const [activeSport, setActiveSport] = useState('all');
  const [activeDate, setActiveDate] = useState('all');
  const [gamePage, setGamePage] = useState(1);
  const [totalGameCount, setTotalGameCount] = useState(0);
  const [isSearchingGames, setIsSearchingGames] = useState(false);
  const gamesPerPage = 10;

  const shouldPrintRef = useRef(false);

  // --- INITIALIZATION ---
  const initTerminal = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profile) setUserProfile(profile);
  }, []);

  useEffect(() => { initTerminal(); }, [initTerminal]);

  // --- GAME SEARCH LOGIC ---
  const fetchGames = useCallback(async (page = 1, search = '', sport = 'all', date = 'all') => {
    setIsSearchingGames(true);
    try {
      let query = supabase
        .from('xmatch_flat')
        .select('*', { count: 'exact' });

      // 1. Sport Filter
      if (sport !== 'all') {
        const sportKey = sportTabs.find(t => t.id === sport)?.sportKey;
        if (sportKey) query = query.eq('sport_key', sportKey);
      }

      // 2. Date Filter
      if (date !== 'all') {
        const now = new Date();
        if (date === 'today') {
          const start = new Date(now.setHours(0,0,0,0)).toISOString();
          const end = new Date(now.setHours(23,59,59,999)).toISOString();
          query = query.gte('start_time', start).lte('start_time', end);
        } else if (date === 'tomorrow') {
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const start = new Date(tomorrow.setHours(0,0,0,0)).toISOString();
          const end = new Date(tomorrow.setHours(23,59,59,999)).toISOString();
          query = query.gte('start_time', start).lte('start_time', end);
        }
      }

      // 3. Search Filter
      if (search) {
        query = query.or(`home_team.ilike.%${search}%,away_team.ilike.%${search}%,league_name.ilike.%${search}%`);
      }

      const { data, count, error } = await query
        .order('start_time', { ascending: true })
        .range((page - 1) * gamesPerPage, page * gamesPerPage - 1);

      if (error) throw error;
      setGames(data || []);
      setTotalGameCount(count || 0);
    } catch (err) {
      console.error("Game Search Error:", err.message);
    } finally {
      setIsSearchingGames(false);
    }
  }, []);

  useEffect(() => {
    fetchGames(gamePage, gameSearchQuery, activeSport, activeDate);
  }, [gamePage, gameSearchQuery, activeSport, activeDate, fetchGames]);

  const handleGameSearchChange = (e) => {
    setGameSearchQuery(e.target.value);
    setGamePage(1);
  };

  const handleSportChange = (sportId) => {
    setActiveSport(sportId);
    setGamePage(1);
  };

  const handleDateChange = (dateId) => {
    setActiveDate(dateId);
    setGamePage(1);
  };

  const toggleBet = (label, odds, match) => {
    const betId = `${match.match_id}-${label}`;
    const selectionLabel = label === '1' ? 'Home' : label === 'X' ? 'Draw' : 'Away';

    setCart(prev => {
      if (prev.find(item => item.id === betId)) return prev.filter(item => item.id !== betId);
      if (prev.length >= (userProfile?.cashier_selection_limit || 20)) return prev;
      return [...prev.filter(item => item.matchId !== match.match_id), {
        id: betId,
        matchId: match.match_id,
        league_id: match.league_id,
        matchName: `${match.home_team} vs ${match.away_team}`,
        selection: selectionLabel,
        marketName: 'Match Winner',
        odds: parseFloat(odds),
        startTime: match.start_time,
        sport_key: match.sport_key,
        display_league: match.league_name,
        country: match.league_name?.split('.')?.[0]?.trim() || 'International'
      }];
    });
  };

  // --- PRINTING ENGINE ---
  useEffect(() => {
    if (currentTicket?.ticket_serial && shouldPrintRef.current) {
      const timer = setTimeout(() => {
        const previewElement = document.getElementById('visible-preview');
        if (!previewElement) return;
        
        const printContainer = document.createElement('div');
        printContainer.id = 'temp-print-portal';
        printContainer.innerHTML = `<div style="background:white;width:100%;padding:20px;">${previewElement.innerHTML}</div>`;

        document.body.appendChild(printContainer);
        window.focus();
        window.print();

        setTimeout(() => {
          const portal = document.getElementById('temp-print-portal');
          if (portal) document.body.removeChild(portal);
          shouldPrintRef.current = false;
        }, 1000);
      }, 1000); 
      return () => clearTimeout(timer);
    }
  }, [currentTicket]);

  // --- LOAD BOOKING CODE ---
  const handleLoadTicket = async () => {
    const input = searchQuery.trim().toUpperCase();
    if (!input || isSearching) return;

    setIsSearching(true);
    try {
      const { data: booking, error } = await supabase
        .from('betsnow')
        .select('*')
        .eq('booking_code', input)
        .maybeSingle();
          
      if (error || !booking) throw new Error("Booking code not found or expired");

      const selections = Array.isArray(booking.selections) 
        ? booking.selections 
        : JSON.parse(booking.selections || '[]');

      // Sync with fresh API metadata for accurate printing
      const matchIds = selections.map(s => String(s.matchId || s.match_id).trim());
      const { data: eventData } = await supabase
        .from('api_events')
        .select('id, display_league, commence_time, country') 
        .in('id', matchIds);

      const normalized = selections.map(sel => {
        const mid = String(sel.matchId || sel.match_id).trim();
        const event = eventData?.find(e => String(e.id).trim() === mid);
        return {
          ...sel,
          id: sel.id || `${mid}-${sel.selection}`,
          odds: parseFloat(sel.odds || 1),
          display_league: event?.display_league || sel.display_league || "General League",
          startTime: event?.commence_time || sel.startTime,
          country: event?.country || sel.country
        };
      });

      setCart(normalized);
      setStake(booking.stake?.toString() || "100");
      setCurrentTicket({ ...booking, selections: normalized });
      shouldPrintRef.current = false; 
      setSearchQuery('');

    } catch (err) { 
      alert(err.message);
    } finally { 
      setIsSearching(false); 
    }
  };

  // --- PROCESS PAYMENT & ISSUE TICKET ---
  const handleProcessPayment = async () => {
    const numStake = parseFloat(stake);
    if (cart.length === 0) return alert("Betslip is empty");
    if (!numStake || numStake < 50) return alert("Minimum Stake: KSh 50");
    if (numStake > (userProfile?.balance || 0)) return alert("Insufficient Float Balance");

    setIsProcessing(true);
    try {
      const totalOdds = cart.reduce((acc, item) => acc * item.odds, 1);

      const { data, error: rpcError } = await supabase.rpc('process_lucra_payment', {
        p_booking_code: currentTicket?.booking_code || "MANUAL",
        p_cashier_id: userProfile.id,
        p_stake: numStake,
        p_selections: cart, 
        p_total_odds: parseFloat(totalOdds.toFixed(2)),
        p_status: 'pending' 
      });

      if (rpcError) throw rpcError;

      // The RPC returns the ticket_id; fetch final version for printing
      const { data: official, error: fetchError } = await supabase
        .from('print')
        .select('*')
        .eq('id', data.ticket_id)
        .single();

      if (fetchError) throw fetchError;

      if (official) {
        setCurrentTicket({ 
          ...official, 
          selections: cart, 
          operator_logo: userProfile?.logo_url 
        });
        
        shouldPrintRef.current = true; 
        setCart([]);
        setStake("100");
        initTerminal(); // Auto-refresh balance UI
      }
    } catch (err) { 
      alert(`Terminal Error: ${err.message}`); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  return (
    <CashierLayout>
      <div className="max-w-none mx-auto px-4 pt-0 pb-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start no-print">
        
        {/* Left Side: Search & Info */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[#111926] border border-white/5 p-4 rounded-3xl shadow-2xl mt-4">
            <h2 className="text-white text-[10px] font-black mb-2 uppercase tracking-[0.2em] flex items-center gap-2 opacity-70">
              <Search size={14} className="text-[#10b981]" /> Terminal Search
            </h2>
            <div className="flex gap-3">
              <input 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleLoadTicket()} 
                placeholder="ENTER BOOKING CODE..." 
                className="flex-1 bg-black border-2 border-white/5 rounded-2xl px-6 py-3 text-white font-mono text-xl focus:border-[#10b981] outline-none transition-all placeholder:opacity-20" 
              />
              <button 
                onClick={handleLoadTicket} 
                disabled={isSearching} 
                className="bg-[#10b981] hover:brightness-110 active:scale-95 text-black font-black px-8 rounded-2xl transition-all flex items-center justify-center min-w-[120px] text-lg italic"
              >
                {isSearching ? <Loader2 className="animate-spin" /> : "LOAD"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#111926] p-4 rounded-3xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Float Balance</p>
                <p className="text-white text-2xl font-black italic">
                  KSh {userProfile?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}
                </p>
              </div>
              <Wallet className="text-slate-700" size={28} />
            </div>
            
            <div className="bg-[#111926] p-4 rounded-3xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Station ID</p>
                <p className="text-[#10b981] text-xl font-black italic uppercase">
                  {userProfile?.shop_name || "LUCRA SHOP"}
                </p>
              </div>
              <Store className="text-slate-700" size={28} />
            </div>
          </div>

          {/* GAME SEARCH & QUICK BOOKING */}
          <div className="bg-[#111926] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            
            {/* SPORT TABS */}
            <div className="bg-[#0b0f1a]/80 p-2 border-b border-white/5 overflow-x-auto no-scrollbar flex gap-1.5 backdrop-blur-md">
               {sportTabs.map((tab) => (
                 <button
                   key={tab.id}
                   onClick={() => handleSportChange(tab.id)}
                   className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase italic tracking-widest transition-all whitespace-nowrap border ${
                     activeSport === tab.id 
                       ? 'bg-[#10b981] border-[#10b981] text-black shadow-lg shadow-[#10b981]/20' 
                       : 'bg-white/5 border-white/5 text-slate-500 hover:text-white hover:bg-white/10'
                   }`}
                 >
                   <span className="mr-2">{tab.icon}</span>{tab.name}
                 </button>
               ))}
            </div>

            {/* DATE TABS */}
            <div className="bg-[#0b0f1a]/30 p-1.5 border-b border-white/5 overflow-x-auto no-scrollbar flex gap-1.5">
               {[
                 { id: 'all', name: 'All Dates' },
                 { id: 'today', name: 'Today' },
                 { id: 'tomorrow', name: 'Tomorrow' },
               ].map((tab) => (
                 <button
                   key={tab.id}
                   onClick={() => handleDateChange(tab.id)}
                   className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                     activeDate === tab.id 
                       ? 'bg-white/10 border-white/20 text-white' 
                       : 'bg-transparent border-transparent text-slate-600 hover:text-slate-400'
                   }`}
                 >
                   {tab.name}
                 </button>
               ))}
            </div>

            <div className="p-4 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02]">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#10b981]/10 flex items-center justify-center border border-[#10b981]/20">
                    <Search size={16} className="text-[#10b981]" />
                  </div>
                  <div>
                    <h3 className="text-white text-[10px] font-black uppercase tracking-widest italic">Game Inventory</h3>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">Quick Selection Mode</p>
                  </div>
               </div>

               <div className="relative w-full md:w-64">
                 <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                 <input 
                   type="text" 
                   value={gameSearchQuery}
                   onChange={handleGameSearchChange}
                   placeholder="SEARCH TEAMS OR LEAGUES..."
                   className="w-full bg-black border border-white/5 rounded-xl py-2 pl-10 pr-4 text-[10px] font-black uppercase focus:border-[#10b981] outline-none transition-all placeholder:opacity-30"
                 />
               </div>
            </div>

            <div className="divide-y divide-white/5 min-h-[400px]">
              {isSearchingGames ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-30">
                  <Loader2 className="animate-spin text-[#10b981]" size={32} />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] italic">Syncing Markets...</span>
                </div>
              ) : games.length > 0 ? games.map((game) => {
                const startTime = new Date(game.start_time);
                const isLocked = startTime < new Date();

                return (
                  <div key={game.match_id} className={`p-3 hover:bg-white/[0.02] transition-all flex flex-col md:flex-row items-center justify-between gap-4 ${isLocked ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] font-black bg-white/5 px-2 py-0.5 rounded text-slate-500 uppercase italic truncate max-w-[120px]">
                          {game.league_name}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 italic whitespace-nowrap">
                          {startTime.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} {startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-black italic uppercase tracking-tight text-white truncate leading-none">{game.home_team}</p>
                        <p className="text-sm font-black italic uppercase tracking-tight text-white/60 truncate leading-none">{game.away_team}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
                      {[
                        { label: '1', odds: game.home_odds },
                        { label: 'X', odds: game.draw_odds },
                        { label: '2', odds: game.away_odds }
                      ].map((market) => {
                        const isSelected = cart.some(item => item.id === `${game.match_id}-${market.label}`);
                        return (
                          <button
                            key={market.label}
                            onClick={() => toggleBet(market.label, market.odds, game)}
                            className={`h-10 w-full md:w-16 rounded-xl flex flex-col items-center justify-center transition-all border ${
                              isSelected 
                                ? 'bg-[#10b981] border-[#10b981] text-black font-black' 
                                : 'bg-black border-white/5 text-white hover:border-[#10b981]/50'
                            }`}
                          >
                            <span className="text-[8px] opacity-40 uppercase font-black leading-none mb-0.5">{market.label}</span>
                            <span className="text-xs font-black leading-none">{parseFloat(market.odds || 0).toFixed(2)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }) : (
                <div className="py-20 text-center opacity-20 italic text-[10px] font-black uppercase tracking-widest">
                  No matches found matching search
                </div>
              )}
            </div>

            {/* GAME PAGINATION */}
            {totalGameCount > gamesPerPage && (
              <div className="p-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">
                  Page <span className="text-white">{gamePage}</span> of {Math.ceil(totalGameCount / gamesPerPage)}
                </span>
                <div className="flex gap-2">
                  <button 
                    disabled={gamePage === 1 || isSearchingGames}
                    onClick={() => setGamePage(prev => prev - 1)}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase hover:bg-white/10 disabled:opacity-20 transition-all"
                  >
                    Prev
                  </button>
                  <button 
                    disabled={gamePage * gamesPerPage >= totalGameCount || isSearchingGames}
                    onClick={() => setGamePage(prev => prev + 1)}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase hover:bg-white/10 disabled:opacity-20 transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Betslip */}
        <div className="lg:col-span-4 lg:sticky lg:top-20 lg:self-start">
          <div className="min-h-0 lg:h-[calc(100vh-5rem)]">
            <Betslip 
              items={cart} 
              setItems={setCart} 
              stake={stake} 
              setStake={setStake} 
              maxGames={userProfile?.cashier_selection_limit || 20}
              onProcess={handleProcessPayment} 
              isProcessing={isProcessing} 
              user={userProfile} 
            />
          </div>
        </div>
      </div>

      {/* Printing Layer */}
      {currentTicket && (
        <div className="hidden" aria-hidden="true">
          <div id="visible-preview">
            <PrintableTicket ticket={currentTicket} isReprint={false} />
          </div>
        </div>
      )}

      <style jsx global>{`
        @media screen { #temp-print-portal { display: none !important; } }
        @media print {
          body { background: white !important; margin: 0; padding: 0; }
          .no-print, #__next, .layout-header { display: none !important; }
          #temp-print-portal { 
            display: block !important; 
            width: 100%;
            height: auto;
            position: absolute;
            top: 0;
            left: 0;
          }
        }
      `}</style>
    </CashierLayout>
  );
}
