import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  Trophy, 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Wallet, 
  Hash,
  AlertCircle,
  Eye
} from 'lucide-react';

export default function SettlementPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchPendingTickets();
  }, []);

  const fetchPendingTickets = async () => {
    setLoading(true);
    try {
      // Fetch pending bets and join with potential results via matchId
      const { data, error } = await supabase
        .from('betsnow')
        .select(`
          *,
          cashier:cashier_id ( name )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For each ticket, we'll need to fetch the current results for its matches
      const ticketsWithResults = await Promise.all((data || []).map(async (ticket) => {
        const matchIds = ticket.selections.map(s => s.matchId);
        const { data: results } = await supabase
          .from('soccer_results')
          .select('*')
          .in('event_id', matchIds);

        return { ...ticket, available_results: results || [] };
      }));

      setTickets(ticketsWithResults);
    } catch (err) {
      console.error("Settlement Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkLegStatus = (selection, result) => {
    if (!result) return 'PENDING';
    
    const h = result.home_score;
    const a = result.away_score;
    const hp1 = result.home_p1_score;
    const ap1 = result.away_p1_score;

    switch (selection.marketName) {
      case '1X2':
      case 'Winner':
        if (selection.selection === '1') return h > a ? 'WON' : 'LOST';
        if (selection.selection === '2') return a > h ? 'WON' : 'LOST';
        if (selection.selection === 'X') return h === a ? 'WON' : 'LOST';
        break;
      case '1ST HALF - 1X2':
        if (selection.selection === '1') return hp1 > ap1 ? 'WON' : 'LOST';
        if (selection.selection === '2') return ap1 > hp1 ? 'WON' : 'LOST';
        if (selection.selection === 'X') return hp1 === ap1 ? 'WON' : 'LOST';
        break;
      case 'BOTH TEAMS TO SCORE (GG/NG)':
        const isGG = h > 0 && a > 0;
        return selection.selection === 'YES' ? (isGG ? 'WON' : 'LOST') : (!isGG ? 'WON' : 'LOST');
    }
    return 'MANUAL'; // For complex markets like Londrina's 1/2 & OVER
  };

  const handleSettle = async (ticket, finalStatus) => {
    setProcessingId(ticket.id);
    try {
      // 1. Log the action
      const { error: logError } = await supabase.from('settlement_logs').insert({
        ticket_id: ticket.id,
        ticket_serial: ticket.ticket_serial,
        cashier_id: ticket.cashier_id,
        payout_amount: finalStatus === 'won' ? ticket.potential_payout : 0,
        settlement_data: { legs: ticket.selections }
      });

      // 2. Update Ticket & Balance (Simplified call - ideally use the RPC we discussed)
      const { error: ticketError } = await supabase
        .from('betsnow')
        .update({ 
            status: finalStatus, 
            is_paid: finalStatus === 'won',
            settled_at: new Promise(resolve => resolve(new Date().toISOString()))
        })
        .eq('id', ticket.id);

      if (!logError && !ticketError) {
        setTickets(prev => prev.filter(t => t.id !== ticket.id));
      }
    } catch (err) {
      alert("Settlement Failed");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.ticket_serial?.includes(searchTerm) || 
    t.selections.some(s => s.matchName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AdminLayout>
      <div className="p-8 bg-[#0b0f1a] min-h-screen text-white space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={14} className="text-[#f59e0b]" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Manual Override & Payout</span>
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">Lucra Settlement</h1>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text"
              placeholder="SEARCH SERIAL OR TEAM..."
              className="w-full bg-[#111926] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold uppercase italic focus:border-[#f59e0b] outline-none"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tickets List */}
        <div className="space-y-6">
          {loading ? (
            <div className="py-20 text-center animate-pulse italic font-black text-slate-700 uppercase tracking-[0.5em]">Scanning Active Tickets...</div>
          ) : (
            filteredTickets.map((ticket) => {
              const ticketEvaluation = ticket.selections.map(sel => {
                const res = ticket.available_results.find(r => r.event_id === sel.matchId);
                return { ...sel, status: checkLegStatus(sel, res) };
              });

              const canSettleWon = ticketEvaluation.every(l => l.status === 'WON');
              const isLost = ticketEvaluation.some(l => l.status === 'LOST');

              return (
                <div key={ticket.id} className="bg-[#111926] border border-white/5 rounded-[2.5rem] overflow-hidden transition-all hover:border-white/10">
                  <div className="p-6 flex flex-col lg:flex-row gap-8">
                    
                    {/* Left: Ticket Info */}
                    <div className="min-w-[200px] space-y-2">
                      <div className="flex items-center gap-2">
                        <Hash size={12} className="text-slate-500" />
                        <span className="text-xs font-black italic text-slate-400">{ticket.ticket_serial || 'NO SERIAL'}</span>
                      </div>
                      <div className="text-2xl font-black text-[#10b981] italic">KES {ticket.potential_payout}</div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase italic">
                        <Wallet size={12} />
                        Cashier: {ticket.cashier?.name || 'Unknown'}
                      </div>
                    </div>

                    {/* Middle: Selection Details */}
                    <div className="flex-1 space-y-3">
                      {ticketEvaluation.map((sel, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-[#0b0f1a] p-3 rounded-2xl border border-white/[0.03]">
                          <div>
                            <span className="text-[9px] font-black text-slate-600 uppercase block">{sel.marketName}</span>
                            <span className="text-xs font-bold italic">{sel.matchName}</span>
                            <span className="ml-3 text-[10px] bg-white/5 px-2 py-0.5 rounded text-[#f59e0b]">Pick: {sel.selection}</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {sel.status === 'WON' && <CheckCircle2 size={18} className="text-[#10b981]" />}
                            {sel.status === 'LOST' && <XCircle size={18} className="text-red-500" />}
                            {sel.status === 'PENDING' && <Clock size={18} className="text-slate-700" />}
                            <span className={`text-[10px] font-black uppercase italic ${
                              sel.status === 'WON' ? 'text-[#10b981]' : 
                              sel.status === 'LOST' ? 'text-red-500' : 'text-slate-700'
                            }`}>{sel.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex flex-col justify-center gap-3 min-w-[160px]">
                      {canSettleWon ? (
                        <button 
                          onClick={() => handleSettle(ticket, 'won')}
                          disabled={processingId === ticket.id}
                          className="w-full bg-[#10b981] text-[#0b0f1a] py-4 rounded-2xl font-black uppercase italic text-xs shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:scale-105 transition-all"
                        >
                          APPROVE PAYOUT
                        </button>
                      ) : isLost ? (
                        <button 
                          onClick={() => handleSettle(ticket, 'lost')}
                          className="w-full bg-red-500/10 text-red-500 border border-red-500/20 py-4 rounded-2xl font-black uppercase italic text-xs hover:bg-red-500 hover:text-white transition-all"
                        >
                          MARK AS LOST
                        </button>
                      ) : (
                        <div className="text-center p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
                          <AlertCircle size={20} className="mx-auto text-slate-700 mb-2" />
                          <span className="text-[9px] font-black text-slate-600 uppercase">Awaiting Results</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
