import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import Betslip from '../../components/cashier/BetSlip'; 
import PrintableTicket from '../../components/cashier/PrintableTicket'; 
import { Loader2, Search, Wallet, Store } from 'lucide-react';

export default function CashierDashboard() {
  // --- STATE MANAGEMENT ---
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState("100");
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTicket, setCurrentTicket] = useState(null);
  const [userProfile, setUserProfile] = useState(null); 
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
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
      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        
        {/* Left Side: Search & Info */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#111926] border border-white/5 p-8 rounded-3xl shadow-2xl">
            <h2 className="text-white text-xs font-black mb-4 uppercase tracking-[0.2em] flex items-center gap-2 opacity-70">
              <Search size={14} className="text-[#10b981]" /> Terminal Search
            </h2>
            <div className="flex gap-3">
              <input 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleLoadTicket()} 
                placeholder="ENTER BOOKING CODE..." 
                className="flex-1 bg-black border-2 border-white/5 rounded-2xl px-6 py-5 text-white font-mono text-3xl focus:border-[#10b981] outline-none transition-all placeholder:opacity-20" 
              />
              <button 
                onClick={handleLoadTicket} 
                disabled={isSearching} 
                className="bg-[#10b981] hover:brightness-110 active:scale-95 text-black font-black px-10 rounded-2xl transition-all flex items-center justify-center min-w-[160px] text-xl italic"
              >
                {isSearching ? <Loader2 className="animate-spin" /> : "LOAD"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#111926] p-6 rounded-3xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Float Balance</p>
                <p className="text-white text-3xl font-black italic">
                  KSh {userProfile?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}
                </p>
              </div>
              <Wallet className="text-slate-700" size={32} />
            </div>
            
            <div className="bg-[#111926] p-6 rounded-3xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Station ID</p>
                <p className="text-[#10b981] text-2xl font-black italic uppercase">
                  {userProfile?.shop_name || "LUCRA SHOP"}
                </p>
              </div>
              <Store className="text-slate-700" size={32} />
            </div>
          </div>
        </div>

        {/* Right Side: Betslip */}
        <div className="lg:col-span-4">
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
