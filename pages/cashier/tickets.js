import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import { Search, CheckCircle2, XCircle, Clock, Loader2, Coins, Receipt } from 'lucide-react';

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
    const { data } = await supabase.from('betsnow').select('*').order('created_at', { ascending: false }).limit(20);
    setTickets(data || []);
    setLoading(false);
  };

  const handlePayout = async (ticket) => {
    if (!window.confirm(`PAYOUT KES ${ticket.potential_payout}?`)) return;
    
    setLoading(true);
    const { error } = await supabase.rpc('execute_lucra_payout', {
      p_ticket_id: ticket.id,
      p_cashier_id: user.id,
      p_payout_amount: parseFloat(ticket.potential_payout)
    });

    if (error) {
      alert(error.message);
    } else {
      alert("SUCCESS: FLOAT UPDATED");
      fetchTickets();
    }
    setLoading(false);
  };

  return (
    <CashierLayout>
      <div className="p-8 bg-[#0b0f1a] min-h-screen text-white">
        <div className="flex gap-4 mb-10">
          <div className="flex-1 bg-[#111926] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <Search size={18} className="opacity-30" />
            <input 
              className="bg-transparent outline-none w-full font-bold uppercase" 
              placeholder="Enter Serial..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchTickets()}
            />
          </div>
        </div>

        {loading ? <Loader2 className="animate-spin mx-auto mt-20 text-[#10b981]" /> : (
          <div className="space-y-4">
            {tickets.map(t => (
              <div key={t.id} className="bg-[#111926] p-6 rounded-[2rem] flex justify-between items-center border border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${t.status === 'won' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-white/5'}`}>
                    {t.status === 'won' ? <CheckCircle2 /> : <Clock />}
                  </div>
                  <div>
                    <h4 className="font-black italic text-lg uppercase">{t.ticket_serial || t.booking_code}</h4>
                    <p className="text-[10px] opacity-30 font-bold uppercase">{new Date(t.created_at).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[9px] font-black opacity-30 uppercase">Potential Payout</p>
                    <p className="text-xl font-black italic">KES {parseFloat(t.potential_payout).toLocaleString()}</p>
                  </div>
                  {t.status === 'won' && !t.is_paid && (
                    <button onClick={() => handlePayout(t)} className="bg-[#10b981] text-black px-6 py-3 rounded-xl font-black italic uppercase text-xs">
                      Pay Ticket
                    </button>
                  )}
                  {t.is_paid && <span className="text-[#10b981] font-black italic text-xs uppercase">✓ Paid Out</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CashierLayout>
  );
}
