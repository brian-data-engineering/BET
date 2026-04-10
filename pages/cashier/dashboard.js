import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import Betslip from '../../components/cashier/BetSlip'; 
import PrintableTicket from '../../components/cashier/PrintableTicket'; 
import { Loader2, Search } from 'lucide-react';

export default function CashierDashboard() {
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState("");
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTicket, setCurrentTicket] = useState(null);
  const [userProfile, setUserProfile] = useState(null); 
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const shouldPrintRef = useRef(false);

  const initTerminal = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    // Fetch profile including the selection limit column
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (profile) setUserProfile(profile);
  }, []);

  useEffect(() => { initTerminal(); }, [initTerminal]);

  // Printing logic
  useEffect(() => {
    if (currentTicket && shouldPrintRef.current && currentTicket.ticket_serial) {
      const timer = setTimeout(() => {
        const previewElement = document.getElementById('visible-preview');
        if (!previewElement) return;
        
        const printContainer = document.createElement('div');
        printContainer.id = 'temp-print-portal';
        printContainer.innerHTML = `<div style="background:white;width:100%;">${previewElement.innerHTML}</div>`;

        document.body.appendChild(printContainer);
        window.focus();
        window.print();

        setTimeout(() => {
          if (document.getElementById('temp-print-portal')) {
            document.body.removeChild(printContainer);
          }
          shouldPrintRef.current = false;
        }, 1000);
      }, 1500); 
      return () => clearTimeout(timer);
    }
  }, [currentTicket]);

  const handleLoadTicket = async () => {
    if (!searchQuery || isSearching) return;
    setIsSearching(true);
    const input = searchQuery.trim().toUpperCase();
    
    try {
      const { data: booking, error } = await supabase
        .from('betsnow')
        .select('*')
        .eq('booking_code', input)
        .maybeSingle();
          
      if (!booking || error) return alert("⚠️ BOOKING CODE NOT FOUND");

      let selections = typeof booking.selections === 'string' 
        ? JSON.parse(booking.selections) 
        : (booking.selections || []);

      // Enrichment logic for events
      const matchIds = selections.map(s => String(s.matchId || s.match_id).trim());
      const { data: eventData } = await supabase
        .from('api_events')
        .select('id, display_league, commence_time, country, sport_key') 
        .in('id', matchIds);

      if (eventData) {
        selections = selections.map(sel => {
          const mid = String(sel.matchId || sel.match_id).trim();
          const event = eventData.find(e => String(e.id).trim() === mid);
          return {
            ...sel,
            sport_key: event?.sport_key || sel.sport_key || "Soccer",
            display_league: event?.display_league || sel.display_league || "League",
            startTime: event?.commence_time || sel.startTime || sel.clean_start_time,
            country: event?.country || sel.country || "Unknown"
          };
        });
      }

      setCart(selections);
      setStake(booking.stake?.toString() || "100");
      setCurrentTicket({ ...booking, selections, operator_logo: userProfile?.logo_url }); 
      shouldPrintRef.current = false; 
      setSearchQuery('');

    } catch (err) { 
      console.error(err); 
      alert("Error loading booking");
    } finally { 
      setIsSearching(false); 
    }
  };

  const handleProcessPayment = async () => {
    const numStake = parseFloat(stake);
    const totalOdds = cart.reduce((acc, item) => acc * parseFloat(item?.odds || 1), 1);
    
    if (!numStake || numStake <= 0 || numStake > (userProfile?.balance || 0)) return alert("Check Stake/Balance");
    if (!currentTicket?.booking_code) return alert("No active booking loaded");

    setIsProcessing(true);
    try {
      // THE FIX: Pass selections, stake, and odds to the RPC
      // This ensures the database uses the EDITED values
      const { data, error: rpcError } = await supabase.rpc('process_lucra_payment', {
        p_booking_code: currentTicket.booking_code.toString(),
        p_cashier_id: userProfile.id,
        p_stake: numStake,
        p_selections: cart, // Sends the edited games (e.g. 13 instead of 14)
        p_total_odds: totalOdds,
        p_status: 'pending'
      });

      if (rpcError) throw rpcError;

      // Extract metadata for the print table record
      const sportsSet = [...new Set(cart.map(s => s.sport_key || "Soccer"))];
      const countriesSet = [...new Set(cart.map(s => s.country || "Unknown"))];
      const leaguesSet = [...new Set(cart.map(s => s.display_league || "League"))];

      // Update the print record with metadata for reports
      await supabase
        .from('print')
        .update({
          country: countriesSet.join(', '),
          sport_key: sportsSet.join(', '),
          display_league: leaguesSet.join(', ')
        })
        .eq('id', data.ticket_id);

      // Fetch the final official record for printing
      const { data: official } = await supabase
        .from('print')
        .select('*')
        .eq('id', data.ticket_id)
        .single();

      if (official) {
        setCurrentTicket({ 
          ...official, 
          selections: cart, 
          operator_logo: userProfile?.logo_url 
        });
        shouldPrintRef.current = true; 
        setCart([]);
        setStake("");
        initTerminal(); // Refresh balance
      }
    } catch (err) { 
      alert(err.message || "Payment failed"); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  return (
    <CashierLayout>
      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <h2 className="text-white text-xl font-black mb-4 italic uppercase flex items-center gap-2">
              <Search className="text-[#10b981]" /> Terminal Load
            </h2>
            <div className="flex gap-2">
              <input 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleLoadTicket()} 
                placeholder="Enter Booking Code..." 
                className="flex-1 bg-black border-2 border-zinc-700 rounded-xl px-4 py-4 text-white font-mono text-xl focus:border-[#10b981] outline-none" 
              />
              <button 
                onClick={handleLoadTicket} 
                disabled={isSearching} 
                className="bg-[#10b981] text-black font-black px-8 rounded-xl"
              >
                {isSearching ? <Loader2 className="animate-spin" /> : "LOAD"}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
                <p className="text-zinc-500 text-[10px] font-black uppercase">Float Balance</p>
                <p className="text-white text-3xl font-black">KSh {userProfile?.balance?.toLocaleString() || "0.00"}</p>
              </div>
              <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
                <p className="text-zinc-500 text-[10px] font-black uppercase">Active Shop</p>
                <p className="text-[#10b981] text-xl font-black">{userProfile?.shop_name || "LUCRA"}</p>
              </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <Betslip 
            cart={cart} 
            setCart={setCart} 
            stake={stake} 
            onStakeChange={setStake} 
            onRemove={(idx) => setCart(prev => prev.filter((_, i) => i !== idx))} 
            onClear={() => {setCart([]); setCurrentTicket(null);}} 
            onProcess={handleProcessPayment} 
            isProcessing={isProcessing} 
            user={userProfile} 
          />
        </div>
      </div>

      {currentTicket && (
        <div className="hidden no-print" aria-hidden="true">
          <div id="visible-preview">
            <PrintableTicket ticket={currentTicket} isReprint={false} />
          </div>
        </div>
      )}

      <style jsx global>{`
        @media screen { #temp-print-portal { display: none !important; } }
        @media print {
          #__next, .no-print { display: none !important; }
          #temp-print-portal { display: block !important; width: 100%; }
        }
      `}</style>
    </CashierLayout>
  );
}
