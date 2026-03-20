import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import { Search, Receipt, CheckCircle2, XCircle } from 'lucide-react';

export default function TicketManager() {
  const [ticketId, setTicketId] = useState('');
  const [ticket, setTicket] = useState(null);

  const findTicket = async () => {
    const { data } = await supabase.from('tickets').select('*').eq('id', ticketId).single();
    setTicket(data);
  };

  return (
    <CashierLayout>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Ticket Validator</h1>
          <p className="text-gray-500 text-sm">Scan or enter the 8-digit Ticket ID</p>
        </div>

        <div className="flex gap-4 mb-10">
          <div className="relative flex-1">
            <Receipt className="absolute left-4 top-4 text-gray-500" size={20} />
            <input 
              placeholder="Enter Ticket ID (e.g. LC-4492)" 
              className="w-full bg-slate-900 p-4 pl-12 rounded-2xl border border-gray-800 focus:border-lucra-green outline-none font-mono"
              onChange={e => setTicketId(e.target.value)}
            />
          </div>
          <button onClick={findTicket} className="bg-lucra-green text-black px-10 rounded-2xl font-black flex items-center gap-2 hover:bg-white transition-all">
            <Search size={20}/> VALIDATE
          </button>
        </div>

        {ticket && (
          <div className="bg-slate-900 rounded-[2.5rem] p-10 border border-gray-800 animate-in fade-in zoom-in-95">
             <div className="flex justify-between border-b border-gray-800 pb-6 mb-6">
                <div>
                    <p className="text-[10px] text-gray-500 font-black uppercase">Status</p>
                    <span className={`text-xl font-black uppercase ${ticket.status === 'won' ? 'text-lucra-green' : 'text-red-500'}`}>
                        {ticket.status}
                    </span>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-black uppercase">Potential Payout</p>
                    <p className="text-xl font-black">KES {ticket.payout}</p>
                </div>
             </div>
             {ticket.status === 'won' && !ticket.is_paid ? (
                 <button className="w-full bg-lucra-green text-black font-black py-5 rounded-2xl flex items-center justify-center gap-2">
                    <CheckCircle2 size={20} /> PAY OUT KES {ticket.payout}
                 </button>
             ) : (
                 <div className="text-center py-4 text-gray-500 font-bold uppercase text-xs italic">
                    {ticket.is_paid ? "Ticket Already Paid" : "Ticket Not Eligible for Payout"}
                 </div>
             )}
          </div>
        )}
      </div>
    </CashierLayout>
  );
}
