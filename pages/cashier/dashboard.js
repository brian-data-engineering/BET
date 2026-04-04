import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import Betslip from '../../components/cashier/BetSlip'; 
import PrintableTicket from '../../components/cashier/PrintableTicket'; 
import { Loader2, RefreshCw, Zap } from 'lucide-react';

export default function CashierDashboard() {
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState("");
  const [searchQuery, setSearchQuery] = useState('');
  const [cashierBalance, setCashierBalance] = useState(0);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [user, setUser] = useState(null);
  
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- INITIALIZE TERMINAL & AUTH ---
  const initTerminal = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      console.error("No active session found");
      return;
    }
    
    setUser(authUser);
    
    // Fetch fresh balance for this specific cashier profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', authUser.id)
      .single();
      
    if (profile) setCashierBalance(parseFloat(profile.balance || 0));
  }, []);

  useEffect(() => { 
    initTerminal(); 
  }, [initTerminal]);

  // --- TICKET LOADING LOGIC ---
  const handleLoadTicket = async () => {
    if (!searchQuery) return;
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
        setSearchQuery('');
        return;
      }

      // Ensure selections is an array (handles JSON strings from DB)
      const rawSelections = Array.isArray(ticket.selections) 
        ? ticket.selections 
        : JSON.parse(ticket.selections || '[]');

      if (ticket.is_paid || ticket.ticket_serial) {
        setCurrentTicket(ticket);
        if (confirm("🎟️ TICKET ALREADY PAID. REPRINT?")) {
          setTimeout(() => { window.print(); }, 500);
        }
      } else {
        // --- SYNC CHECK ON LOAD ---
        const now = new Date().getTime();
        const validSelections = rawSelections.filter(item => {
          if (!item.startTime) return true;
          const cleanTime = item.startTime.split('+')[0].replace(' ', 'T');
          const matchDate = new Date(cleanTime).getTime();
          // Remove if it started already or is in the 60s lock window
          return (matchDate - now) > 60000;
        });

        if (validSelections.length === 0) {
          alert("⚠️ ALL MATCHES IN THIS SLIP HAVE EXPIRED/STARTED.");
          return;
        }

        setCurrentTicket(ticket); 
        setCart(validSelections);
        setStake(ticket.stake?.toString() || "100");
      }
      setSearchQuery('');
    } catch (err) {
      console.error("Load Error:", err);
      alert("❌ ERROR LOADING TICKET");
    } finally {
      setIsSearching(false);
    }
  };

  // --- PAYMENT PROCESSING ---
  const handleProcessPayment = async () => {
    const numStake = parseFloat(stake);
    
    if (!numStake || numStake <= 0) return alert("Enter valid stake");
    if (numStake > cashierBalance) return alert("⚠️ INSUFFICIENT FLOAT");
    
    if (!user?.id) {
      alert("❌ SESSION ERROR: Re-initializing terminal...");
      await initTerminal();
      return;
    }

    const targetCode = currentTicket?.booking_code;
    if (!targetCode) return alert("No valid booking code to process.");

    setIsProcessing(true);
    try {
      const newSerial = Math.floor(1000000000 + Math.random() * 9000000000).toString();

      // Executes Postgres function to handle balance and ticket status atomically
      const { data: paidTicket, error: rpcError } = await supabase.rpc('process_lucra_payment', {
        p_booking_code: targetCode.toString(),
        p_cashier_id: user.id,
        p_generated_serial: newSerial,
        p_stake: numStake
      });

      if (rpcError) throw rpcError;

      setCurrentTicket(paidTicket);
      
      // Allow state to settle, then print and wipe
      setTimeout(async () => {
        window.print();
        setCart([]);
        setStake("");
        setCurrentTicket(null);
        await initTerminal(); // Update float balance immediately after print
        setIsProcessing(false);
      }, 800);

    } catch (err) {
      console.error("Payment Error:", err);
      alert("❌ DATABASE REJECTED: " + (err.message || "Check network connection"));
      setIsProcessing(false);
    }
  };

  return (
    <CashierLayout>
      <div className="flex h-[calc(100vh-64px)] bg-[#080b13] text-white overflow-hidden">
        
        {/* LEFT: SCANNER & TERMINAL INFO */}
        <div className="flex-1 p-10 flex flex-col items-center justify-center border-r border-white/5">
          <div className="w-full max-w-xl">
            <div className="flex items-center gap-3 mb-8">
              <Zap className="text-[#10b981]" fill="#10b981" size={24} />
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">Lucra Terminal</h2>
            </div>

            <div className="relative">
              <input 
                type="text"
                placeholder="SCAN CODE (e.g. 1129)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadTicket()}
                className="w-full bg-[#111926] border-2 border-white/5 rounded-2xl py-6 pl-6 pr-32 text-2xl font-black outline-none focus:border-[#10b981] transition-all uppercase"
              />
              <button 
                onClick={handleLoadTicket}
                disabled={isSearching}
                className="absolute right-2 top-2 bottom-2 bg-[#10b981] text-black px-6 rounded-xl font-black italic hover:brightness-110 active:scale-95 transition-all"
              >
                {isSearching ? <Loader2 className="animate-spin" /> : "LOAD"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="bg-[#111926] p-6 rounded-2xl border border-white/5">
                <p className="text-[10px] font-bold opacity-30 uppercase mb-1 tracking-widest">Active Float</p>
                <p className="text-xl font-black italic text-[#10b981]">
                  KES {cashierBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <button 
                onClick={initTerminal}
                className="bg-[#111926] p-6 rounded-2xl border border-white/5 flex items-center justify-center hover:bg-white/5 transition-colors group"
              >
                <RefreshCw size={24} className={`${isSearching ? "animate-spin" : ""} group-hover:rotate-180 transition-transform duration-500`} />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: BETSLIP & ACTION */}
        <div className="w-[400px] flex flex-col bg-[#0b0f1a]">
          <div className="flex-1 overflow-hidden">
            <Betslip 
              cart={cart}
              setCart={setCart} 
              stake={stake}
              onStakeChange={setStake}
              onRemove={(idx) => setCart(prev => prev.filter((_, i) => i !== idx))}
              onClear={() => { setCart([]); setStake(""); setCurrentTicket(null); }}
              isProcessing={isProcessing}
            />
          </div>
          
          {cart.length > 0 && (
            <div className="p-6 bg-[#0b0f1a] border-t border-white/5">
              <button 
                onClick={handleProcessPayment}
                disabled={isProcessing}
                className="w-full bg-[#10b981] hover:brightness-110 text-black py-5 rounded-xl font-black text-lg flex items-center justify-center gap-3 shadow-lg shadow-[#10b981]/20 transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" />
                    <span>SYNCHRONIZING...</span>
                  </>
                ) : (
                  "CONFIRM & PRINT"
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* INVISIBLE PRINT COMPONENT */}
      <div className="hidden print:block">
        <PrintableTicket 
          ticket={currentTicket} 
          cart={cart} 
          stake={parseFloat(stake)} 
          user={user} 
        />
      </div>
    </CashierLayout>
  );
}
