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
      // SEARCH: Looks in booking_code OR ticket_serial
      const { data: ticket, error } = await supabase
        .from('betsnow')
        .select('*')
        .or(`booking_code.eq."${input}",ticket_serial.eq."${input}"`)
        .single();

      if (error || !ticket) {
        alert("⚠️ TICKET NOT FOUND OR EXPIRED");
        setSearchQuery('');
        return;
      }

      // CASE 1: TICKET IS ALREADY PAID (Found via Serial)
      if (ticket.ticket_serial) {
        const reprint = confirm(`🎟️ PAID TICKET: ${ticket.ticket_serial}\n\nPrint a duplicate receipt?`);
        if (reprint) {
          setCurrentTicket(ticket);
          setTimeout(() => window.print(), 500);
        }
        setSearchQuery('');
        return;
      }

      // CASE 2: FRESH BOOKING (Found via Code)
      setCart(ticket.selections || []);
      setStake(ticket.stake || 0);
      setActiveTicketId(ticket.id);
      setSearchQuery(''); 

    } catch (err) {
      console.error(err);
      alert("Error: Ticket processed or invalid.");
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

      setCurrentTicket(data);
      
      setTimeout(() => {
        window.print();
        setCart([]);
        setStake(0);
        setActiveTicketId(null);
        setIsProcessing(false);
        fetchCashierData();
      }, 300);

    } catch (err) {
      alert("ERROR: " + err.message);
      setIsProcessing(false);
    }
  };

  return (
    <CashierLayout>
      <div className="flex h-[calc(100vh-64px)] bg-[#0b0f1a] text-white overflow-hidden font-sans">
        
        <div className="flex-1 p-8 flex flex-col items-center justify-center border-r border-white/5">
          <div className="w-full max-w-2xl bg-[#111926] p-8 rounded-[3rem] border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-[#10b981] font-black italic text-3xl tracking-tighter uppercase">Lucra Terminal</h1>
                <button onClick={fetchCashierData} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <RefreshCw size={20} className="text-white/40" />
                </button>
            </div>
            
            <div className="relative flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 focus-within:border-[#10b981] transition-all">
              <Search className="text-[#10b981]" size={32} />
              <input 
                className="bg-transparent flex-1 text-2xl font-black uppercase tracking-widest outline-none placeholder:text-white/5"
                placeholder="BOOKING CODE OR SERIAL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadBooking()}
              />
              <button 
                onClick={handleLoadBooking}
                disabled={isSearching}
                className="bg-[#10b981] text-black px-10 py-4 rounded-xl font-black italic hover:scale-105 transition-all"
              >
                {isSearching ? <Loader2 className="animate-spin" /> : "LOAD"}
              </button>
            </div>

            {activeTicketId && (
              <div className="mt-10 p-8 bg-white/5 rounded-3xl border border-[#10b981]/20 animate-in fade-in zoom-in">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <p className="text-[10px] font-bold text-[#10b981] uppercase tracking-[0.2em]">Stake Amount</p>
                        <p className="text-5xl font-black italic">KES {stake.toLocaleString()}</p>
                    </div>
                    <p className="text-sm font-black opacity-30 uppercase">{cart.length} Matches</p>
                </div>
                <button 
                  onClick={handlePrintBet}
                  disabled={isProcessing}
                  className="w-full bg-[#10b981] hover:bg-[#059669] text-black py-7 rounded-2xl font-black text-2xl flex items-center justify-center gap-4 transition-all shadow-[0_10px_40px_rgba(16,185,129,0.2)]"
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : <><Printer size={32}/> PRINT & PAY</>}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-[420px] p-8 flex flex-col gap-6 bg-[#111926]/30">
            <div className="bg-[#10b981] p-6 rounded-[2rem] text-black shadow-lg">
                <p className="text-[10px] font-black uppercase opacity-60 mb-1">Cashier Float</p>
                <p className="text-3xl font-black italic">KES {cashierBalance.toLocaleString()}</p>
            </div>

            <div className="flex-1 bg-black/20 rounded-[2.5rem] p-6 border border-white/5 overflow-y-auto">
                <h3 className="text-[#10b981] font-black italic mb-6 text-sm tracking-widest uppercase">Selections Preview</h3>
                {cart.map((item, idx) => (
                    <div key={idx} className="mb-5 border-b border-white/5 pb-3">
                        <p className="text-[10px] font-bold text-white/30 uppercase mb-1">{item.matchName}</p>
                        <div className="flex justify-between font-black italic">
                            <span className="text-sm">{item.selection}</span>
                            <span className="text-[#10b981]">{item.odds}</span>
                        </div>
                    </div>
                ))}
                {cart.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-10 py-20">
                    <ReceiptText size={64} />
                    <p className="font-black italic uppercase text-xs mt-4">No Ticket Loaded</p>
                  </div>
                )}
            </div>
        </div>
      </div>

      <div className="hidden print:block">
        <PrintableTicket ticket={currentTicket} />
      </div>
    </CashierLayout>
  );
}
