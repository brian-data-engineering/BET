import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import PrintableTicket from '../../components/cashier/PrintableTicket';
import { Loader2, ReceiptText, Wallet, Printer, RefreshCw } from 'lucide-react';

export default function UnifiedTerminal() {
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState(0);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [cashierBalance, setCashierBalance] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Fetch Cashier Balance
  const fetchCashierData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
    if (profile) setCashierBalance(parseFloat(profile.balance || 0));
  }, []);

  useEffect(() => { fetchCashierData(); }, [fetchCashierData]);

  // 2. SMART LOAD: Handles New Bets and Reprints
  const handleLoadBooking = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    const cleanCode = searchQuery.trim().toUpperCase();

    try {
      // Search globally for the code (no longer filtering by ticket_serial here)
      const { data: ticket, error } = await supabase
        .from('betsnow')
        .select('*')
        .eq('booking_code', cleanCode)
        .single();

      if (error || !ticket) {
        alert("⚠️ CODE NOT FOUND. Please verify the code.");
        return;
      }

      // If the ticket is already paid, trigger Reprint Flow
      if (ticket.ticket_serial) {
        const reprint = confirm(`🎟️ TICKET ALREADY PAID\nSerial: ${ticket.ticket_serial}\n\nWould you like to REPRINT the receipt?`);
        if (reprint) {
          setCurrentTicket(ticket);
          setTimeout(() => window.print(), 500);
        }
        setSearchQuery('');
        return;
      }

      // If not paid, load it for the cashier to process
      setCart(ticket.selections || []);
      setStake(ticket.stake || 0);
      setActiveTicketId(ticket.id);
      setSearchQuery(''); 

    } catch (err) {
      console.error(err);
      alert("Error searching for code.");
    } finally {
      setIsSearching(false);
    }
  };

  // 3. ATOMIC PRINT & DEDUCT
  const handlePrintBet = async () => {
    if (!activeTicketId || cart.length === 0) return;
    
    if (cashierBalance < stake) {
      alert("⚠️ INSUFFICIENT FLOAT");
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const serial = `LCR-${Math.random().toString(36).toUpperCase().substring(2, 10)}`;
      const totalOdds = cart.reduce((acc, item) => acc * (item.odds || 1), 1);

      // Using your new SQL function that preserves the booking_code
      const { data, error: rpcError } = await supabase.rpc('place_and_deduct_bet', {
        p_ticket_id: activeTicketId,
        p_cashier_id: user.id,
        p_stake: parseFloat(stake),
        p_selections: cart,
        p_odds: parseFloat(totalOdds.toFixed(2)),
        p_payout: parseFloat((totalOdds * stake).toFixed(2)),
        p_serial: serial
      });

      if (rpcError) throw rpcError;

      setCurrentTicket(data);
      
      setTimeout(() => {
        window.print();
        // Clear screen for next customer
        setCart([]);
        setStake(0);
        setActiveTicketId(null);
        setIsProcessing(false);
        fetchCashierData();
      }, 300);

    } catch (err) {
      alert("SYSTEM ERROR: " + err.message);
      setIsProcessing(false);
    }
  };

  return (
    <CashierLayout>
      <div className="flex h-[calc(100vh-64px)] bg-[#0b0f1a] text-white overflow-hidden font-sans">
        
        {/* CENTER PANEL: TERMINAL */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center border-r border-white/5">
          <div className="w-full max-w-2xl bg-[#111926] p-8 rounded-[3rem] border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-[#10b981] font-black italic text-3xl tracking-tighter">LUCRA TERMINAL</h1>
                <button onClick={fetchCashierData} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <RefreshCw size={20} className="text-white/40" />
                </button>
            </div>
            
            <div className="relative flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 focus-within:border-[#10b981] transition-all">
              <ReceiptText className="text-[#10b981]" size={32} />
              <input 
                className="bg-transparent flex-1 text-2xl font-black uppercase tracking-widest outline-none placeholder:text-white/10"
                placeholder="ENTER BOOKING CODE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadBooking()}
              />
              <button 
                onClick={handleLoadBooking}
                disabled={isSearching}
                className="bg-[#10b981] text-black px-10 py-4 rounded-xl font-black italic hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                {isSearching ? <Loader2 className="animate-spin" /> : "LOAD"}
              </button>
            </div>

            {activeTicketId && (
              <div className="mt-10 p-6 bg-white/5 rounded-2xl border border-[#10b981]/20 animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <p className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest">Amount to Pay</p>
                        <p className="text-4xl font-black tracking-tighter italic">KES {stake.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Selections</p>
                        <p className="text-xl font-black">{cart.length}</p>
                    </div>
                </div>
                <button 
                  onClick={handlePrintBet}
                  disabled={isProcessing}
                  className="w-full bg-[#10b981] hover:bg-[#059669] text-black py-6 rounded-2xl font-black text-2xl flex items-center justify-center gap-4 transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : <><Printer size={32}/> PRINT RECEIPT</>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR: INFO */}
        <div className="w-[400px] p-8 flex flex-col gap-6 bg-[#111926]/30">
            <div className="bg-[#10b981] p-6 rounded-[2rem] text-black shadow-xl">
                <div className="flex items-center gap-3 mb-1">
                    <Wallet size={16} className="opacity-60" />
                    <p className="text-[10px] font-black uppercase opacity-60">Float Balance</p>
                </div>
                <p className="text-3xl font-black italic leading-none">KES {cashierBalance.toLocaleString()}</p>
            </div>

            <div className="flex-1 bg-black/20 rounded-[2rem] p-6 border border-white/5 overflow-y-auto custom-scrollbar">
                <h3 className="text-[#10b981] font-black italic mb-4 tracking-tight">ACTIVE TICKET PREVIEW</h3>
                {cart.map((item, idx) => (
                    <div key={idx} className="mb-4 border-b border-white/5 pb-2">
                        <p className="text-[10px] font-bold text-white/30 uppercase truncate">{item.matchName}</p>
                        <div className="flex justify-between font-black italic text-sm">
                            <span className="uppercase text-white/90">{item.selection}</span>
                            <span className="text-[#10b981]">{item.odds}</span>
                        </div>
                    </div>
                ))}
                {cart.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 italic">
                    <ReceiptText size={48} className="mb-2" />
                    <p className="text-xs font-bold uppercase">Waiting for code...</p>
                  </div>
                )}
            </div>
        </div>
      </div>

      {/* PRINT LAYER (HIDDEN) */}
      <div className="hidden print:block">
        <PrintableTicket ticket={currentTicket} />
      </div>
    </CashierLayout>
  );
}
