import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import Betslip from '../../components/cashier/Betslip';
import PrintableTicket from '../../components/cashier/PrintableTicket';
import { Loader2, Search, RefreshCw, Zap } from 'lucide-react';

export default function CashierDashboard() {
  // --- STATE MANAGEMENT ---
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState("");
  const [searchQuery, setSearchQuery] = useState('');
  const [cashierBalance, setCashierBalance] = useState(0);
  const [currentTicket, setCurrentTicket] = useState(null); // Data for the printer
  
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- DATA FETCHING ---
  const fetchCashierBalance = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
    if (profile) setCashierBalance(parseFloat(profile.balance || 0));
  }, []);

  useEffect(() => { fetchCashierBalance(); }, [fetchCashierBalance]);

  // --- CORE LOGIC: LOAD TICKET ---
  const handleLoadTicket = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    const input = searchQuery.trim().toUpperCase();

    try {
      const { data: ticket, error } = await supabase
        .from('betsnow')
        .select('*')
        .or(`booking_code.eq."${input}",ticket_serial.eq."${input}"`)
        .single();

      if (error || !ticket) {
        alert("⚠️ CODE INVALID OR EXPIRED");
        setSearchQuery('');
        return;
      }

      const selections = Array.isArray(ticket.selections) 
        ? ticket.selections 
        : JSON.parse(ticket.selections || '[]');

      // REPRINT LOGIC: If it has a serial, it's already paid
      if (ticket.ticket_serial || ticket.is_paid) {
        const confirmPrint = confirm(`🎟️ PAID TICKET: ${ticket.ticket_serial}\nWould you like to REPRINT the receipt?`);
        if (confirmPrint) {
          setCurrentTicket(ticket);
          setTimeout(() => { window.print(); }, 500);
        }
      } else {
        // FRESH BOOKING: Load into slip
        setCart(selections);
        setStake(ticket.stake?.toString() || "");
      }
      
      setSearchQuery('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // --- CORE LOGIC: PROCESS PAYMENT ---
  const handleProcessPayment = async () => {
    const numStake = parseFloat(stake);
    if (!numStake || numStake <= 0) return alert("Please enter a valid stake.");
    if (numStake > cashierBalance) return alert("⚠️ INSUFFICIENT FLOAT");

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const newSerial = Math.floor(1000000000 + Math.random() * 9000000000).toString();

      // We use the booking_code currently loaded in the slip context
      // Note: In a real "Manual" bet, you'd insert the ticket first. 
      // This assumes we are processing a booked ticket (9504 style).
      const { data: paidTicket, error: rpcError } = await supabase.rpc('process_lucra_payment', {
        p_booking_code: searchQuery || cart[0]?.booking_code, 
        p_cashier_id: user.id,
        p_generated_serial: newSerial
      });

      if (rpcError) throw rpcError;

      // Update Printer & UI
      setCurrentTicket(paidTicket);
      
      setTimeout(() => {
        window.print();
        // Clear Terminal
        setCart([]);
        setStake("");
        fetchCashierBalance();
        setIsProcessing(false);
      }, 700);

    } catch (err) {
      alert("❌ TRANSACTION FAILED: " + err.message);
      setIsProcessing(false);
    }
  };

  return (
    <CashierLayout>
      <div className="flex h-[calc(100vh-64px)] bg-[#080b13] text-white overflow-hidden font-sans">
        
        {/* LEFT COLUMN: SCANNER & UTILITIES */}
        <div className="flex-1 p-10 flex flex-col items-center justify-center border-r border-white/5">
          <div className="w-full max-w-xl">
            <div className="flex items-center gap-3 mb-8">
              <Zap className="text-[#10b981]" fill="#10b981" size={24} />
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">Lucra Terminal</h2>
            </div>

            {/* SEARCH BOX */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <Search className="text-white/20 group-focus-within:text-[#10b981] transition-colors" size={28} />
              </div>
              <input 
                type="text"
                placeholder="SCAN OR TYPE CODE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadTicket()}
                className="w-full bg-[#111926] border-2 border-white/5 rounded-[2rem] py-8 pl-16 pr-32 text-2xl font-black tracking-[0.2em] outline-none focus:border-[#10b981] transition-all uppercase placeholder:text-white/5"
              />
              <button 
                onClick={handleLoadTicket}
                disabled={isSearching}
                className="absolute right-3 top-3 bottom-3 bg-[#10b981] text-black px-8 rounded-[1.5rem] font-black italic hover:brightness-110 active:scale-95 transition-all"
              >
                {isSearching ? <Loader2 className="animate-spin" size={20} /> : "LOAD"}
              </button>
            </div>

            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="bg-[#111926] p-6 rounded-3xl border border-white/5">
                <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest mb-1">Terminal Status</p>
                <p className="text-[#10b981] font-black italic">ONLINE / READY</p>
              </div>
              <div className="bg-[#111926] p-6 rounded-3xl border border-white/5 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest mb-1">Current Float</p>
                  <p className="text-xl font-black italic">KES {cashierBalance.toLocaleString()}</p>
                </div>
                <button onClick={fetchCashierBalance} className="text-white/20 hover:text-[#10b981] transition-colors">
                   <RefreshCw size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: THE BETSLIP */}
        <div className="w-[450px]">
          <Betslip 
            cart={cart}
            stake={stake}
            onStakeChange={setStake}
            onRemove={(idx) => setCart(cart.filter((_, i) => i !== idx))}
            onClear={() => { setCart([]); setStake(""); }}
            isProcessing={isProcessing}
          />
          
          {/* THE MAIN ACTION BUTTON (Floating over slip) */}
          {cart.length > 0 && (
            <div className="px-6 pb-6 bg-[#111926]/40 backdrop-blur-md">
              <button 
                onClick={handleProcessPayment}
                disabled={isProcessing}
                className="w-full bg-[#10b981] hover:bg-[#059669] text-black py-6 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(16,185,129,0.2)] transition-all active:translate-y-1"
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : "DEDUCT & PRINT RECEIPT"}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* HIDDEN PRINT LAYER */}
      <div className="hidden print:block">
        <PrintableTicket 
          ticket={currentTicket} 
          cart={cart} 
          stake={parseFloat(stake)} 
        />
      </div>
    </CashierLayout>
  );
}
