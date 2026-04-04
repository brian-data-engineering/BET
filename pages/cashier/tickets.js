import { useState, useEffect, useCallback } from 'react'; // Added useCallback for stability
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import { Search, CheckCircle2, Clock, Loader2, Receipt, Banknote } from 'lucide-react';

export default function TicketManager() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);

  // Define fetchTickets with useCallback to include it in dependency arrays safely
  const fetchTickets = useCallback(async (userId) => {
    if (!userId) return;
    
    setLoading(true);
    const { data } = await supabase
      .from('betsnow')
      .select('*')
      .eq('cashier_id', userId) // CRITICAL: Filter by the logged-in cashier's ID
      .not('ticket_serial', 'is', null)
      .neq('ticket_serial', '')
      .order('created_at', { ascending: false })
      .limit(30);

    setTickets(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const initializeTerminal = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
        // Pass the ID directly to ensure it fetches for the right user immediately
        fetchTickets(currentUser.id);
      }
    };

    initializeTerminal();
  }, [fetchTickets]);

  const handlePayout = async (ticket) => {
    if (!window.confirm(`PAYOUT KES ${parseFloat(ticket.potential_payout).toLocaleString()}?`)) return;
    
    setLoading(true);
    const { error } = await supabase.rpc('execute_lucra_payout', {
      p_ticket_id: ticket.id,
      p_cashier_id: user.id,
      p_payout_amount: parseFloat(ticket.potential_payout)
    });

    if (error) {
      alert(error.message);
    } else {
      alert("PAYOUT SUCCESSFUL: FLOAT REIMBURSED");
      fetchTickets(user.id); // Refresh ledger
    }
    setLoading(false);
  };

  const filteredTickets = tickets.filter(t => 
    t.ticket_serial?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <CashierLayout>
      <div className="p-8 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* Header Section */}
        <div className="flex gap-4 mb-10">
          <div className="flex-1 bg-[#111926] p-5 rounded-2xl border border-white/5 flex items-center gap-4 focus-within:border-[#10b981]/50 transition-all shadow-2xl">
            <Search size={18} className="text-[#10b981] opacity-50" />
            <input 
              className="bg-transparent outline-none w-full font-black uppercase tracking-widest text-sm placeholder:text-white/10" 
              placeholder="SCAN OR ENTER SERIAL NUMBER..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center mt-40 gap-4 opacity-20">
            <Loader2 className="animate-spin text-[#10b981]" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Updating Ledger...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.length === 0 ? (
              <div className="text-center mt-20 opacity-10">
                <Receipt size={64} className="mx-auto mb-4" />
                <p className="font-black uppercase tracking-widest text-xs">No Active Receipts</p>
              </div>
            ) : (
              filteredTickets.map(t => (
                <div key={t.id} className="bg-[#111926]/80 backdrop-blur-md p-6 rounded-[2.5rem] flex justify-between items-center border border-white/5 hover:border-white/10 transition-all group">
                  
                  {/* Left: Ticket Info */}
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl transition-all ${
                      t.status === 'won' 
                        ? 'bg-[#10b981] text-black shadow-lg shadow-[#10b981]/40' 
                        : 'bg-white/5 text-white/20'
                    }`}>
                      {t.status === 'won' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                    </div>
                    <div>
                      <h4 className="font-black italic text-xl uppercase tracking-tighter text-white">
                        {t.ticket_serial}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-[#10b981] font-black uppercase tracking-tighter bg-[#10b981]/10 px-2 py-0.5 rounded">
                          {t.booking_code}
                        </span>
                        <span className="text-[10px] opacity-30 font-bold uppercase">
                          {new Date(t.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right: Financials & Settlement */}
                  <div className="flex items-center gap-10">
                    <div className="text-right">
                      <p className="text-[9px] font-black opacity-20 uppercase tracking-widest mb-1">Potential Payout</p>
                      <p className={`text-2xl font-black italic tabular-nums ${t.status === 'won' ? 'text-[#10b981]' : 'text-white'}`}>
                        <span className="text-[10px] mr-1">KES</span>
                        {parseFloat(t.potential_payout || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="w-40 flex justify-end">
                      {t.status === 'won' && !t.settled_at ? (
                        <button 
                          onClick={() => handlePayout(t)} 
                          className="bg-[#10b981] text-black px-6 py-4 rounded-2xl font-black italic uppercase text-[10px] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#10b981]/30 flex items-center gap-2"
                        >
                          <Banknote size={14} />
                          Collect Win
                        </button>
                      ) : t.settled_at ? (
                        <div className="flex flex-col items-end">
                           <span className="text-[#10b981] font-black italic text-[11px] uppercase tracking-tighter flex items-center gap-1">
                             <CheckCircle2 size={12} /> Settled
                           </span>
                           <span className="text-[8px] font-bold uppercase text-white/30 italic">Ledger Updated</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end opacity-20">
                          <span className="text-white font-black italic text-[11px] uppercase tracking-tighter">Running</span>
                          <span className="text-[8px] font-bold uppercase">Awaiting Result</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </CashierLayout>
  );
}
