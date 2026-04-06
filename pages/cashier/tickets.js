import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import PrintableTicket from '../../components/cashier/PrintableTicket'; 
import { Search, CheckCircle2, Clock, Loader2, Receipt, Banknote, ChevronLeft, ChevronRight, Printer, X, Eye } from 'lucide-react';

export default function TicketManager() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // PAGINATION STATE
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // 1. FETCH LOGIC
  const fetchTickets = useCallback(async (userId, currentPage, currentSearch) => {
    if (!userId) return;
    setLoading(true);

    const from = currentPage * pageSize;
    const to = from + pageSize - 1;

    try {
      let query = supabase
        .from('print') 
        .select('*', { count: 'exact' })
        .eq('cashier_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (currentSearch) {
        query = query.or(`ticket_serial.ilike.%${currentSearch}%,booking_code.ilike.%${currentSearch}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      setTickets(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Ledger Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. AUTH & INITIALIZATION
  useEffect(() => {
    const initializeTerminal = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
        fetchTickets(currentUser.id, page, search);
      }
    };
    initializeTerminal();
  }, [fetchTickets, page, search]);

  // 3. PAYOUT EXECUTION
  const handlePayout = async (ticket) => {
    if (ticket.status !== 'won') {
      alert("❌ This ticket is not marked as won yet.");
      return;
    }

    const payoutAmount = parseFloat(ticket.potential_payout);
    if (!window.confirm(`PAYOUT KES ${payoutAmount.toLocaleString()}?`)) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.rpc('execute_lucra_payout', {
        p_ticket_id: ticket.id,
        p_cashier_id: user.id,
        p_payout_amount: payoutAmount
      });

      if (error) throw error;
      alert("✅ PAYOUT SUCCESSFUL");
      fetchTickets(user.id, page, search); 
    } catch (err) {
      alert(`❌ PAYOUT FAILED: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <CashierLayout>
      <div className="p-8 bg-[#0b0f1a] min-h-screen text-white font-sans no-print">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row gap-4 mb-10 items-center">
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-[#10b981]">Terminal Ledger</h1>
          <div className="flex-1 bg-[#111926] p-4 rounded-2xl border border-white/5 flex items-center gap-4 focus-within:border-[#10b981]/50 transition-all shadow-2xl w-full">
            <Search size={18} className="text-[#10b981] opacity-50" />
            <input 
              className="bg-transparent outline-none w-full font-black uppercase tracking-widest text-sm placeholder:text-white/10" 
              placeholder="SEARCH SERIAL..." 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
        </div>

        {loading && tickets.length === 0 ? (
          <div className="flex flex-col items-center mt-40 gap-4 opacity-20">
            <Loader2 className="animate-spin text-[#10b981]" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Updating Ledger...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.length === 0 ? (
              <div className="text-center mt-20 opacity-10">
                <Receipt size={64} className="mx-auto mb-4" />
                <p className="font-black uppercase tracking-widest text-xs">No Records Found</p>
              </div>
            ) : (
              <>
                {tickets.map(t => (
                  <div key={t.id} className="bg-[#111926]/80 backdrop-blur-md p-5 rounded-[2rem] flex justify-between items-center border border-white/5 hover:border-[#10b981]/20 transition-all group">
                    <div className="flex items-center gap-5">
                      <div className={`p-4 rounded-2xl ${t.status === 'won' ? 'bg-[#10b981] text-black shadow-lg shadow-[#10b981]/20' : 'bg-white/5 text-white/20'}`}>
                        {t.status === 'won' ? <CheckCircle2 size={22} /> : <Clock size={22} />}
                      </div>
                      <div>
                        <h4 className="font-black italic text-lg uppercase tracking-tight">#{t.ticket_serial}</h4>
                        <div className="flex items-center gap-2 mt-1">
                           <button onClick={() => setSelectedTicket(t)} className="text-[9px] text-[#10b981] font-black uppercase bg-[#10b981]/10 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-[#10b981]/30">
                            <Eye size={10}/> View Ticket
                           </button>
                           <span className="text-[10px] opacity-30 font-bold">{new Date(t.created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[8px] font-black opacity-20 uppercase tracking-widest mb-1">Potential Payout</p>
                        <p className={`text-xl font-black italic ${t.status === 'won' ? 'text-[#10b981]' : 'text-white'}`}>
                          {parseFloat(t.potential_payout).toLocaleString()}
                        </p>
                      </div>

                      <div className="w-32 flex justify-end">
                        {t.status === 'won' && !t.settled_at ? (
                          <button onClick={() => handlePayout(t)} className="bg-[#10b981] text-black px-4 py-3 rounded-xl font-black italic uppercase text-[9px] hover:scale-105 transition-all shadow-lg flex items-center gap-2">
                            <Banknote size={14} /> Collect
                          </button>
                        ) : (
                          <span className="text-[10px] font-black uppercase opacity-20 italic">
                            {t.status === 'won' ? 'Settled' : t.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* PAGINATION */}
                <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-10">
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                    Page {page + 1} of {totalPages || 1}
                  </p>
                  <div className="flex gap-2">
                    <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-3 rounded-xl bg-[#111926] border border-white/5 disabled:opacity-10 hover:border-[#10b981]/50 transition-all">
                      <ChevronLeft size={20} />
                    </button>
                    <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="p-3 rounded-xl bg-[#111926] border border-white/5 disabled:opacity-10 hover:border-[#10b981]/50 transition-all">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* REPRINT / VIEW MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 no-print overflow-y-auto">
          <div className="relative bg-[#111926] border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl my-auto">
            
            {/* CLOSE BUTTON */}
            <button 
              onClick={() => setSelectedTicket(null)} 
              className="absolute -top-14 right-0 text-white hover:text-[#10b981] transition-all p-2 flex items-center gap-2 group"
            >
              <span className="text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity">Close</span>
              <X size={40} />
            </button>

            {/* ACTION BUTTON */}
            <button 
              onClick={() => window.print()}
              className="w-full bg-[#10b981] text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all mb-8 text-sm italic uppercase shadow-xl"
            >
              <Printer size={20} /> Confirm Reprint
            </button>

            {/* MASTER PRINT TARGET: 
                We use the class 'lucra-print-area' here so your global 
                CSS @media print logic can unlock it and set the 72mm width.
            */}
            <div className="lucra-print-area mx-auto">
               <PrintableTicket ticket={selectedTicket} isReprint={true} />
            </div>
            
            <p className="text-[8px] text-center text-white/20 mt-6 uppercase font-bold tracking-[0.3em]">
              Lucra Terminal System
            </p>
          </div>
        </div>
      )}
    </CashierLayout>
  );
}
