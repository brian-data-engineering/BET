import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import PrintableTicket from '../../components/cashier/PrintableTicket';
import { Loader2, ReceiptText, Wallet, Printer, RefreshCw, Search } from 'lucide-react';

export default function UnifiedTerminal() {
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState(0);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [cashierBalance, setCashierBalance] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchCashierData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
    if (profile) setCashierBalance(parseFloat(profile.balance || 0));
  }, []);

  useEffect(() => { fetchCashierData(); }, [fetchCashierData]);

  const handleLoadBooking = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    const input = searchQuery.trim().toUpperCase();

    try {
      // Search in booking_code (for fresh bets) OR ticket_serial (for reprints/payouts)
      const { data: ticket, error } = await supabase
        .from('betsnow')
        .select('*')
        .or(`booking_code.eq."${input}",ticket_serial.eq."${input}"`)
        .single();

      if (error || !ticket) {
        alert("⚠️ TICKET NOT FOUND. It may have been processed or the code is invalid.");
        setSearchQuery('');
        return;
      }

      // 1. DATA PARSING: Ensure selections is always an array
      const selectionsArray = Array.isArray(ticket.selections) 
        ? ticket.selections 
        : JSON.parse(ticket.selections || '[]');

      // 2. CASE: ALREADY PAID (Found via Serial or old record)
      // Since booking_code is now NULLed on payment, finding it via Serial is the main way to reprint
      if (ticket.ticket_serial || ticket.status === 'paid' || ticket.is_paid) {
        const reprint = confirm(`🎟️ PAID TICKET: ${ticket.ticket_serial}\n\nThis booking is already settled. Reprint receipt?`);
        if (reprint) {
          setCurrentTicket({ ...ticket, selections: selectionsArray });
          setTimeout(() => window.print(), 500);
        }
        setSearchQuery('');
        setCart([]); // Clear preview
        setActiveTicketId(null);
        return;
      }

      // 3. CASE: FRESH BOOKING
      setCart(selectionsArray);
      setStake(ticket.stake || 0);
      setActiveTicketId(ticket.id);
      setSearchQuery(''); 

    } catch (err) {
      console.error("Load Error:", err);
      alert("Error loading ticket data.");
    } finally {
      setIsSearching(false);
    }
  };

  const handlePrintBet = async () => {
    if (!activeTicketId || cart.length === 0) return;
    if (cashierBalance < stake) {
      alert("⚠️ INSUFFICIENT FLOAT");
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Generate a clean Alphanumeric Serial
      const serial = `LCR-${Math.random().toString(36).toUpperCase().substring(2, 10)}`;
      const totalOdds = cart.reduce((acc, item) => acc * (item.odds || 1), 1);

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

      // Set the ticket for the print component
      setCurrentTicket(data);
      
      setTimeout(() => {
        window.print();
        // Reset Terminal
        setCart([]);
        setStake(0);
        setActiveTicketId(null);
        setIsProcessing(false);
        fetchCashierData();
      }, 300);

    } catch (err) {
      alert("PAYMENT FAILED: " + err.message);
      setIsProcessing(false);
    }
  };

  return (
    <CashierLayout>
      <div className="flex h-[calc(100vh-64px)] bg-[#0b0f1a] text-white overflow-hidden font-sans">
        
        {/* LEFT: ACTION AREA */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center border-r border-white/5">
          <div className="w-full max-w-2xl bg-[#111926] p-8 rounded-[3rem] border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-[#10b981] font-black italic text-3xl tracking-tighter uppercase">Lucra Terminal</h1>
                <button onClick={fetchCashierData} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-[#10b981]">
                    <RefreshCw size={20} />
                </button>
            </div>
            
            <div className="relative flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 focus-within:border-[#10b981] transition-all">
              <Search className="text-[#10b981]" size={32} />
              <input 
                className="bg-transparent flex-1 text-2xl font-black uppercase tracking-widest outline-none placeholder:text-white/5"
                placeholder="SCAN OR TYPE CODE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadBooking()}
              />
              <button 
                onClick={handleLoadBooking}
                disabled={isSearching}
                className="bg-[#10b981] text-black px-10 py-4 rounded-xl font-black italic hover:scale-105 transition-all shadow-lg active:scale-95"
              >
                {isSearching ? <Loader2 className="animate-spin" /> : "LOAD"}
              </button>
            </div>

            {activeTicketId && (
              <div className="mt-10 p-8 bg-white/5 rounded-3xl border border-[#10b981]/20 animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <p className="text-[10px] font-bold text-[#10b981] uppercase tracking-[0.2em] mb-1">Total Stake</p>
                        <p className="text-5xl font-black italic">KES {stake.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold opacity-30 uppercase mb-1">Matches</p>
                        <p className="text-xl font-black">{cart.length}</p>
                    </div>
                </div>
                <button 
                  onClick={handlePrintBet}
                  disabled={isProcessing}
                  className="w-full bg-[#10b981] hover:bg-[#059669] text-black py-7 rounded-2xl font-black text-2xl flex items-center justify-center gap-4 transition-all shadow-[0_10px_40px_rgba(16,185,129,0.2)]"
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : <><Printer size={32}/> CONFIRM & PRINT</>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: TICKET PREVIEW */}
        <div className="w-[420px] p-8 flex flex-col gap-6 bg-[#111926]/30">
            <div className="bg-[#10b981] p-6 rounded-[2rem] text-black shadow-lg">
                <p className="text-[10px] font-black uppercase opacity-60 mb-1">Cashier Balance</p>
                <p className="text-3xl font-black italic">KES {cashierBalance.toLocaleString()}</p>
            </div>

            <div className="flex-1 bg-black/20 rounded-[2.5rem] p-6 border border-white/5 overflow-y-auto custom-scrollbar">
                <h3 className="text-[#10b981] font-black italic mb-6 text-sm tracking-widest uppercase border-b border-white/5 pb-2">Ticket Preview</h3>
                {cart.map((item, idx) => (
                    <div key={idx} className="mb-5 border-b border-white/5 pb-3 last:border-0">
                        <p className="text-[10px] font-bold text-white/30 uppercase mb-1 truncate">{item.matchName}</p>
                        <div className="flex justify-between font-black italic">
                            <span className="text-sm text-white/90 uppercase">{item.selection}</span>
                            <span className="text-[#10b981]">{item.odds}</span>
                        </div>
                    </div>
                ))}
                {cart.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-10 py-20">
                    <ReceiptText size={64} />
                    <p className="font-black italic uppercase text-xs mt-4 tracking-tighter">Terminal Idle</p>
                  </div>
                )}
            </div>
        </div>
      </div>

      {/* HIDDEN PRINT COMPONENT */}
      <div className="hidden print:block">
        <PrintableTicket ticket={currentTicket} />
      </div>
    </CashierLayout>
  );
}
