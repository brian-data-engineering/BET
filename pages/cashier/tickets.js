import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import { Search, CheckCircle2, Clock, Loader2, Receipt } from 'lucide-react';

export default function TicketManager() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({data}) => setUser(data.user));
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    // FIX: Only select tickets where ticket_serial is NOT null or empty
    const { data } = await supabase
      .from('betsnow')
      .select('*')
      .not('ticket_serial', 'is', null) // Filter out nulls
      .neq('ticket_serial', '')         // Filter out empty strings
      .order('created_at', { ascending: false })
      .limit(30);

    setTickets(data || []);
    setLoading(false);
  };

  const handlePayout = async (ticket) => {
    if (!window.confirm(`CONFIRM PAYOUT: KES ${ticket.potential_payout}?`)) return;
    
    setLoading(true);
    const { error } = await supabase.rpc('execute_lucra_payout', {
      p_ticket_id: ticket.id,
      p_cashier_id: user.id,
      p_payout_amount: parseFloat(ticket.potential_payout)
    });

    if (error) {
      alert(error.message);
    } else {
      alert("SUCCESS: FLOAT REIMBURSED");
      fetchTickets();
    }
    setLoading(false);
  };

  // Filter local state based on search input if needed
  const filteredTickets = tickets.filter(t => 
    t.ticket_serial?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <CashierLayout>
      <div className="p-8 bg-[#0b0f1a] min-h-screen text-white">
        
        {/* Search Header */}
        <div className="flex gap-4 mb-10">
          <div className="flex-1 bg-[#111926] p-5 rounded-2xl border border-white/5 flex items-center gap-4 focus-within:border-[#10b981]/50 transition-all">
            <Search size={18} className="text-[#10b981] opacity-50" />
            <input 
              className="bg-transparent outline-none w-full font-black uppercase tracking-widest text-sm placeholder:text-white/10" 
              placeholder="SEARCH BY SERIAL NUMBER..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center mt-40 gap-4 opacity-20">
            <Loader2 className="animate-spin text-[#10b981]" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Syncing Terminal...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.length === 0 ? (
              <div className="text-center mt-20 opacity-10">
                <Receipt size={64} className="mx-auto mb-4" />
                <p className="font-black uppercase tracking-widest text-xs">No Printed Receipts Found</p>
              </div>
            ) : (
              filteredTickets.map(t => (
                <div key={t.id} className="bg-[#111926]/60 backdrop-blur-sm p-6 rounded-[2.5rem] flex justify-between items-center border border-white/5 hover:border-white/10 transition-all group">
                  
                  {/* Left Side: Identity */}
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl transition-all ${
                      t.status === 'won' 
                        ? 'bg-[#10b981] text-black shadow-lg shadow-[#10b981]/20' 
                        : 'bg-white/5 text-white/20'
                    }`}>
                      {t.status === 'won' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                    </div>
                    <div>
                      <h4 className="font-black italic text-xl uppercase tracking-tighter text-white group-hover:text-[#10b981] transition-colors">
                        {t.ticket_serial}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[9px] text-[#10b981] font-black uppercase tracking-tighter bg-[#10b981]/10 px-2 py-0.5 rounded">
                          {t.booking_code}
                        </p>
                        <p className="text-[10px] opacity-30 font-bold uppercase tabular-nums">
                          {new Date(t.created_at).toLocaleTimeString()} • {new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Side: Financials & Actions */}
                  <div className="flex items-center gap-10">
                    <div className="text-right">
                      <p className="text-[9px] font-black opacity-20 uppercase tracking-widest mb-1">Potential Return</p>
                      <p className="text-2xl font-black italic tabular-nums">
                        <span className="text-[10px] text-[#10b981] mr-1">KES</span>
                        {parseFloat(t.potential_payout).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="w-32 flex justify-end">
                      {/* Payout Logic */}
                      {t.status === 'won' && !t.is_paid ? (
                        <button 
                          onClick={() => handlePayout(t)} 
                          className="bg-[#10b981] text-black px-6 py-4 rounded-2xl font-black italic uppercase text-[10px] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#10b981]/20"
                        >
                          Collect
                        </button>
                      ) : t.is_paid ? (
                        <div className="flex flex-col items-end opacity-40">
                           <span className="text-[#10b981] font-black italic text-[11px] uppercase tracking-tighter">✓ Printed</span>
                           <span className="text-[8px] font-bold uppercase text-white/50">Ledger Cleared</span>
                        </div>
                      ) : (
                        <span className="text-white/10 font-black italic text-[11px] uppercase tracking-tighter">Pending</span>
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
