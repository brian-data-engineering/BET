import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import { Search, Receipt, CheckCircle2, ShieldAlert, Coins } from 'lucide-react';

export default function TicketManager() {
  const [ticketId, setTicketId] = useState('');
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);

  const findTicket = async () => {
    setLoading(true);
    const { data } = await supabase.from('betsnow').select('*').eq('booking_code', ticketId.toUpperCase()).single();
    setTicket(data);
    setLoading(false);
  };

  const handlePayout = async () => {
    const { error } = await supabase.from('betsnow').update({ is_paid: true, paid_at: new Date() }).eq('id', ticket.id);
    if (!error) {
      alert("PAYOUT SUCCESS");
      setTicket({ ...ticket, is_paid: true });
    }
  };

  return (
    <CashierLayout>
      <div className="p-8 max-w-4xl mx-auto text-white">
        <h1 className="text-4xl font-black italic uppercase text-center mb-12">Ticket Validator</h1>
        <div className="flex gap-4 mb-12">
          <input 
            className="flex-1 bg-[#111926] p-5 rounded-2xl border border-white/5 outline-none font-bold uppercase tracking-widest"
            placeholder="ENTER BOOKING CODE"
            onChange={e => setTicketId(e.target.value)}
          />
          <button onClick={findTicket} className="bg-[#10b981] text-black px-10 rounded-2xl font-black italic uppercase">
            {loading ? "Checking..." : "Verify"}
          </button>
        </div>

        {ticket && (
          <div className="bg-[#111926] rounded-[3rem] p-10 border border-white/5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-8 mb-8">
              <h2 className="text-3xl font-black italic text-[#10b981]">{ticket.booking_code}</h2>
              <span className="px-4 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest">{ticket.status}</span>
            </div>
            
            <div className="text-center py-6">
              <p className="text-slate-500 uppercase text-[10px] font-black italic mb-2">Potential Payout</p>
              <p className="text-5xl font-black italic tracking-tighter">KES {ticket.potential_payout}</p>
            </div>

            {ticket.status === 'won' && !ticket.is_paid ? (
              <button onClick={handlePayout} className="w-full bg-[#10b981] text-black font-black py-6 rounded-[2rem] flex items-center justify-center gap-3 text-xl italic mt-6">
                <Coins size={24} /> CONFIRM PAYOUT
              </button>
            ) : (
              <div className="text-center mt-10 text-slate-500 uppercase font-black italic text-xs">
                {ticket.is_paid ? "TICKET ALREADY PAID" : "NOT ELIGIBLE FOR PAYOUT"}
              </div>
            )}
          </div>
        )}
      </div>
    </CashierLayout>
  );
}
