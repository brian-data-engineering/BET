import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import PrintableTicket from '../../components/cashier/PrintableTicket';
import { Loader2, ReceiptText, Printer, RefreshCw, Search } from 'lucide-react';

export default function UnifiedTerminal() {
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState(0);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [cashierBalance, setCashierBalance] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadedBookingCode, setLoadedBookingCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchCashierData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
    if (profile) setCashierBalance(parseFloat(profile.balance || 0));
  }, []);

  useEffect(() => { fetchCashierData(); }, [fetchCashierData]);

  // 1. LOAD TICKET: Logic for New Bookings AND Reprints
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
        alert("⚠️ NOT FOUND: Code expired or invalid.");
        setSearchQuery('');
        return;
      }

      const selectionsArray = Array.isArray(ticket.selections) 
        ? ticket.selections 
        : JSON.parse(ticket.selections || '[]');

      // CASE A: ALREADY PAID (Reprint Mode)
      if (ticket.is_paid || ticket.ticket_serial) {
        setCart(selectionsArray);
        setStake(ticket.stake || 0);
        setActiveTicketId(null); // Prevents "Double Pay"
        
        const shouldReprint = confirm(
          `✅ PAID TICKET: ${ticket.ticket_serial}\nStatus: ${ticket.status}\n\nWould you like to REPRINT this receipt?`
        );

        if (shouldReprint) {
          setCurrentTicket(ticket);
          setTimeout(() => {
            window.print();
            setCart([]);
            setStake(0);
          }, 500);
        }
      } 
      // CASE B: FRESH BOOKING (Deduction Mode)
      else {
        setCart(selectionsArray);
        setStake(ticket.stake || 0);
        setActiveTicketId(ticket.id);
        setLoadedBookingCode(ticket.booking_code);
      }

      setSearchQuery('');
    } catch (err) {
      console.error(err);
      alert("Error loading ticket.");
    } finally {
      setIsSearching(false);
    }
  };

  // 2. PROCESS PAYMENT: Burn code and deduct float
  const handlePrintBet = async () => {
    if (!activeTicketId || !loadedBookingCode) return;
    if (cashierBalance < stake) {
      alert("⚠️ INSUFFICIENT FLOAT");
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const newSerial = Math.floor(1000000000 + Math.random() * 9000000000).toString();

      const { data, error: rpcError } = await supabase.rpc('process_lucra_payment', {
        p_booking_code: loadedBookingCode,
        p_cashier_id: user.id,
        p_generated_serial: newSerial
      });

      if (rpcError) throw rpcError;

      setCurrentTicket(data);
      
      setTimeout(() => {
        window.print();
        setCart([]);
        setStake(0);
        setActiveTicketId(null);
        setLoadedBookingCode('');
        setIsProcessing(false);
        fetchCashierData();
      }, 700); // Slightly longer delay for printer reliability

    } catch (err) {
      alert("❌ PAYMENT FAILED: " + err.message);
      setIsProcessing(false);
    }
  };

  return (
    <CashierLayout>
      <div className="flex h-[calc(100vh-64px)] bg-[#0b0f1a] text-white overflow-hidden font-sans">
        
        {/* LEFT AREA: SCANNER */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center border-r border-white/5">
          <div className="w-full max-w-2xl bg-[#111926] p-10 rounded-[3.5rem] border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-[#10b981] font-black italic text-3xl tracking-tighter uppercase">Lucra Terminal</h1>
                <button onClick={fetchCashierData} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40">
                    <RefreshCw size={22} />
                </button>
            </div>
            
            <div className="relative flex items-center gap-4 bg-black/40 p-5 rounded-3xl border border-white/5 focus-within:border-[#10b981] transition-all shadow-inner">
              <Search className="text-[#10b981]" size={36} />
              <input 
                className="bg-transparent flex-1 text-3xl font-black uppercase tracking-widest outline-none placeholder:text-white/5"
                placeholder="INPUT CODE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadTicket()}
              />
              <button 
                onClick={handleLoadTicket}
                disabled={isSearching}
                className="bg-[#10b981] text-black px-12 py-5 rounded-2xl font-black italic hover:scale-105 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95"
              >
                {isSearching ? <Loader2 className="animate-spin" /> : "LOAD"}
              </button>
            </div>

            {activeTicketId && (
              <div className="mt-12 p-10 bg-white/5 rounded-[2.5rem] border border-[#10b981]/20 animate-in fade-in zoom-in duration-500">
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <p className="text-[11px] font-bold text-[#10b981] uppercase tracking-[0.3em] mb-2">Debit Float</p>
                        <p className="text-6xl font-black italic">KES {parseFloat(stake).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[11px] font-bold opacity-30 uppercase mb-2">Booking</p>
                        <p className="text-2xl font-black text-[#10b981]">{loadedBookingCode}</p>
                    </div>
                </div>
                <button 
                  onClick={handlePrintBet}
                  disabled={isProcessing}
                  className="w-full bg-[#10b981] hover:bg-[#059669] text-black py-8 rounded-3xl font-black text-2xl flex items-center justify-center gap-4 transition-all shadow-[0_15px_50px_rgba(16,185,129,0.25)]"
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : <><Printer size={36}/> PROCESS & PRINT</>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT AREA: TICKET LIVE PREVIEW */}
        <div className="w-[440px] p-8 flex flex-col gap-6 bg-[#111926]/40 backdrop-blur-sm">
            <div className="bg-[#10b981] p-8 rounded-[2.5rem] text-black shadow-xl">
                <p className="text-[11px] font-black uppercase opacity-60 mb-1 tracking-widest">Available Float</p>
                <p className="text-4xl font-black italic">KES {cashierBalance.toLocaleString()}</p>
            </div>

            <div className="flex-1 bg-black/30 rounded-[3rem] p-8 border border-white/5 overflow-y-auto custom-scrollbar">
                <h3 className="text-[#10b981] font-black italic mb-8 text-xs tracking-[0.25em] uppercase border-b border-white/5 pb-4">Live Preview</h3>
                {cart.map((item, idx) => (
                    <div key={idx} className="mb-6 border-b border-white/5 pb-4 last:border-0">
                        <p className="text-[10px] font-bold text-white/20 uppercase mb-2 truncate">{item.matchName}</p>
                        <div className="flex justify-between font-black italic">
                            <span className="text-base text-white/90 uppercase">{item.selection}</span>
                            <span className="text-[#10b981] text-lg">@{parseFloat(item.odds).toFixed(2)}</span>
                        </div>
                    </div>
                ))}
                {cart.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-10 py-20">
                    <ReceiptText size={80} />
                    <p className="font-black italic uppercase text-xs mt-6 tracking-widest">Scanner Idle</p>
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
