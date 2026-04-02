import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { Trophy, Search, Clock, CheckCircle2, XCircle, Wallet, Hash, AlertCircle } from 'lucide-react';

export default function SettlementPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => { fetchPendingTickets(); }, []);

  const fetchPendingTickets = async () => {
    setLoading(true);
    try {
      // 1. Fetch High-Confidence Mappings first to use as a dictionary
      const { data: mappings } = await supabase
        .from('team_mappings')
        .select('*')
        .gt('confidence', 0.5);

      // 2. Fetch Pending Tickets
      const { data: rawTickets, error } = await supabase
        .from('betsnow')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 3. Map Results using ID or Mapped Official Names
      const ticketsWithResults = await Promise.all((rawTickets || []).map(async (ticket) => {
        const resultsFound = [];

        for (const sel of ticket.selections) {
          const [hName, aName] = sel.matchName.split(' vs ');
          
          // Get official names from mapping dictionary
          const mappedHome = mappings?.find(m => m.bet_team_name === hName)?.official_team_name;
          const mappedAway = mappings?.find(m => m.bet_team_name === aName)?.official_team_name;

          // Search logic: Match ID OR Match both mapped home and away teams
          const { data: res } = await supabase
            .from('soccer_results')
            .select('*')
            .or(`event_id.eq.${sel.matchId}${mappedHome ? `,and(home_team.ilike.%${mappedHome}%,away_team.ilike.%${mappedAway}%)` : ''}`)
            .maybeSingle();

          if (res) resultsFound.push(res);
        }

        return { 
          ...ticket, 
          available_results: resultsFound,
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
    const h = parseFloat(result.home_score), a = parseFloat(result.away_score);
    const hp1 = parseFloat(result.home_p1_score), ap1 = parseFloat(result.away_p1_score);
    const pick = selection.selection.toUpperCase();
    const market = selection.marketName.toUpperCase();

    // Mapping Logic for Team-based picks (e.g. Winner -> Botafogo RJ)
    if (market.includes('WINNER') || market === '1X2') {
      const teams = selection.matchName.split(' vs ');
      if (pick === '1' || pick.includes(teams[0].toUpperCase())) return h > a ? 'WON' : 'LOST';
      if (pick === '2' || pick.includes(teams[1].toUpperCase())) return a > h ? 'WON' : 'LOST';
      if (pick === 'X' || pick === 'DRAW') return h === a ? 'WON' : 'LOST';
    }

    switch (market) {
      case '1ST HALF - 1X2':
        if (pick === '1') return hp1 > ap1 ? 'WON' : 'LOST';
        if (pick === '2') return ap1 > hp1 ? 'WON' : 'LOST';
        return hp1 === ap1 ? 'WON' : 'LOST';

      case 'MULTIGOALS':
        const total = h + a;
        const [min, max] = selection.selection.split('-').map(Number);
        return (total >= min && total <= max) ? 'WON' : 'LOST';

      case 'BOTH TEAMS TO SCORE (GG/NG)':
        const isGG = h > 0 && a > 0;
        return (pick === 'YES' || pick === 'GG') ? (isGG ? 'WON' : 'LOST') : (!isGG ? 'WON' : 'LOST');

      case 'DOUBLE CHANCE':
        if (pick === '1/X' || pick === '1X') return h >= a ? 'WON' : 'LOST';
        if (pick === 'X/2' || pick === 'X2') return a >= h ? 'WON' : 'LOST';
        return h !== a ? 'WON' : 'LOST';

      case 'WHO WILL WIN? (IF DRAW, MONEY BACK)':
        if (h === a) return 'VOID';
        return pick === '1' ? (h > a ? 'WON' : 'LOST') : (a > h ? 'WON' : 'LOST');

      default:
        if (pick.includes('OVER') || pick.includes('UNDER')) {
          const threshold = parseFloat(pick.replace(/[^\d.]/g, ''));
          const current = market.includes('HOME') ? h : market.includes('AWAY') ? a : (h + a);
          return pick.includes('OVER') ? (current > threshold ? 'WON' : 'LOST') : (current < threshold ? 'WON' : 'LOST');
        }
        return 'PENDING';
    }
  };

  const handleSettle = async (ticket, finalStatus) => {
    if (processingId) return;
    setProcessingId(ticket.id);
    try {
      const { error } = await supabase
        .from('betsnow')
        .update({ 
          status: finalStatus, 
          is_paid: finalStatus === 'won',
          settled_at: new Date().toISOString()
        })
        .eq('id', ticket.id);

      if (!error) setTickets(prev => prev.filter(t => t.id !== ticket.id));
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
      <div className="p-8 bg-[#0b0f1a] min-h-screen text-white">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={14} className="text-[#f59e0b]" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">LUCRA v2.0</span>
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">Settlement</h1>
          </div>
          <input 
            className="bg-[#111926] border border-white/5 rounded-2xl py-3 px-6 text-xs font-bold uppercase focus:border-[#f59e0b] outline-none w-80"
            placeholder="Search Serial or Team..."
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center animate-pulse italic font-black text-slate-700 uppercase">Synchronizing Results...</div>
          ) : (
            filteredTickets.map((ticket) => {
              const evaluation = (ticket.selections || []).map(sel => {
                // Fuzzy match for the result display
                const res = ticket.available_results.find(r => 
                  String(r.event_id) === String(sel.matchId) || 
                  (sel.matchName.includes(r.home_team) || sel.matchName.includes(r.away_team))
                );
                return { ...sel, status: checkLegStatus(sel, res), res };
              });

              const isWon = evaluation.every(e => e.status === 'WON');
              const isLost = evaluation.some(e => e.status === 'LOST');

              return (
                <div key={ticket.id} className="bg-[#111926] border border-white/5 rounded-[2rem] p-6 flex flex-col lg:flex-row gap-6">
                  <div className="min-w-[180px]">
                    <div className="text-2xl font-black text-[#10b981] mb-1">KES {ticket.potential_payout}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{ticket.ticket_serial}</div>
                  </div>

                  <div className="flex-1 space-y-2">
                    {evaluation.map((s, idx) => (
                      <div key={idx} className="bg-black/20 p-3 rounded-xl flex justify-between items-center border border-white/[0.02]">
                        <div>
                          <p className="text-[9px] text-slate-500 font-bold uppercase">{s.marketName}</p>
                          <p className="text-xs font-bold italic">{s.matchName}</p>
                          <span className="text-[10px] text-[#f59e0b] font-black">PICK: {s.selection}</span>
                        </div>
                        <div className="text-right">
                          <p className={`text-[10px] font-black ${s.status === 'WON' ? 'text-green-500' : s.status === 'LOST' ? 'text-red-500' : 'text-slate-600'}`}>
                            {s.res ? `${s.res.home_score}-${s.res.away_score}` : 'WAITING'} ({s.status})
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col justify-center gap-2 min-w-[150px]">
                    {isWon && <button onClick={() => handleSettle(ticket, 'won')} className="bg-green-600 p-3 rounded-xl font-black text-[10px] uppercase italic">Pay Out</button>}
                    {isLost && <button onClick={() => handleSettle(ticket, 'lost')} className="bg-red-600/20 text-red-500 border border-red-500/20 p-3 rounded-xl font-black text-[10px] uppercase italic">Mark Lost</button>}
                    {!isWon && !isLost && <span className="text-[10px] text-center text-slate-600 font-black italic uppercase">In Progress</span>}
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
