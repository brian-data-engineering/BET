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
  AlertCircle
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
      const { data: rawTickets, error } = await supabase
        .from('betsnow')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ticketsWithResults = await Promise.all((rawTickets || []).map(async (ticket) => {
        const matchIds = ticket.selections?.map(s => s.matchId).filter(Boolean) || [];
        const matchNames = ticket.selections?.map(s => s.matchName).filter(Boolean) || [];

        // Logic: Try to find results by ID OR by Exact Match Name (Backup)
        const { data: results } = await supabase
          .from('soccer_results')
          .select('*')
          .or(`event_id.in.(${matchIds.join(',')}),event_name.in.(${matchNames.map(n => `"${n}"`).join(',')})`);

        return { 
          ...ticket, 
          available_results: results || [],
          display_cashier: ticket.cashier_id ? `ID: ${ticket.cashier_id.substring(0, 5)}` : 'System'
        };
      }));

      setTickets(ticketsWithResults);
    } catch (err) {
      console.error("Lucra Settlement Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkLegStatus = (selection, result) => {
    if (!result) return 'PENDING';
    
    const h = parseFloat(result.home_score);
    const a = parseFloat(result.away_score);
    const hp1 = parseFloat(result.home_p1_score);
    const ap1 = parseFloat(result.away_p1_score);
    const pick = selection.selection.toUpperCase();
    const market = selection.marketName.toUpperCase();

    // Handle "Winner" where pick is a Team Name
    if (market === 'WINNER') {
        const matchTeams = selection.matchName.split(' vs ');
        if (pick === matchTeams[0].toUpperCase()) return h > a ? 'WON' : 'LOST';
        if (pick === matchTeams[1].toUpperCase()) return a > h ? 'WON' : 'LOST';
    }

    switch (market) {
      case '1X2':
        if (pick === '1') return h > a ? 'WON' : 'LOST';
        if (pick === '2') return a > h ? 'WON' : 'LOST';
        if (pick === 'X') return h === a ? 'WON' : 'LOST';
        break;

      case '1ST HALF - 1X2':
        if (pick === '1') return hp1 > ap1 ? 'WON' : 'LOST';
        if (pick === '2') return ap1 > hp1 ? 'WON' : 'LOST';
        if (pick === 'X') return hp1 === ap1 ? 'WON' : 'LOST';
        break;

      case 'DOUBLE CHANCE':
      case '1ST HALF - DOUBLE CHANCE':
        const curH = market.includes('1ST HALF') ? hp1 : h;
        const curA = market.includes('1ST HALF') ? ap1 : a;
        if (pick === '1/X' || pick === '1X') return curH >= curA ? 'WON' : 'LOST';
        if (pick === 'X/2' || pick === 'X2') return curA >= curH ? 'WON' : 'LOST';
        if (pick === '1/2') return curH !== curA ? 'WON' : 'LOST';
        break;

      case 'BOTH TEAMS TO SCORE (GG/NG)':
        const isGG = h > 0 && a > 0;
        return (pick === 'YES' || pick === 'GG') ? (isGG ? 'WON' : 'LOST') : (!isGG ? 'WON' : 'LOST');

      case 'MULTIGOALS':
        const totalGoals = h + a;
        if (pick === '1-2') return (totalGoals >= 1 && totalGoals <= 2) ? 'WON' : 'LOST';
        if (pick === '2-3') return (totalGoals >= 2 && totalGoals <= 3) ? 'WON' : 'LOST';
        if (pick === '1-3') return (totalGoals >= 1 && totalGoals <= 3) ? 'WON' : 'LOST';
        break;

      case 'WHO WILL WIN? (IF DRAW, MONEY BACK)':
        if (h === a) return 'VOID';
        if (pick === '1') return h > a ? 'WON' : 'LOST';
        if (pick === '2') return a > h ? 'WON' : 'LOST';
        break;

      default:
        // Handle Over/Under Totals
        if (pick.includes('OVER') || pick.includes('UNDER')) {
          const threshold = parseFloat(pick.replace(/[^\d.]/g, ''));
          const relevantScore = market.includes('AWAY') ? a : market.includes('HOME') ? h : (h + a);
          if (pick.includes('OVER')) return relevantScore > threshold ? 'WON' : 'LOST';
          if (pick.includes('UNDER')) return relevantScore < threshold ? 'WON' : 'LOST';
        }
        return 'PENDING';
    }
  };

  const handleSettle = async (ticket, finalStatus) => {
    if (processingId) return;
    setProcessingId(ticket.id);
    try {
      await supabase.from('settlement_logs').insert({
        ticket_id: ticket.id,
        ticket_serial: ticket.ticket_serial,
        cashier_id: ticket.cashier_id,
        payout_amount: finalStatus === 'won' ? ticket.potential_payout : 0,
        settlement_data: { selections: ticket.selections }
      });

      const { error } = await supabase
        .from('betsnow')
        .update({ 
          status: finalStatus, 
          is_paid: finalStatus === 'won',
          settled_at: new Date().toISOString()
        })
        .eq('id', ticket.id);

      if (!error) setTickets(prev => prev.filter(t => t.id !== ticket.id));
    } catch (err) {
      console.error("Action Error:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.ticket_serial?.includes(searchTerm) || 
    t.selections?.some(s => s.matchName?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AdminLayout>
      <div className="p-8 bg-[#0b0f1a] min-h-screen text-white space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={14} className="text-[#f59e0b]" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">LUCRA CORE v2.0</span>
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">Settlement</h1>
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

        <div className="space-y-6">
          {loading ? (
            <div className="py-20 text-center animate-pulse italic font-black text-slate-700 uppercase tracking-[0.5em]">Fetching Match Results...</div>
          ) : (
            filteredTickets.map((ticket) => {
              const ticketEvaluation = (ticket.selections || []).map(sel => {
                // Find by ID first, then fallback to Team Name matching
                const res = ticket.available_results.find(r => 
                    String(r.event_id) === String(sel.matchId) || 
                    String(r.event_name).toLowerCase() === String(sel.matchName).toLowerCase()
                );
                return { ...sel, status: checkLegStatus(sel, res), live_res: res };
              });

              const canSettleWon = ticketEvaluation.length > 0 && ticketEvaluation.every(l => l.status === 'WON');
              const isLost = ticketEvaluation.some(l => l.status === 'LOST');

              return (
                <div key={ticket.id} className="bg-[#111926] border border-white/5 rounded-[2.5rem] overflow-hidden">
                  <div className="p-6 flex flex-col lg:flex-row gap-8">
                    <div className="min-w-[200px] space-y-2">
                      <div className="flex items-center gap-2">
                        <Hash size={12} className="text-slate-500" />
                        <span className="text-xs font-black italic text-slate-400">{ticket.ticket_serial}</span>
                      </div>
                      <div className="text-2xl font-black text-[#10b981] italic tracking-tight">KES {ticket.potential_payout}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Cashier: {ticket.display_cashier}</div>
                    </div>

                    <div className="flex-1 space-y-3">
                      {ticketEvaluation.map((sel, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-[#0b0f1a] p-3 rounded-2xl border border-white/[0.03]">
                          <div className="max-w-[70%]">
                            <span className="text-[9px] font-black text-slate-600 uppercase block leading-none mb-1">{sel.marketName}</span>
                            <span className="text-xs font-bold italic truncate block">{sel.matchName}</span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-[#f59e0b] font-bold">Pick: {sel.selection}</span>
                                {sel.live_res && (
                                    <span className="text-[10px] bg-[#10b981]/10 px-2 py-0.5 rounded text-[#10b981] font-black">
                                        SCORE: {sel.live_res.home_score} - {sel.live_res.away_score}
                                    </span>
                                )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-black uppercase ${sel.status === 'WON' ? 'text-[#10b981]' : sel.status === 'LOST' ? 'text-red-500' : 'text-slate-700'}`}>
                              {sel.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col justify-center gap-3 min-w-[160px]">
                      {canSettleWon ? (
                        <button onClick={() => handleSettle(ticket, 'won')} className="w-full bg-[#10b981] text-[#0b0f1a] py-4 rounded-2xl font-black uppercase italic text-xs">APPROVE PAYOUT</button>
                      ) : isLost ? (
                        <button onClick={() => handleSettle(ticket, 'lost')} className="w-full bg-red-500/10 text-red-500 border border-red-500/20 py-4 rounded-2xl font-black uppercase italic text-xs">MARK AS LOST</button>
                      ) : (
                        <div className="flex flex-col gap-2">
                           <div className="grid grid-cols-2 gap-2">
                             <button onClick={() => confirm("Force Won?") && handleSettle(ticket, 'won')} className="py-2 rounded-lg bg-[#10b981]/10 text-[#10b981] text-[9px] font-black border border-[#10b981]/20">FORCE WON</button>
                             <button onClick={() => confirm("Force Lost?") && handleSettle(ticket, 'lost')} className="py-2 rounded-lg bg-red-500/10 text-red-500 text-[9px] font-black border border-red-500/20">FORCE LOST</button>
                           </div>
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
