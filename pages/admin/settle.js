import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { Trophy, Search, Hash, Activity, CheckCircle2, XCircle, ChevronRight, Zap } from 'lucide-react';

export default function SettlementPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => { fetchPendingTickets(); }, []);

  const fetchPendingTickets = async () => {
    setLoading(true);
    try {
      const [ticketsRes, resultsRes, mappingsRes] = await Promise.all([
        supabase
          .from('betsnow')
          .select('*')
          .eq('status', 'pending')
          // FIX: Filter out tickets without serial numbers
          .not('ticket_serial', 'is', null)
          .neq('ticket_serial', '')
          .order('created_at', { ascending: false }),
        supabase.from('soccer_results').select('*').order('created_at', { ascending: false }).limit(300),
        supabase.from('team_mappings').select('*')
      ]);

      if (ticketsRes.error) throw ticketsRes.error;

      const allResults = resultsRes.data || [];
      const mappings = mappingsRes.data || [];

      const ticketsWithData = (ticketsRes.data || []).map(ticket => {
        const enrichedSelections = (ticket.selections || []).map(sel => {
          const [hBet, aBet] = sel.matchName.split(' vs ');
          const officialH = mappings.find(m => m.bet_team_name === hBet)?.official_team_name || hBet;
          const officialA = mappings.find(m => m.bet_team_name === aBet)?.official_team_name || aBet;

          const res = allResults.find(r => 
            String(r.event_id) === String(sel.matchId) || 
            (r.home_team === officialH && r.away_team === officialA) ||
            (r.home_team.includes(hBet.split(' ')[0]) && r.away_team.includes(aBet.split(' ')[0]))
          );

          return { ...sel, res, status: checkLegStatus(sel, res) };
        });

        return { ...ticket, enrichedSelections };
      });

      setTickets(ticketsWithData);
    } catch (err) {
      console.error("Lucra Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkLegStatus = (sel, res) => {
    if (!res) return 'PENDING';
    const h = parseFloat(res.home_score), a = parseFloat(res.away_score);
    const pick = sel.selection.toUpperCase(), mkt = sel.marketName.toUpperCase();

    if (mkt.includes('WINNER') || mkt === '1X2') {
      if (pick === '1' || pick.includes('HOME')) return h > a ? 'WON' : 'LOST';
      if (pick === '2' || pick.includes('AWAY')) return a > h ? 'WON' : 'LOST';
      if (pick === 'X' || pick === 'DRAW') return h === a ? 'WON' : 'LOST';
    }
    if (pick.includes('OVER') || pick.includes('UNDER')) {
      const threshold = parseFloat(pick.replace(/[^\d.]/g, ''));
      const total = mkt.includes('HOME') ? h : mkt.includes('AWAY') ? a : (h + a);
      return pick.includes('OVER') ? (total > threshold ? 'WON' : 'LOST') : (total < threshold ? 'WON' : 'LOST');
    }
    return 'PENDING';
  };

  const handleSettle = async (ticket, status) => {
    if (processingId) return;
    setProcessingId(ticket.id);

    const updateData = { 
        status, 
        settled_at: status === 'lost' ? new Date() : null 
    };

    const { error } = await supabase
      .from('betsnow')
      .update(updateData)
      .eq('id', ticket.id);
    
    if (!error) {
        setTickets(prev => prev.filter(t => t.id !== ticket.id));
    } else {
        alert(error.message);
    }
    setProcessingId(null);
  };

  return (
    <AdminLayout>
      <div className="p-8 bg-[#070a11] min-h-screen text-slate-200">
        <header className="flex justify-between items-end mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2 text-emerald-500">
              <Zap size={16} className="fill-current" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Lucra Settlement Engine</span>
            </div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white">Pending Bets</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              className="bg-[#111926] border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold w-96 focus:border-emerald-500 transition-all outline-none" 
              placeholder="FILTER BY SERIAL..." 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
        </header>

        <div className="space-y-6">
          {loading ? (
            <div className="py-40 text-center font-black uppercase tracking-[1em] text-slate-800 text-xl animate-pulse">Scanning Results...</div>
          ) : (
            tickets.filter(t => t.ticket_serial?.includes(searchTerm) || t.selections?.some(s => s.matchName?.toLowerCase().includes(searchTerm.toLowerCase()))).map(ticket => {
              const isWon = ticket.enrichedSelections.every(s => s.status === 'WON');
              const isLost = ticket.enrichedSelections.some(s => s.status === 'LOST');

              return (
                <div key={ticket.id} className="bg-[#111926] border border-white/5 rounded-[2.5rem] p-8 flex flex-col lg:flex-row gap-8 items-stretch hover:border-white/10 transition-colors shadow-2xl relative overflow-hidden group">
                  
                  <div className={`absolute left-0 top-0 bottom-0 w-2 ${isWon ? 'bg-emerald-500' : isLost ? 'bg-red-500' : 'bg-slate-800'}`} />

                  <div className="min-w-[220px] flex flex-col justify-between py-2 border-r border-white/5 pr-8">
                    <div>
                      <div className="text-[10px] font-black text-slate-600 mb-2 flex items-center gap-2 tracking-widest uppercase">
                        <Hash size={12}/> {ticket.ticket_serial}
                      </div>
                      <div className={`text-4xl font-black italic leading-none mb-2 ${isWon ? 'text-emerald-500' : 'text-white'}`}>
                        KES {ticket.potential_payout}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Stake: KES {ticket.stake}</div>
                    </div>
                    <div className="text-[9px] font-black uppercase text-slate-500 bg-white/5 p-2 rounded-lg mt-4 text-center tracking-tighter">
                      CASHIER: {ticket.paid_by?.substring(0,8) || 'AUTO'}
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    {ticket.enrichedSelections.map((s, i) => (
                      <div key={i} className="bg-[#0b0f1a] p-5 rounded-2xl border border-white/[0.03] flex justify-between items-center group/leg transition-all">
                        <div className="flex-1">
                          <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest block mb-1">{s.marketName}</span>
                          <span className="text-base font-bold block text-slate-200">{s.matchName}</span>
                          
                          <div className="flex gap-2 mt-3">
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-lg font-black border border-emerald-500/10 uppercase">
                              Pick: {s.selection}
                            </span>
                            {s.res ? (
                              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg font-black border border-blue-500/10 uppercase">
                                Score: {s.res.home_score}-{s.res.away_score}
                              </span>
                            ) : (
                              <span className="text-[10px] bg-orange-500/10 text-orange-500 px-3 py-1.5 rounded-lg font-black border border-orange-500/10 animate-pulse">
                                LIVE / DATA MISSING
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`text-sm font-black uppercase italic tracking-tighter ${s.status === 'WON' ? 'text-emerald-500' : s.status === 'LOST' ? 'text-red-500' : 'text-slate-700'}`}>
                          {s.status}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="min-w-[200px] flex flex-col gap-3 justify-center pl-4">
                    {isWon && (
                        <button 
                            onClick={() => handleSettle(ticket, 'won')} 
                            className="w-full bg-emerald-500 text-black py-5 rounded-2xl font-black uppercase italic text-xs hover:scale-105 transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                        >
                            Authorize Win
                        </button>
                    )}
                    {isLost && (
                        <button 
                            onClick={() => handleSettle(ticket, 'lost')} 
                            className="w-full bg-red-600/20 text-red-500 border border-red-500/30 py-5 rounded-2xl font-black uppercase italic text-xs hover:bg-red-600 hover:text-white transition-all"
                        >
                            Settle Loss
                        </button>
                    )}
                    
                    <div className="pt-4 border-t border-white/5 mt-2">
                      <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest text-center mb-3">Overrides</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => confirm("Force Win?") && handleSettle(ticket, 'won')} className="text-[9px] font-black bg-white/5 py-3 rounded-xl text-slate-600 hover:text-emerald-500 transition-all uppercase italic">Win</button>
                        <button onClick={() => confirm("Force Loss?") && handleSettle(ticket, 'lost')} className="text-[9px] font-black bg-white/5 py-3 rounded-xl text-slate-600 hover:text-red-500 transition-all uppercase italic">Loss</button>
                      </div>
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
