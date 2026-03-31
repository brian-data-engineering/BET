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
  const [loadedBookingCode, setLoadedBookingCode] = useState(''); // To keep track of the code being "burned"
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchCashierData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
    if (profile) setCashierBalance(parseFloat(profile.balance || 0));
  }, []);

  useEffect(() => { fetchCashierData(); }, [fetchCashierData]);

  // 1. LOAD TICKET: Handles both 4-digit Booking and 10-digit Serial
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

      // Ensure selections is an array
      const selectionsArray = Array.isArray(ticket.selections) 
        ? ticket.selections 
        : JSON.parse(ticket.selections || '[]');

      // CASE A: IT'S A PAID TICKET (Search by Serial)
      if (ticket.is_paid || ticket.ticket_serial) {
        setCart(selectionsArray);
        setStake(ticket.stake || 0);
        setActiveTicketId(null); // Disable "Print" button
        setLoadedBookingCode('');
        alert(`✅ PAID TICKET LOADED\nSerial: ${ticket.ticket_serial}\nStatus: ${ticket.status}`);
      } 
      // CASE B: IT'S A NEW BOOKING (Search by Booking Code)
      else {
        setCart(selectionsArray);
        setStake(ticket.stake || 0);
        setActiveTicketId(ticket.id);
        setLoadedBookingCode(ticket.booking_code); // Store the code to burn it later
      }

      setSearchQuery('');
    } catch (err) {
      console.error(err);
      alert("Error loading ticket.");
    } finally {
      setIsSearching(false);
    }
  };

  // 2. PROCESS PAYMENT: Deducts money, assigns Serial, and DELETES Booking Code
  const handlePrintBet = async () => {
    if (!activeTicketId || !loadedBookingCode) return;
    if (cashierBalance < stake) {
      alert("⚠️ INSUFFICIENT FLOAT");
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate the 10-digit numeric serial
      const newSerial = Math.floor(1000000000 + Math.random() * 9000000000).toString();

      // Use the "process_lucra_payment" function we created
      const { data, error: rpcError } = await supabase.rpc('process_lucra_payment', {
        p_booking_code: loadedBookingCode,
        p_cashier_id: user.id,
        p_generated_serial: newSerial
      });

      if (rpcError) throw rpcError;

      // Load data into print component
      setCurrentTicket(data);
      
      // Short delay to ensure PrintableTicket has the data before window.print()
      setTimeout(() => {
        window.print();
        
        // Clear everything
        setCart([]);
        setStake(0);
        setActiveTicketId(null);
        setLoadedBookingCode('');
        setIsProcessing(false);
        fetchCashierData();
      }, 500);

    } catch (err) {
      alert("❌ PAYMENT FAILED: " + err.message);
      setIsProcessing(false);
    }
  };

  return (
    <CashierLayout>
      <div className="flex h-[calc(100vh-64px)] bg-[#0b0f1a] text-white overflow-hidden font-sans">
        
        {/* LEFT AREA: SEARCH & ACTIONS */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center border-r border-white/5">
          <div className="w-full max-w-2xl bg-[#111926] p-8 rounded-[3rem] border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-[#10b981] font-black italic text-3xl tracking-tighter uppercase">Lucra Terminal</h1>
                <button onClick={fetchCashierData} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40">
                    <RefreshCw size={20} />
                </button>
            </div>
            
            <div className="relative flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 focus-within:border-[#10b981] transition-all">
              <Search className="text-[#10b981]" size={32} />
              <input 
                className="bg-transparent flex-1 text-2xl font-black uppercase tracking-widest outline-none placeholder:text-white/10"
                placeholder="ENTER CODE OR SERIAL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadTicket()}
              />
              <button 
                onClick={handleLoadTicket}
                disabled={isSearching}
                className="bg-[#10b981] text-black px-10 py-4 rounded-xl font-black italic hover:scale-105 transition-all shadow-lg"
              >
                {isSearching ? <Loader2 className="animate-spin" /> : "LOAD"}
              </button>
            </div>

            {/* PAYMENT BOX: Only shows if it's a new booking */}
            {activeTicketId && (
              <div className="mt-10 p-8 bg-white/5 rounded-3xl border border-[#10b981]/20 animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <p className="text-[10px] font-bold text-[#10b981] uppercase tracking-[0.2em] mb-1">Deduct Stake</p>
                        <p className="text-5xl font-black italic">KES {parseFloat(stake).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold opacity-30 uppercase mb-1">Code</p>
                        <p className="text-xl font-black text-[#10b981]">{loadedBookingCode}</p>
                    </div>
                </div>
                <button 
                  onClick={handlePrintBet}
                  disabled={isProcessing}
                  className="w-full bg-[#10b981] hover:bg-[#059669] text-black py-7 rounded-2xl font-black text-2xl flex items-center justify-center gap-4 transition-all shadow-[0_10px_40px_rgba(16,185,129,0.2)]"
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : <><Printer size={32}/> PROCESS & PRINT</>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT AREA: PREVIEW */}
        <div className="w-[420px] p-8 flex flex-col gap-6 bg-[#111926]/30">
            <div className="bg-[#10b981] p-6 rounded-[2rem] text-black shadow-lg">
                <p className="text-[10px] font-black uppercase opacity-60 mb-1">Current Float</p>
                <p className="text-3xl font-black italic">KES {cashierBalance.toLocaleString()}</p>
            </div>

            <div className="flex-1 bg-black/20 rounded-[2.5rem] p-6 border border-white/5 overflow-y-auto">
                <h3 className="text-[#10b981] font-black italic mb-6 text-sm tracking-widest uppercase border-b border-white/5 pb-2">Selections Preview</h3>
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
                    <p className="font-black italic uppercase text-xs mt-4">Waiting for Input...</p>
                  </div>
                )}
            </div>
        </div>
      </div>

      {/* PRINT LAYER */}
      <div className="hidden print:block">
        <PrintableTicket ticket={currentTicket} />
      </div>
    </CashierLayout>
  );
}
