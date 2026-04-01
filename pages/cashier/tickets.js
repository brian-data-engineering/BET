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

  // Helper to get status color for individual selections
  const getSelStatusColor = (status) => {
    if (status === 'won') return 'text-[#10b981]';
    if (status === 'lost') return 'text-red-500';
    return 'text-slate-500';
  };

  return (
    <div className="bg-[#111926] border border-white/5 rounded-[2rem] overflow-hidden transition-all hover:border-white/10 group">
      <div 
        className="p-6 flex flex-col md:flex-row justify-between items-center gap-6 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Left: Info */}
        <div className="flex items-center gap-5 w-full md:w-auto">
          <div className={`p-4 rounded-2xl transition-colors ${
            ticket.status === 'won' ? 'bg-[#10b981]/10 text-[#10b981]' : 
            ticket.status === 'lost' ? 'bg-red-500/10 text-red-500' : 
            'bg-blue-500/10 text-blue-500'
          }`}>
            {ticket.status === 'won' ? <CheckCircle2 size={24}/> : ticket.status === 'lost' ? <XCircle size={24}/> : <Clock size={24}/>}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h4 className="font-black italic text-xl tracking-tighter text-white uppercase">
                {ticket.ticket_serial || ticket.booking_code}
              </h4>
              <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                <ChevronDown size={16} className="text-slate-600" />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              {new Date(ticket.created_at).toLocaleDateString()} • {new Date(ticket.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
          </div>
        </div>

        {/* Right: Money & Action */}
        <div className="flex items-center gap-10 w-full md:w-auto justify-between md:justify-end">
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-500 uppercase italic mb-1">Potential Payout</p>
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
                  className="bg-[#10b981] hover:bg-[#0da371] text-black px-6 py-3 rounded-xl font-black italic text-[10px] uppercase flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#10b981]/20"
                >
                  <Coins size={14}/> Pay Ticket
                </button>
              ) : (
                <div className="flex items-center gap-2 text-slate-600 bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                  <Lock size={12} />
                  <span className="text-[9px] font-black uppercase">Terminal Lock</span>
                </div>
              )
            ) : (
              <div className="text-right flex flex-col items-end">
                 <span className={`text-[10px] font-black uppercase italic tracking-widest px-3 py-1 rounded-full border ${
                   ticket.is_paid ? 'text-[#10b981] border-[#10b981]/20 bg-[#10b981]/5' : 'text-slate-500 border-white/5 bg-white/5'
                 }`}>
                  {ticket.is_paid ? '✓ Paid Out' : ticket.status}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Receipt Preview */}
      {isExpanded && (
        <div className="px-6 pb-8 pt-4 bg-black/40 border-t border-white/5 relative">
          {/* Decorative Receipt Notch */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0b0f1a] rotate-45 border-l border-t border-white/5" />
          
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6 border-b border-dashed border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Receipt size={14} className="text-[#10b981]" />
                <span className="text-[11px] font-black uppercase italic tracking-[0.2em] text-slate-400">Selection Details</span>
              </div>
              <span className="text-[10px] font-mono text-slate-600">Items: {ticket.selections?.length || 0}</span>
            </div>

            <div className="space-y-1">
              {ticket.selections?.map((sel, idx) => (
                <div key={idx} className="relative pl-6 pb-6 last:pb-0 border-l border-white/5">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full border-2 border-[#111926] ${
                    sel.status === 'won' ? 'bg-[#10b981]' : sel.status === 'lost' ? 'bg-red-500' : 'bg-slate-700'
                  }`} />
                  
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-white uppercase italic tracking-tight">
                        {sel.home_team} <span className="text-slate-600 font-normal px-1">vs</span> {sel.away_team}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#f59e0b] uppercase italic">{sel.market_name}:</span>
                        <span className="text-[10px] font-black text-white uppercase">{sel.selection_name}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs font-mono font-black text-[#10b981]">@{parseFloat(sel.odds).toFixed(2)}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${getSelStatusColor(sel.status)}`}>
                        <span className="text-[9px] font-black uppercase italic">{sel.status || 'pending'}</span>
                        {sel.status === 'won' ? <CheckCircle2 size={10} /> : sel.status === 'lost' ? <XCircle size={10} /> : <Clock size={10} />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Receipt Summary Footer */}
            <div className="mt-6 pt-6 border-t border-dashed border-white/10 flex justify-between items-center text-[10px] font-black uppercase italic text-slate-500">
               <p>Total Odds: <span className="text-white ml-1">{parseFloat(ticket.total_odds || 0).toFixed(2)}</span></p>
               <p>Stake: <span className="text-white ml-1">KES {parseFloat(ticket.stake || 0).toLocaleString()}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
