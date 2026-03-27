import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import { Search, CheckCircle2, XCircle, Clock, Loader2, Coins } from 'lucide-react';

export default function TicketManager() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchSerial, setSearchSerial] = useState('');

  useEffect(() => { fetchTickets(); }, [filter]);

  const fetchTickets = async () => {
    setLoading(true);
    let query = supabase.from('betsnow').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    
    const { data } = await query.limit(20);
    setTickets(data || []);
    setLoading(false);
  };

  const handleSearch = async () => {
    if(!searchSerial) return;
    setLoading(true);
    const { data } = await supabase.from('betsnow').select('*').eq('ticket_serial', searchSerial).single();
    if(data) setTickets([data]);
    else alert("SERIAL NOT FOUND");
    setLoading(false);
  };

  const processPayout = async (ticket) => {
    const confirm = window.confirm(`Pay KES ${ticket.potential_payout.toLocaleString()} to customer?`);
    if (!confirm) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    // Increment Float & Mark Paid
    const { error } = await supabase.rpc('increment_balance', { 
      user_id: user.id, 
      amount: parseFloat(ticket.potential_payout) 
    });

    if (!error) {
      await supabase.from('betsnow').update({ is_paid: true, paid_at: new Date() }).eq('id', ticket.id);
      alert("PAYOUT SUCCESSFUL");
      fetchTickets();
    }
  };

  return (
    <CashierLayout>
      <div className="p-8 bg-[#0b0f1a] min-h-screen text-white">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div className="flex items-center gap-4 bg-[#111926] p-2 rounded-2xl border border-white/5 w-full md:w-96">
            <Search className="ml-3 text-slate-500" size={18} />
            <input 
              placeholder="ENTER 10-DIGIT SERIAL..." 
              className="bg-transparent flex-1 outline-none font-bold text-sm uppercase"
              value={searchSerial}
              onChange={(e) => setSearchSerial(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <div className="flex bg-[#111926] p-1 rounded-xl border border-white/5">
            {['all', 'pending', 'won', 'lost'].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filter === f ? 'bg-[#10b981] text-black' : 'text-slate-500'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? <Loader2 className="animate-spin mx-auto mt-20 text-[#10b981]" /> : (
          <div className="space-y-4">
            {tickets.map((t) => (
              <div key={t.id} className="bg-[#111926] border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${t.status === 'won' ? 'bg-green-500/10 text-green-500' : t.status === 'lost' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    {t.status === 'won' ? <CheckCircle2 /> : t.status === 'lost' ? <XCircle /> : <Clock />}
                  </div>
                  <div>
                    <h4 className="font-black italic text-lg tracking-wider">{t.ticket_serial || "NO SERIAL"}</h4>
                    <p className="text-[9px] text-slate-500 font-bold uppercase">{new Date(t.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                   <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-500 uppercase italic leading-none">Payout</p>
                      <p className="text-xl font-black italic">KES {t.potential_payout.toLocaleString()}</p>
                   </div>
                   {t.status === 'won' && !t.is_paid ? (
                     <button onClick={() => processPayout(t)} className="bg-[#10b981] text-black px-6 py-3 rounded-xl font-black italic text-xs uppercase flex items-center gap-2">
                       <Coins size={14}/> Pay Ticket
                     </button>
                   ) : (
                     <span className="text-[10px] font-black uppercase opacity-30 italic">{t.is_paid ? 'Already Paid' : t.status}</span>
                   )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CashierLayout>
  );
}
