import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { Trophy, Search, Hash, CheckCircle2, XCircle, Activity, Info, AlertTriangle } from 'lucide-react';

export default function SettlementPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => { fetchPendingTickets(); }, []);

  const fetchPendingTickets = async () => {
    setLoading(true);
    try {
      // 1. Grab Mappings & Pending Tickets in parallel for speed
      const [mapRes, ticketRes] = await Promise.all([
        supabase.from('team_mappings').select('*').gt('confidence', 0.5),
        supabase.from('betsnow').select('*').eq('status', 'pending').order('created_at', { ascending: false })
      ]);

      if (ticketRes.error) throw ticketRes.error;

      // 2. Map Results for each ticket
      const ticketsWithResults = await Promise.all((ticketRes.data || []).map(async (ticket) => {
        const resultsFound = [];
        for (const sel of ticket.selections) {
          const [hName, aName] = sel.matchName.split(' vs ');
          const mHome = mapRes.data?.find(m => m.bet_team_name === hName)?.official_team_name;
          const mAway = mapRes.data?.find(m => m.bet_team_name === aName)?.official_team_name;

          const { data: res } = await supabase
            .from('soccer_results')
            .select('*')
            .or(`event_id.eq.${sel.matchId}${mHome ? `,and(home_team.ilike.%${mHome}%,away_team.ilike.%${mAway}%)` : ''}`)
            .maybeSingle();
          if (res) resultsFound.push(res);
        }
        return { ...ticket, available_results: resultsFound };
      }));

      setTickets(ticketsWithResults);
    } catch (err) {
      console.error("Lucra Data Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkLegStatus = (sel, res) => {
    if (!res) return 'PENDING';
    const h = parseFloat(res.home_score), a = parseFloat(res.away_score);
    const hp = parseFloat(res.home_p1_score) || 0, ap = parseFloat(res.away_p1_score) || 0;
    const pick = sel.selection.toUpperCase(), mkt = sel.marketName.toUpperCase();

    // 1X2 & Match Winner Logic
    if (mkt.includes('WINNER') || mkt === '1X2') {
      const teams = sel.matchName.split(' vs ');
      if (pick === '1' || pick.includes(teams[0].toUpperCase())) return h > a ? 'WON' : 'LOST';
      if (pick === '2' || pick.includes(teams[1].toUpperCase())) return a > h ? 'WON' : 'LOST';
      if (pick === 'X' || pick === 'DRAW') return h === a ? 'WON' : 'LOST';
    }

    // Over/Under Logic
    if (pick.includes('OVER') || pick.includes('UNDER')) {
      const threshold = parseFloat(pick.replace(/[^\d.]/g, ''));
      const score = mkt.includes('HOME') ? h : mkt.includes('AWAY') ? a : (h + a);
      return pick.includes('OVER') ? (score > threshold ? 'WON' : 'LOST') : (score < threshold ? 'WON' : 'LOST');
    }

    // Common Markets
    switch (mkt) {
      case 'BOTH TEAMS TO SCORE (GG/NG)':
        return (pick === 'YES' || pick === 'GG') ? (h > 0 && a > 0 ? 'WON' : 'LOST') : (h === 0 || a === 0 ? 'WON' : 'LOST');
      case 'DOUBLE CHANCE':
        if (pick === '1/X' || pick === '1X') return h >= a ? 'WON' : 'LOST';
        if (pick === 'X/2' || pick === 'X2') return a >= h ? 'WON' : 'LOST';
        return h !== a ? 'WON' : 'LOST';
      case '1ST HALF - 1X2':
        if (pick === '1') return hp > ap ? 'WON' : 'LOST';
        if (pick === '2') return ap > hp ? 'WON' : 'LOST';
        return hp === ap ? 'WON' : 'LOST';
      default: return 'PENDING';
    }
  };

  const handleSettle = async (ticket, status) => {
    if (processingId) return;
    setProcessingId(ticket.id);
    const { error } = await supabase.from('betsnow').update({ status, settled_at: new Date() }).eq('id', ticket.id);
    if (!error) setTickets(prev => prev.filter(t => t.id !== ticket.id));
    setProcessingId(null);
  };

  return (
    <AdminLayout>
      <div className="p-8 bg-[#0b0f1a] min-h-screen text-white">
        <header className="flex justify-between items-center mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity size={14} className="text-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Realtime Settlement Engine</span>
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">Lucra Core</h1>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input 
              className="bg-[#111926] border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold w-96 focus:border-emerald-500 outline-none transition-all shadow-2xl" 
              placeholder="FILTER BY SERIAL OR TEAM..." 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
        </header>

        <div className="grid gap-6">
          {loading ? (
            <div className="py-40 text-center font-black uppercase italic tracking-[0.5em] text-slate-800 text-2xl">Syncing Live Data...</div>
          ) : tickets.filter(t => t.ticket_serial?.includes(searchTerm) || t.selections?.some(s => s.matchName?.toLowerCase().includes(searchTerm.toLowerCase()))).map(ticket => {
            const legs = (ticket.selections || []).map(sel => {
              const res = ticket.available_results.find(r => String(r.event_id) === String(sel.matchId) || (sel.matchName.includes(r.home_team) && sel.matchName.includes(r.away_team)));
              return { ...sel, evalStatus: checkLegStatus(sel, res), res };
            });

            const isWon = legs.every(e => e.evalStatus === 'WON');
            const isLost = legs.some(e => e.evalStatus === 'LOST');

            return (
              <div key={ticket.id} className="bg-[#111926] border border-white/5 rounded-[2.5rem] p-8 flex flex-col lg:flex-row gap-8 items-stretch transition-all hover:bg-[#151d2b]">
                <div className="flex flex-col justify-between min-w-[220px] py-2 border-r border-white/5 pr-8">
                  <div>
                    <div className="text-[10px] font-black text-slate-500 mb-2 flex items-center gap-2 uppercase tracking-tighter"><Hash size={12}/> {ticket.ticket_serial}</div>
                    <div className="text-4xl font-black text-emerald-500 italic tracking-tighter leading-none mb-1">KES {ticket.potential_payout}</div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase italic">Stake: KES {ticket.stake}</div>
                  </div>
                  <div className="text-[9px] font-black uppercase text-slate-700 bg-white/5 p-2 rounded-lg mt-4 inline-block">Cashier: {ticket.cashier_id?.substring(0,8) || 'SYSTEM'}</div>
                </div>

                <div className="flex-1 space-y-3">
                  {legs.map((s, i) => (
                    <div key={i} className="bg-[#0b0f1a] p-5 rounded-2xl border border-white/[0.03] flex justify-between items-center group relative overflow-hidden">
                      <div className="flex-1">
                        <span className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest block mb-1">{s.marketName}</span>
                        <span className="text-base font-bold block text-slate-200">{s.matchName}</span>
                        <div className="flex gap-2 mt-3">
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-lg font-black border border-emerald-500/10">PICK: {s.selection}</span>
                          {s.res ? (
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg font-black border border-blue-500/10">
                              FT {s.res.home_score}-{s.res.away_score} | HT {s.res.home_p1_score || 0}-{s.res.away_p1_score || 0}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg font-black border border-red-500/10 animate-pulse">NO RESULTS DETECTED</span>
                          )}
                        </div>
                      </div>
                      <div className={`text-sm font-black uppercase italic tracking-tighter ${s.evalStatus === 'WON' ? 'text-emerald-500' : s.evalStatus === 'LOST' ? 'text-red-500' : 'text-slate-700'}`}>
                        {s.evalStatus}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="min-w-[200px] flex flex-col gap-3 justify-center pl-4">
                  {isWon && <button onClick={() => handleSettle(ticket, 'won')} className="w-full bg-emerald-500 text-black py-5 rounded-2xl font-black uppercase italic text-xs shadow-[0_10px_30px_rgba(16,185,129,0.2)] hover:scale-105 active:scale-95 transition-all">APPROVE PAYOUT</button>}
                  {isLost && <button onClick={() => handleSettle(ticket, 'lost')} className="w-full bg-red-600/20 text-red-500 border border-red-500/30 py-5 rounded-2xl font-black uppercase italic text-xs hover:bg-red-600/30 transition-all">SETTLE AS LOSS</button>}
                  
                  <div className="pt-4 border-t border-white/5 mt-2">
                    <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest text-center mb-3">Admin Override</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => confirm("Force Win?") && handleSettle(ticket, 'won')} className="text-[9px] font-black bg-white/5 py-3 rounded-xl text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all uppercase italic border border-white/5">Force Win</button>
                      <button onClick={() => confirm("Force Loss?") && handleSettle(ticket, 'lost')} className="text-[9px] font-black bg-white/5 py-3 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all uppercase italic border border-white/5">Force Loss</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
