import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import Betslip from '../../components/cashier/BetSlip'; // Matches your BetSlip.js
import PrintableTicket from '../../components/cashier/PrintableTicket'; // Matches your PrintableTicket.js
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

  // 1. INITIALIZE USER & BALANCE
  const initTerminal = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    
    setUser(authUser);
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', authUser.id)
      .single();
      
    if (profile) setCashierBalance(parseFloat(profile.balance || 0));
  }, []);

  useEffect(() => { initTerminal(); }, [initTerminal]);

  // 2. LOAD TICKET LOGIC
  const handleLoadTicket = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    const input = searchQuery.trim().toUpperCase();

    try {
      // Use explicit text casting in the query to ensure 1129 (number) matches "1129" (text)
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

      const selections = Array.isArray(ticket.selections) 
        ? ticket.selections 
        : JSON.parse(ticket.selections || '[]');

      // If it's already paid, we just set the ticket for reprinting
      if (ticket.is_paid || ticket.ticket_serial) {
        setCurrentTicket(ticket);
        if (confirm("🎟️ TICKET ALREADY PAID. REPRINT?")) {
          setTimeout(() => { window.print(); }, 500);
        }
      } else {
        // Load into active slip for processing
        setCurrentTicket(ticket); 
        setCart(selections);
        setStake(ticket.stake?.toString() || "100");
      }
      setSearchQuery('');
    } catch (err) {
      console.error("Load Error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // 3. PAYMENT LOGIC
  const handleProcessPayment = async () => {
    const numStake = parseFloat(stake);
    if (!numStake || numStake <= 0) return alert("Enter stake");
    if (numStake > cashierBalance) return alert("⚠️ INSUFFICIENT FLOAT");
    if (!user) return alert("Session expired. Please refresh.");

    // Identify the code - ensure it is a string
    const targetCode = (currentTicket?.booking_code || cart[0]?.booking_code || searchQuery).toString();
    if (!targetCode) return alert("No booking code found to process.");

    setIsProcessing(true);
    try {
      const newSerial = Math.floor(1000000000 + Math.random() * 9000000000).toString();

      const { data: paidTicket, error: rpcError } = await supabase.rpc('process_lucra_payment', {
        p_booking_code: targetCode,
        p_cashier_id: user.id,
        p_generated_serial: newSerial
      });

      if (rpcError) throw rpcError;

      // Update state with the finalized ticket from DB
      setCurrentTicket(paidTicket);
      
      // Allow time for state to update before triggering print dialog
      setTimeout(() => {
        window.print();
        setCart([]);
        setStake("");
        initTerminal(); // Refresh float balance
        setIsProcessing(false);
      }, 800);

    } catch (err) {
      alert("❌ FAILED: " + (err.message || "Unknown Error"));
      setIsProcessing(false);
    }
  };

  return (
    <CashierLayout>
      <div className="flex h-[calc(100vh-64px)] bg-[#080b13] text-white overflow-hidden">
        
        {/* LEFT: SCANNER */}
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
                className="absolute right-2 top-2 bottom-2 bg-[#10b981] text-black px-6 rounded-xl font-black italic"
              >
                {isSearching ? <Loader2 className="animate-spin" /> : "LOAD"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="bg-[#111926] p-6 rounded-2xl border border-white/5">
                <p className="text-[10px] font-bold opacity-30 uppercase mb-1">Float Balance</p>
                <p className="text-xl font-black italic">KES {cashierBalance.toLocaleString()}</p>
              </div>
              <button 
                onClick={initTerminal}
                className="bg-[#111926] p-6 rounded-2xl border border-white/5 flex items-center justify-center hover:bg-white/5 transition-colors"
              >
                <RefreshCw size={24} className={isSearching ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: SLIP */}
        <div className="w-[400px] flex flex-col bg-[#0b0f1a]">
          <div className="flex-1 overflow-hidden">
            <Betslip 
              cart={cart}
              stake={stake}
              onStakeChange={setStake}
              onRemove={(idx) => setCart(cart.filter((_, i) => i !== idx))}
              onClear={() => { setCart([]); setStake(""); setCurrentTicket(null); }}
              isProcessing={isProcessing}
            />
          </div>
          
          {cart.length > 0 && (
            <div className="p-6 bg-[#0b0f1a] border-t border-white/5">
              <button 
                onClick={handleProcessPayment}
                disabled={isProcessing}
                className="w-full bg-[#10b981] hover:brightness-110 text-black py-5 rounded-xl font-black text-lg flex items-center justify-center gap-3 shadow-lg transition-all"
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : "CONFIRM & PRINT"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PRINTER (Hidden on screen, visible during window.print()) */}
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
