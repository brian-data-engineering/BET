import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import { Search, CheckCircle2, XCircle, Clock, Loader2, Coins } from 'lucide-react';

export default function TicketManager() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchSerial, setSearchSerial] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // Fetch from BOTH tables to ensure no tickets "disappear"
      const [betsNowRes, ticketsRes] = await Promise.all([
        supabase.from('betsnow').select('*'),
        supabase.from('tickets').select('*')
      ]);

      // Merge and add a source tag so we know where they came from
      let combined = [
        ...(betsNowRes.data || []).map(t => ({ ...t, _source: 'betsnow' })),
        ...(ticketsRes.data || []).map(t => ({ ...t, _source: 'tickets' }))
      ];

      // Filter logic
      if (filter !== 'all') {
        combined = combined.filter(t => t.status === filter);
      }

      // Sort by newest first
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
    
    // Search both tables for the serial
    const [res1, res2] = await Promise.all([
      supabase.from('betsnow').select('*').eq('ticket_serial', searchSerial).maybeSingle(),
      supabase.from('tickets').select('*').eq('ticket_serial', searchSerial).maybeSingle()
    ]);

    const found = res1.data ? { ...res1.data, _source: 'betsnow' } : 
                  res2.data ? { ...res2.data, _source: 'tickets' } : null;

    if (found) {
      setTickets([found]);
    } else {
      alert("SERIAL NOT FOUND IN ANY TABLE");
      fetchTickets();
    }
    setLoading(false);
  };

  const processPayout = async (ticket) => {
    const amount = parseFloat(ticket.potential_payout);
    const confirm = window.confirm(`Confirm payout of KES ${amount.toLocaleString()}?`);
    if (!confirm) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Update balance via RPC
      const { error: rpcError } = await supabase.rpc('increment_balance', { 
        user_id: user.id, 
        amount: amount 
      });

      if (rpcError) throw rpcError;

      // 2. Update the correct table based on the _source tag
      const { error: updateError } = await supabase
        .from(ticket._source)
        .update({ 
          is_paid: true, 
          paid_at: new Date().toISOString(),
          status: 'won' // Ensure status is explicitly set
        })
        .eq('id', ticket.id);

      if (updateError) throw updateError;

      alert("PAYOUT SUCCESSFUL");
      fetchTickets();
    } catch (err) {
      alert("Error processing payout: " + err.message);
    }
  };

  return (
    <CashierLayout>
      <div className="p-8 bg-[#0b0f1a] min-h-screen text-white">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div className="flex items-center gap-4 bg-[#111926] p-2 rounded-2xl border border-white/5 w-full md:w-96">
            <Search className="ml-3 text-slate-500" size={18} />
            <input 
              placeholder="SEARCH SERIAL..." 
              className="bg-transparent flex-1 outline-none font-bold text-sm uppercase"
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
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filter === f ? 'bg-[#10b981] text-black' : 'text-slate-500'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="flex justify-center mt-20">
            <Loader2 className="animate-spin text-[#10b981]" size={40} />
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.length === 0 ? (
              <p className="text-center text-slate-500 py-20 font-bold uppercase tracking-widest">No tickets found</p>
            ) : (
              tickets.map((t) => (
                <div key={`${t._source}-${t.id}`} className="bg-[#111926] border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${t.status === 'won' ? 'bg-green-500/10 text-green-500' : t.status === 'lost' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {t.status === 'won' ? <CheckCircle2 /> : t.status === 'lost' ? <XCircle /> : <Clock />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black italic text-lg tracking-wider">{t.ticket_serial || "NO SERIAL"}</h4>
                        <span className="text-[8px] bg-white/5 px-2 py-0.5 rounded text-slate-500 uppercase font-bold">{t._source}</span>
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase">{new Date(t.created_at).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-500 uppercase italic leading-none">Potential Payout</p>
                      <p className="text-xl font-black italic">KES {parseFloat(t.potential_payout || 0).toLocaleString()}</p>
                    </div>

                    {t.status === 'won' && !t.is_paid ? (
                      <button 
                        onClick={() => processPayout(t)} 
                        className="bg-[#10b981] hover:bg-[#0da371] text-black px-6 py-3 rounded-xl font-black italic text-xs uppercase flex items-center gap-2 transition-colors"
                      >
                        <Coins size={14}/> Pay Ticket
                      </button>
                    ) : (
                      <div className="text-right min-w-[120px]">
                        <span className={`text-[10px] font-black uppercase italic ${t.is_paid ? 'text-[#10b981]' : 'opacity-30'}`}>
                          {t.is_paid ? '✅ Paid Out' : t.status}
                        </span>
                      </div>
                    )}
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
