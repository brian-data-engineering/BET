import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import { Search, CheckCircle2, XCircle, Clock, Loader2, Coins, Lock } from 'lucide-react';

export default function TicketManager() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchSerial, setSearchSerial] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
    };
    getSession();
    fetchTickets();
  }, [filter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const [betsNowRes, ticketsRes] = await Promise.all([
        supabase.from('betsnow').select('*'),
        supabase.from('tickets').select('*')
      ]);

      let combined = [
        ...(betsNowRes.data || []).map(t => ({ ...t, _source: 'betsnow' })),
        ...(ticketsRes.data || []).map(t => ({ ...t, _source: 'tickets' }))
      ];

      if (filter !== 'all') {
        combined = combined.filter(t => t.status === filter);
      }

      combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setTickets(combined);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchSerial) return;
    setLoading(true);
    
    const cleanSerial = searchSerial.trim().toUpperCase();
    const [res1, res2] = await Promise.all([
      supabase.from('betsnow').select('*').eq('ticket_serial', cleanSerial).maybeSingle(),
      supabase.from('tickets').select('*').eq('ticket_serial', cleanSerial).maybeSingle()
    ]);

    const found = res1.data ? { ...res1.data, _source: 'betsnow' } : 
                  res2.data ? { ...res2.data, _source: 'tickets' } : null;

    if (found) {
      setTickets([found]);
    } else {
      alert("SERIAL NOT FOUND");
      fetchTickets();
    }
    setLoading(false);
  };

  const processPayout = async (ticket) => {
    const amount = parseFloat(ticket.potential_payout);
    
    // Strict Front-end check
    if (ticket.cashier_id !== currentUserId) {
      alert("UNAUTHORIZED: Only the terminal that issued this ticket can pay it out.");
      return;
    }

    const confirm = window.confirm(`CONFIRM PAYOUT & FLOAT INCREASE: KES ${amount.toLocaleString()}?`);
    if (!confirm) return;

    try {
      // 1. Atomic RPC Call: Handles both float increase and ticket status update
      const { error: rpcError } = await supabase.rpc('execute_exclusive_payout', { 
        p_ticket_id: ticket.id, 
        p_amount: amount,
        p_table_source: ticket._source 
      });

      if (rpcError) throw rpcError;

      alert("PAYOUT SUCCESSFUL - FLOAT REIMBURSED");
      fetchTickets();
    } catch (err) {
      alert("Error: " + (err.message || "Failed to process payout"));
    }
  };

  return (
    <CashierLayout>
      <div className="p-8 bg-[#0b0f1a] min-h-screen text-white font-sans">
        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div className="flex items-center gap-4 bg-[#111926] p-2 rounded-2xl border border-white/5 w-full md:w-96 focus-within:border-[#10b981]/50 transition-all">
            <Search className="ml-3 text-slate-500" size={18} />
            <input 
              placeholder="SEARCH TICKET SERIAL..." 
              className="bg-transparent flex-1 outline-none font-bold text-sm uppercase tracking-widest"
              value={searchSerial}
              onChange={(e) => setSearchSerial(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <div className="flex bg-[#111926] p-1 rounded-xl border border-white/5">
            {['all', 'pending', 'won', 'lost'].map((f) => (
              <button 
                key={f} 
                onClick={() => setFilter(f)} 
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filter === f ? 'bg-[#10b981] text-black' : 'text-slate-500 hover:text-white'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Tickets Grid */}
        {loading ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-[#10b981]" size={40} /></div>
        ) : (
          <div className="space-y-4 max-w-6xl mx-auto">
            {tickets.length === 0 ? (
              <p className="text-center text-slate-500 py-20 font-bold uppercase tracking-[0.3em]">No shift activity found</p>
            ) : (
              tickets.map((t) => (
                <div key={`${t._source}-${t.id}`} className="bg-[#111926] border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 hover:border-white/10 transition-all">
                  
                  {/* Left: Info */}
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl ${t.status === 'won' ? 'bg-green-500/10 text-green-500' : t.status === 'lost' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {t.status === 'won' ? <CheckCircle2 size={24}/> : t.status === 'lost' ? <XCircle size={24}/> : <Clock size={24}/>}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-black italic text-xl tracking-tighter">{t.ticket_serial}</h4>
                        <span className="text-[7px] bg-white/5 px-2 py-0.5 rounded text-slate-500 uppercase font-black">{t._source}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                        {new Date(t.created_at).toLocaleDateString()} • {new Date(t.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>

                  {/* Right: Money & Action */}
                  <div className="flex items-center gap-10">
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-500 uppercase italic leading-none mb-1">Win Payout</p>
                      <p className="text-2xl font-black italic tabular-nums">
                        <span className="text-xs mr-1 opacity-40 not-italic">KES</span>
                        {parseFloat(t.potential_payout || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="w-[180px] flex justify-end">
                      {t.status === 'won' && !t.is_paid ? (
                        t.cashier_id === currentUserId ? (
                          <button 
                            onClick={() => processPayout(t)} 
                            className="bg-[#10b981] hover:bg-[#0da371] text-black px-6 py-3 rounded-xl font-black italic text-xs uppercase flex items-center gap-2 transition-transform active:scale-95"
                          >
                            <Coins size={14}/> Pay & Refund Float
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-600 bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                            <Lock size={12} />
                            <span className="text-[9px] font-black uppercase">Other Terminal</span>
                          </div>
                        )
                      ) : (
                        <div className="text-right">
                          <span className={`text-[10px] font-black uppercase italic tracking-widest ${t.is_paid ? 'text-[#10b981]' : 'opacity-20'}`}>
                            {t.is_paid ? '✅ Paid & Reimbursed' : t.status}
                          </span>
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
