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

  /**
   * THE LUCRA PRINT ENGINE v3.0
   * Fixes: 36s Edge Lag, White Screen, and Opacity bugs.
   */
  useEffect(() => {
    if (currentTicket && shouldPrintRef.current) {
      console.log("🛠️ [SYSTEM] Render detected. Stabilizing for print...");

      // Give React 800ms to mount the component and the Canvas Barcode
      const timer = setTimeout(() => {
        
        // requestAnimationFrame ensures the 'Paint' cycle is finished
        requestAnimationFrame(() => {
          console.log("🖨️ [SYSTEM] TRIGGERING WINDOW.PRINT()");
          
          window.focus(); // Vital for Edge to prevent background hangs
          window.print();
          
          shouldPrintRef.current = false;

          // Clear ticket state after 4 seconds to keep the preview stable
          setTimeout(() => {
            console.log("🧹 [SYSTEM] Resetting printer area.");
            setCurrentTicket(null);
          }, 4000);
        });

      }, 800); 
      
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
    } catch (err) {
      console.error("❌ Search Error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleProcessPayment = async () => {
    const numStake = parseFloat(stake);
    if (!numStake || numStake <= 0) return alert("Enter stake");
    if (numStake > (userProfile?.balance || 0)) return alert("⚠️ INSUFFICIENT FLOAT");
    
    setIsProcessing(true);
    console.log("💳 [PAYMENT] Initiating transaction...");

    try {
      const newSerial = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      
      const { error: rpcError } = await supabase.rpc('process_lucra_payment', {
        p_booking_code: currentTicket.booking_code.toString(),
        p_cashier_id: userProfile.id,
        p_generated_serial: newSerial,
        p_stake: numStake
      });

      if (rpcError) throw rpcError;

      // Small delay to let Supabase write the print record
      await new Promise(res => setTimeout(res, 1000));

      const { data: officialTicket, error: fetchError } = await supabase
        .from('print')
        .select('*')
        .eq('ticket_serial', newSerial)
        .single();

      if (fetchError || !officialTicket) throw new Error("Ledger Sync failed.");

      console.log("✅ [PAYMENT] Success. Sending to thermal engine...");
      
      // TRIGGER PRINT
      shouldPrintRef.current = true;
      setCurrentTicket(officialTicket);
      
      // CLEAR UI
      setCart([]);
      setStake("");
      initTerminal(); 

    } catch (err) {
      alert("❌ TERMINAL ERROR: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <CashierLayout>
      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <h2 className="text-white text-xl font-black mb-4 flex items-center gap-2 italic uppercase tracking-tighter">
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
                className="bg-[#10b981] hover:bg-[#059669] text-black font-black px-8 rounded-xl transition-all active:scale-95"
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

      {/* HIDDEN PRINT COMPONENT */}
      {currentTicket && (
        <div className="lucra-print-area">
          <PrintableTicket ticket={currentTicket} />
        </div>
      )}

      <style jsx global>{`
        @media screen { 
          .lucra-print-area { 
            position: fixed !important;
            top: -9999px !important;
            left: -9999px !important;
            opacity: 0 !important;
            pointer-events: none !important;
          } 
        }

        @media print {
          /* Hide everything except the ticket area */
          body > *:not(.lucra-print-area) { 
            display: none !important; 
          }

          .lucra-print-area { 
            display: block !important; 
            visibility: visible !important;
            opacity: 1 !important; 
            position: static !important;
            width: 72mm !important;
            background: white !important;
          }

          /* Global override for potential child opacity issues */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            opacity: 1 !important;
            color: black !important;
          }

          @page {
            size: auto;
            margin: 0mm;
          }
        }
      `}</style>
    </CashierLayout>
  );
}
