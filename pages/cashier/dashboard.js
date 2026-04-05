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

  // EFFECT: The "Blank Page Killer"
  useEffect(() => {
    if (currentTicket && shouldPrintRef.current) {
      // 1.5s allows React to render and the Browser to cache the Logo/Barcode
      const timer = setTimeout(() => {
        window.print();
        shouldPrintRef.current = false; 
        
        // Safety: Keep ticket on screen for 3 more seconds after print window opens
        // This ensures the browser doesn't "lose" the content if the cashier hits cancel
        setTimeout(() => {
          if (!shouldPrintRef.current) setCurrentTicket(null);
        }, 3000);
      }, 1500); 
      return () => clearTimeout(timer);
    }
  }, [currentTicket]);

  const handleLoadTicket = async () => {
    if (!searchQuery || isSearching) return;
    setIsSearching(true);
    const input = searchQuery.trim().toUpperCase();
    
    try {
      const { data: ticket, error } = await supabase
        .from('betsnow')
        .select('*')
        .or(`booking_code.eq.${input},ticket_serial.eq.${input}`)
        .single();

      if (error || !ticket) {
        alert("⚠️ INVALID CODE OR TICKET NOT FOUND");
        return;
      }

      const rawSelections = typeof ticket.selections === 'string' ? JSON.parse(ticket.selections) : ticket.selections;
      
      if (ticket.ticket_serial) {
        if (confirm("🎟️ TICKET ALREADY PAID. REPRINT?")) {
          const { data: printedDoc } = await supabase.from('print').select('*').eq('ticket_serial', ticket.ticket_serial).single();
          shouldPrintRef.current = true;
          setCurrentTicket(printedDoc);
        }
      } else {
        setCart(rawSelections || []);
        setStake(ticket.stake?.toString() || "100");
        setCurrentTicket(ticket); 
      }
      setSearchQuery('');
    } catch (err) { console.error(err); } finally { setIsSearching(false); }
  };

  const handleProcessPayment = async () => {
    const numStake = parseFloat(stake);
    if (!numStake || numStake <= 0) return alert("Enter stake");
    if (numStake > (userProfile?.balance || 0)) return alert("⚠️ INSUFFICIENT FLOAT");
    
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

      // Wait for DB consistency
      await new Promise(res => setTimeout(res, 1200));

      const { data: officialTicket, error: fetchError } = await supabase
        .from('print')
        .select('*')
        .eq('ticket_serial', newSerial)
        .single();

      if (fetchError || !officialTicket) throw new Error("Sync failed. Record not found.");

      // Set print intent BEFORE setting the ticket
      shouldPrintRef.current = true;
      setCurrentTicket(officialTicket);
      
      // RESET UI elements only - currentTicket stays until the Effect clears it
      setCart([]);
      setStake("");
      initTerminal(); 

    } catch (err) { alert("❌ TERMINAL ERROR: " + err.message); } finally { setIsProcessing(false); }
  };

  return (
    <CashierLayout>
      {/* Container for the Screen UI */}
      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <h2 className="text-white text-xl font-black mb-4 flex items-center gap-2 italic uppercase">
              <Search className="text-[#10b981]" /> Load Terminal Code
            </h2>
            <div className="flex gap-2">
              <input 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleLoadTicket()} 
                placeholder="Enter Booking Code..." 
                className="flex-1 bg-black border-2 border-zinc-700 rounded-xl px-4 py-4 text-white font-mono text-xl outline-none focus:border-[#10b981]" 
              />
              <button 
                onClick={handleLoadTicket} 
                disabled={isSearching} 
                className="bg-[#10b981] hover:bg-[#059669] text-black font-black px-8 rounded-xl"
              >
                {isSearching ? <Loader2 className="animate-spin" /> : "LOAD"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Available Float</p>
              <p className="text-white text-3xl font-black italic tabular-nums">KSh {userProfile?.balance?.toLocaleString() || "0.00"}</p>
            </div>
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Terminal</p>
              <p className="text-[#10b981] text-xl font-black uppercase truncate">{userProfile?.shop_name || "LUCRA"}</p>
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

      {/* Container for the Printer - Absolute positioning for thermal paper */}
      {currentTicket && (
        <div className="lucra-print-area">
          <PrintableTicket ticket={currentTicket} />
        </div>
      )}

      <style jsx global>{`
        @media screen { 
          .lucra-print-area { display: none !important; } 
        }
        @media print {
          /* Force everything else to disappear */
          #__next > :not(.lucra-print-area),
          .no-print,
          aside,
          nav { display: none !important; }
          
          /* Show only the ticket area */
          .lucra-print-area { 
            display: block !important; 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 72mm !important; 
            background: white !important;
          }
        }
      `}</style>
    </CashierLayout>
  );
}
