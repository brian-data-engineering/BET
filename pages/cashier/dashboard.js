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

  // AUTO-PRINT LOGIC
  useEffect(() => {
    if (currentTicket && shouldPrintRef.current && currentTicket.ticket_serial) {
      console.log("💎 [SYSTEM] Official Ticket Detected. Printing in 1s...");
      const timer = setTimeout(() => {
        window.focus();
        window.print();
        shouldPrintRef.current = false; 
        // We do NOT null the ticket here so it stays visible for you to see
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentTicket]);

  const handleLoadTicket = async () => {
    if (!searchQuery || isSearching) return;
    setIsSearching(true);
    const input = searchQuery.trim().toUpperCase();
    try {
      const { data: printedTicket } = await supabase
        .from('print')
        .select('*')
        .or(`ticket_serial.eq.${input},booking_code.eq.${input}`)
        .maybeSingle();

      if (printedTicket) {
        shouldPrintRef.current = true; 
        setCurrentTicket(printedTicket); 
        setSearchQuery('');
        return;
      }

      const { data: booking } = await supabase.from('betsnow').select('*').eq('booking_code', input).maybeSingle();
      if (!booking) return alert("⚠️ NOT FOUND");

      const rawSelections = typeof booking.selections === 'string' ? JSON.parse(booking.selections) : booking.selections;
      setCart(rawSelections || []);
      setStake(booking.stake?.toString() || "100");
      shouldPrintRef.current = false; 
      setCurrentTicket(booking); 
      setSearchQuery('');
    } catch (err) { console.error(err); } finally { setIsSearching(false); }
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
      const { data: officialTicket } = await supabase.from('print').select('*').eq('ticket_serial', newSerial).single();

      if (officialTicket) {
        shouldPrintRef.current = true;
        setCurrentTicket(officialTicket);
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
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
             <h2 className="text-white text-xl font-black mb-4 flex items-center gap-2 italic uppercase">
              <Search className="text-[#10b981]" /> Terminal Load
            </h2>
            <div className="flex gap-2">
              <input 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleLoadTicket()} 
                placeholder="Enter Code..." 
                className="flex-1 bg-black border-2 border-zinc-700 rounded-xl px-4 py-4 text-white font-mono text-xl" 
              />
              <button onClick={handleLoadTicket} disabled={isSearching} className="bg-[#10b981] text-black font-black px-8 rounded-xl">
                {isSearching ? <Loader2 className="animate-spin" /> : "LOAD"}
              </button>
            </div>
          </div>
          {/* Stats area */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800"><p className="text-zinc-500 text-[10px] font-black uppercase">Float</p><p className="text-white text-3xl font-black">KSh {userProfile?.balance?.toLocaleString() || "0.00"}</p></div>
             <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800"><p className="text-zinc-500 text-[10px] font-black uppercase">Shop</p><p className="text-[#10b981] text-xl font-black">{userProfile?.shop_name || "LUCRA"}</p></div>
          </div>
        </div>
        <div className="lg:col-span-1">
          <Betslip cart={cart} setCart={setCart} stake={stake} onStakeChange={setStake} onRemove={(idx) => setCart(prev => prev.filter((_, i) => i !== idx))} onClear={() => {setCart([]); setCurrentTicket(null);}} onProcess={handleProcessPayment} isProcessing={isProcessing} user={userProfile} />
        </div>
      </div>

      {/* --- VISIBLE TICKET PREVIEW AREA --- */}
      {currentTicket && (
        <div className="lucra-preview-container no-print">
          <div className="bg-white p-4 shadow-2xl border-t-4 border-[#10b981] max-w-[350px] mx-auto mt-10">
            <p className="text-[10px] text-gray-400 text-center mb-2 font-mono">--- LIVE PRINTER PREVIEW ---</p>
            <PrintableTicket ticket={currentTicket} />
          </div>
        </div>
      )}

      {/* --- REAL PRINT AREA (HIDDEN) --- */}
      {currentTicket && shouldPrintRef.current && (
        <div className="lucra-print-area">
          <PrintableTicket ticket={currentTicket} />
        </div>
      )}

      <style jsx global>{`
        @media screen {
          .lucra-print-area { display: none; }
          .lucra-preview-container { display: block; }
        }
        @media print {
          body > *:not(.lucra-print-area) { display: none !important; }
          .lucra-print-area { display: block !important; position: absolute; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
    </CashierLayout>
  );
}
