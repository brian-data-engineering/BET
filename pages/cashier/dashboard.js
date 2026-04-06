import { useState, useEffect, useCallback, useRef } from 'react';
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
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (profile) setUserProfile(profile);
  }, []);

  useEffect(() => { initTerminal(); }, [initTerminal]);

  // AUTO-PRINT VIA BODY INJECTION
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
      // 1. Check print table (reprints)
      const { data: printed } = await supabase.from('print')
        .select('*')
        .eq('ticket_serial', input)
        .maybeSingle();

      if (printed) {
        shouldPrintRef.current = true; 
        setCurrentTicket(printed); 
        setSearchQuery('');
        return;
      }

      // 2. Check betsnow table (new bookings)
      const { data: booking } = await supabase.from('betsnow').select('*').eq('booking_code', input).maybeSingle();
      if (!booking) return alert("⚠️ EXPIRED OR NOT FOUND");

      let selections = typeof booking.selections === 'string' ? JSON.parse(booking.selections) : (booking.selections || []);

      // --- ENRICHMENT LOGIC ---
      // Force IDs to strings to ensure they match the API events table
      const matchIds = selections.map(s => String(s.matchId));
      const { data: eventData } = await supabase
        .from('api_events')
        .select('id, display_league, commence_time') 
        .in('id', matchIds);

      if (eventData) {
        console.log("Enrichment Check:", eventData); // Verify data in console
        selections = selections.map(sel => {
          const event = eventData.find(e => String(e.id) === String(sel.matchId));
          return {
            ...sel,
            display_league: event?.display_league || "League",
            startTime: event?.commence_time || sel.startTime 
          };
        });
      }
      // -------------------------

      setCart(selections);
      setStake(booking.stake?.toString() || "100");
      shouldPrintRef.current = false; 
      
      // Update state with enriched selections for the printer
      setCurrentTicket({ ...booking, selections }); 
      setSearchQuery('');
    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsSearching(false); 
    }
  };

  const handleProcessPayment = async () => {
    const numStake = parseFloat(stake);
    if (!numStake || numStake <= 0 || numStake > (userProfile?.balance || 0)) return alert("Check Stake/Balance");
    setIsProcessing(true);
    try {
      const newSerial = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      
      const { error: rpcError } = await supabase.rpc('process_lucra_payment', {
        p_booking_code: currentTicket.booking_code.toString(),
        p_cashier_id: userProfile.id,
        p_generated_serial: newSerial,
        p_stake: numStake
      });
      if (rpcError) throw rpcError;

      await new Promise(res => setTimeout(res, 1500));
      const { data: official } = await supabase.from('print').select('*').eq('ticket_serial', newSerial).single();

      if (official) {
        shouldPrintRef.current = true;
        setCurrentTicket(official);
        setCart([]);
        setStake("");
        initTerminal(); 
      }
    } catch (err) { alert(err.message); } finally { setIsProcessing(false); }
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
                placeholder="Enter Code..." 
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
                <p className="text-zinc-500 text-[10px] font-black uppercase">Float</p>
                <p className="text-white text-3xl font-black">KSh {userProfile?.balance?.toLocaleString() || "0.00"}</p>
              </div>
              <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
                <p className="text-zinc-500 text-[10px] font-black uppercase">Shop</p>
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

      {/* HIDDEN PRINT SOURCE */}
      {currentTicket && (
        <div className="hidden no-print" aria-hidden="true">
          <div id="visible-preview">
            <PrintableTicket ticket={currentTicket} />
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
