import { Ticket, X, Trash2, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Betslip({ items = [], setItems }) {
  const [bookingCode, setBookingCode] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [stake, setStake] = useState(100);
  const MAX_GAMES = 20;

  // --- AUTO-CLEAR BOOKING CODE ON NEW INTERACTION ---
  useEffect(() => {
    if (bookingCode && items.length > 0) {
      setBookingCode(null);
    }
  }, [items, bookingCode]);

  // --- AUTO-REMOVE EXPIRED MATCHES ---
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = new Date().getTime();
      
      setItems(prevItems => {
        const filtered = prevItems.filter(item => {
          if (!item.startTime) return true;

          // 1. Clean the string (handle potential scrap artifacts)
          const cleanTime = item.startTime.split('+')[0].replace(' ', 'T');
          const matchDate = new Date(cleanTime).getTime();

          if (isNaN(matchDate)) return true; // Keep if date is weird

          // 2. NO OFFSET: Treat DB time as the actual kickoff time
          return (matchDate - now) > 60000; 
        });

        return filtered.length !== prevItems.length ? filtered : prevItems;
      });
    }, 5000);
    return () => clearInterval(checkInterval);
  }, [setItems]);

  const totalOdds = useMemo(() => {
    return items.reduce((acc, item) => acc * (parseFloat(item.odds) || 1), 1).toFixed(2);
  }, [items]);

  const potentialWinningsRaw = useMemo(() => {
    return parseFloat(totalOdds) * (parseFloat(stake) || 0);
  }, [totalOdds, stake]);

  const potentialWinningsFormatted = useMemo(() => {
    return potentialWinningsRaw.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [potentialWinningsRaw]);

  const handleBookBet = async () => {
    if (items.length === 0 || items.length > MAX_GAMES) return;
    
    setIsBooking(true);
    try {
      const finalCode = Math.floor(1000 + Math.random() * 9000).toString();
      const matchIds = items.map(item => item.matchId).filter(Boolean);
      
      let countryValue = "Unknown";
      let leagueValue = "Unknown League";

      if (matchIds.length > 0) {
        try {
          const { data: eventsData } = await supabase
            .from('api_events')
            .select('country, display_league, league_name')
            .in('id', matchIds);

          if (eventsData && eventsData.length > 0) {
            const countries = [...new Set(eventsData.map(e => e.country).filter(Boolean))];
            const leagues = [...new Set(eventsData.map(e => e.display_league || e.league_name).filter(Boolean))];
            countryValue = countries.length > 0 ? countries.join(', ') : "Unknown";
            leagueValue = leagues.length > 0 ? leagues.join(', ') : "Unknown League";
          }
        } catch (err) {
          console.warn("Could not fetch multi-match mapping.");
        }
      }
      
      const { error } = await supabase.from('betsnow').insert([{ 
        booking_code: finalCode, 
        selections: items, 
        stake: parseFloat(stake) || 100,
        total_odds: parseFloat(totalOdds),
        potential_payout: potentialWinningsRaw,
        status: 'pending',
        is_paid: false,
        event_id: matchIds.join(','),
        country: countryValue,
        league_name: leagueValue
      }]);

      if (error) throw error;
      
      setBookingCode(finalCode);
      setItems([]); 

      if (navigator.clipboard) {
        navigator.clipboard.writeText(finalCode);
      }
    } catch (err) {
      console.error("Booking Error:", err);
      alert("System Busy. Please try again.");
    } finally { 
      setIsBooking(false); 
    }
  };

  return (
    <div className="bg-[#111926] border border-white/5 lg:rounded-2xl overflow-hidden flex flex-col h-full w-full">
      <div className="bg-[#0b0f1a]/50 p-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Ticket size={18} className="text-[#10b981]" />
          <span className={`text-[11px] font-black uppercase tracking-wider ${items.length > MAX_GAMES ? 'text-red-500' : 'text-white'}`}>
            Betslip ({items.length}/{MAX_GAMES})
          </span>
        </div>
        {items.length > 0 && !bookingCode && (
          <button onClick={() => setItems([])} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="p-3">
          {bookingCode ? (
            <div className="py-6 text-center animate-in zoom-in-95">
              <CheckCircle2 size={44} className="text-[#10b981] mx-auto mb-3" />
              <div className="bg-[#0b0f1a] border-2 border-dashed border-[#10b981]/40 p-6 rounded-2xl mb-4">
                <span className="text-4xl font-black tracking-[0.2em] text-[#f59e0b]">{bookingCode}</span>
                <p className="text-[9px] text-slate-500 mt-2 font-bold uppercase">Code Copied!</p>
              </div>
              <button onClick={() => setBookingCode(null)} className="text-[10px] font-bold text-[#10b981] uppercase hover:underline">Done</button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center opacity-20">
              <Ticket size={48} className="text-white mb-2" />
              <p className="text-[10px] font-bold text-white uppercase tracking-widest">Empty Slip</p>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="space-y-2 mb-6">
                {
