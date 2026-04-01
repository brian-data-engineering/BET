import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import { 
  Search, CheckCircle2, XCircle, Clock, Loader2, 
  Coins, Lock, ChevronDown, ChevronUp, Receipt 
} from 'lucide-react';

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
      // Note: Pulling specifically from 'betsnow' as per your schema inspection
      const { data, error } = await supabase
        .from('betsnow')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      let combined = data || [];
      if (filter !== 'all') {
        combined = combined.filter(t => t.status === filter);
      }
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
    
    const { data, error } = await supabase
      .from('betsnow')
      .select('*')
      .or(`ticket_serial.eq.${cleanSerial},booking_code.eq.${cleanSerial}`)
      .maybeSingle();

    if (data) {
      setTickets([data]);
    } else {
      alert("SERIAL NOT FOUND");
      fetchTickets();
    }
    setLoading(false);
  };

  const processPayout = async (ticket) => {
    if (ticket.cashier_id !== currentUserId) {
      alert("UNAUTHORIZED: Only the issuing terminal can process this payout.");
      return;
    }

    const confirm = window.confirm(`CONFIRM PAYOUT: KES ${parseFloat(ticket.potential_payout).toLocaleString()}?`);
    if (!confirm) return;

    try {
      const { error } = await supabase.rpc('execute_exclusive_payout', { 
        p_ticket_id: ticket.id, 
        p_amount: parseFloat(ticket.potential_payout),
        p_table_source: 'betsnow' 
      });

      if (error) throw error;
      alert("PAYOUT SUCCESSFUL");
      fetchTickets();
    } catch (err) {
      alert("Error: " + err.message);
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
              className="bg-transparent flex-1 outline-none font-bold text-sm uppercase tracking-widest placeholder:opacity-20"
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

        {/* Tickets List */}
        {loading ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-[#10b981]" size={40} /></div>
        ) : (
          <div className="space-y-4 max-w-6xl mx-auto">
            {tickets.length === 0 ? (
              <p className="text-center text-slate-500 py-20 font-bold uppercase tracking-[0.3em]">No shift activity found</p>
            ) : (
              tickets.map((t) => (
                <TicketRow 
                  key={t.id} 
                  ticket={t} 
                  currentUserId={currentUserId} 
                  onPayout={processPayout} 
                />
              ))
            )}
          </div>
        )}
      </div>
    </CashierLayout>
  );
}

function TicketRow({ ticket, currentUserId, onPayout }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-[#111926] border border-white/5 rounded-[2rem] overflow-hidden transition-all hover:border-white/10">
      <div 
        className="p-6 flex flex-col md:flex-row justify-between items-center gap-6 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Left: Info */}
        <div className="flex items-center gap-5 w-full md:w-auto">
          <div className={`p-4 rounded-2xl ${ticket.status === 'won' ? 'bg-green-500/10 text-green-500' : ticket.status === 'lost' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
            {ticket.status === 'won' ? <CheckCircle2 size={24}/> : ticket.status === 'lost' ? <XCircle size={24}/> : <Clock size={24}/>}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h4 className="font-black italic text-xl tracking-tighter text-white">
                {ticket.ticket_serial || ticket.booking_code}
              </h4>
              {isExpanded ? <ChevronUp size={14} className="text-slate-600"/> : <ChevronDown size={14} className="text-slate-600"/>}
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
              {new Date(ticket.created_at).toLocaleDateString()} • {new Date(ticket.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
          </div>
        </div>

        {/* Right: Money & Action */}
        <div className="flex items-center gap-10 w-full md:w-auto justify-between md:justify-end">
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-500 uppercase italic mb-1">Win Payout</p>
            <p className="text-2xl font-black italic tabular-nums text-white">
              <span className="text-xs mr-1 opacity-40 not-italic">KES</span>
              {parseFloat(ticket.potential_payout || 0).toLocaleString()}
            </p>
          </div>

          <div className="w-[180px] flex justify-end">
            {ticket.status === 'won' && !ticket.is_paid ? (
              ticket.cashier_id === currentUserId ? (
                <button 
                  onClick={(e) => { e.stopPropagation(); onPayout(ticket); }} 
                  className="bg-[#10b981] hover:bg-[#0da371] text-black px-6 py-3 rounded-xl font-black italic text-xs uppercase flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-[#10b981]/10"
                >
                  <Coins size={14}/> Pay & Refund
                </button>
              ) : (
                <div className="flex items-center gap-2 text-slate-600 bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                  <Lock size={12} />
                  <span className="text-[9px] font-black uppercase">Other Terminal</span>
                </div>
              )
            ) : (
              <div className="text-right">
                <span className={`text-[10px] font-black uppercase italic tracking-widest ${ticket.is_paid ? 'text-[#10b981]' : 'opacity-20 text-slate-400'}`}>
                  {ticket.is_paid ? '✅ Paid & Reimbursed' : ticket.status}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Selection Preview */}
      {isExpanded && (
        <div className="px-6 pb-8 pt-2 bg-black/20 border-t border-white/5">
          <div className="flex items-center gap-2 mb-4 opacity-30">
            <Receipt size={12} />
            <span className="text-[9px] font-black uppercase tracking-widest">Selection Details</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ticket.selections?.map((sel, idx) => (
              <div key={idx} className="bg-[#0b0f1a] border border-white/5 p-4 rounded-2xl flex justify-between items-center group hover:border-white/10 transition-all">
                <div className="space-y-1">
                  <p className="text-[11px] font-black text-white uppercase italic leading-none">
                    {sel.home_team} <span className="text-slate-600 px-1">vs</span> {sel.away_team}
                  </p>
                  <p className="text-[9px] font-bold text-[#f59e0b] uppercase italic tracking-tighter">
                    {sel.market_name}: <span className="text-white">{sel.selection_name}</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-mono font-black text-[#10b981]">@{parseFloat(sel.odds).toFixed(2)}</span>
                  {sel.status === 'won' ? (
                    <CheckCircle2 size={12} className="text-[#10b981]" />
                  ) : sel.status === 'lost' ? (
                    <XCircle size={12} className="text-red-500" />
                  ) : (
                    <Clock size={12} className="text-slate-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
