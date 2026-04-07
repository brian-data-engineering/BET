import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  Search, 
  ChevronRight, 
  Zap, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Activity,
  RotateCcw
} from 'lucide-react';

export default function SettlementPage() {
  const [tickets, setTickets] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSettling, setIsSettling] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  // --- FUZZY CALCULATION HELPER ---
  const getConfidenceScore = (str1, str2) => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    if (s1 === s2) return 1.0;
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    const editDistance = (a, b) => {
      const costs = [];
      for (let i = 0; i <= a.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= b.length; j++) {
          if (i === 0) costs[j] = j;
          else if (j > 0) {
            let newValue = costs[j - 1];
            if (a.charAt(i - 1) !== b.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
        if (i > 0) costs[b.length] = lastValue;
      }
      return costs[b.length];
    };

    const distance = editDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: queueData } = await supabase.from('fuzzy_review_queue').select('*').neq('status', 'approved'); 
      setReviewQueue(queueData || []);

      const { data: ticketsData, error: tErr } = await supabase
        .from('print')
        .select('*')
        .ilike('status', 'pending')
        .order('created_at', { ascending: false });

      if (tErr) throw tErr;

      const serials = (ticketsData || []).map(t => t.ticket_serial);
      
      if (serials.length > 0) {
        const [selRes, resultsRes] = await Promise.all([
          supabase.from('newselections').select('*').in('ticket_serial', serials),
          supabase.from('finalresults').select('*').order('created_at', { ascending: false }).limit(250)
        ]);

        const merged = (ticketsData || []).map(ticket => ({
          ...ticket,
          selections: (selRes.data || []).filter(s => s.ticket_serial === ticket.ticket_serial).map(sel => {
            
            // Find the best possible match in the DB, even if weak
            let bestMatch = null;
            let highestConfidence = 0;

            (resultsRes.data || []).forEach(res => {
              const fullName = `${res.home_team} vs ${res.away_team}`;
              const score = getConfidenceScore(sel.match, fullName);
              if (score > highestConfidence) {
                highestConfidence = score;
                bestMatch = res;
              }
            });

            return { 
              ...sel, 
              resultInfo: bestMatch, 
              confidence: highestConfidence 
            };
          })
        }));

        setTickets(merged);
      }
    } catch (err) {
      console.error("Lucra Sync Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSelectionStatus = async (ticketSerial, matchName, newStatus) => {
    const { error } = await supabase
      .from('newselections')
      .update({ status: newStatus })
      .eq('ticket_serial', ticketSerial)
      .eq('match', matchName);
    
    if (!error) fetchData();
  };

  const finalizeTicket = async (ticketSerial, status) => {
    setIsSettling(ticketSerial);
    await supabase.from('print')
      .update({ status: status.toUpperCase(), settled_at: new Date().toISOString() })
      .eq('ticket_serial', ticketSerial);
    
    fetchData();
    setIsSettling(null);
  };

  return (
    <AdminLayout>
      <div className="p-8 bg-[#070a11] min-h-screen text-slate-200 font-sans">
        <header className="flex justify-between items-end mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2 text-emerald-500">
              <Zap size={16} className="fill-current" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Lucra Settlement Engine</span>
            </div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white">Settlement</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              className="bg-[#111926] border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold w-96 focus:border-emerald-500 outline-none transition-all" 
              placeholder="SEARCH SERIAL..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        {/* --- TICKETS LIST --- */}
        <div className="space-y-6">
          {loading ? (
            <div className="py-20 text-center font-black uppercase tracking-[1em] text-slate-800 animate-pulse">Syncing Lucra...</div>
          ) : (
            tickets.filter(t => t.ticket_serial?.toLowerCase().includes(searchTerm.toLowerCase())).map(ticket => {
              const allWon = ticket.selections?.every(s => s.status === 'won');
              const anyLost = ticket.selections?.some(s => s.status === 'lost');

              return (
                <div key={ticket.id} className="bg-[#111926] border border-white/5 rounded-[2rem] p-8 hover:border-white/10 transition-all shadow-xl">
                  <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
                    <div>
                      <span className="text-[10px] text-slate-600 font-black tracking-[0.2em]">#{ticket.ticket_serial}</span>
                      <h3 className="text-3xl font-black italic text-white uppercase tracking-tighter">KES {Number(ticket.potential_payout || 0).toLocaleString()}</h3>
                    </div>
                    
                    <div className="flex gap-3">
                      {allWon && (
                        <button disabled={isSettling === ticket.ticket_serial} onClick={() => finalizeTicket(ticket.ticket_serial, 'won')} className="bg-emerald-500 text-black px-8 py-3 rounded-2xl font-black uppercase italic text-xs hover:bg-emerald-400 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                          Authorize Payout
                        </button>
                      )}
                      {anyLost && (
                        <button disabled={isSettling === ticket.ticket_serial} onClick={() => finalizeTicket(ticket.ticket_serial, 'lost')} className="bg-red-500/10 text-red-500 border border-red-500/20 px-8 py-3 rounded-2xl font-black uppercase italic text-xs hover:bg-red-500 hover:text-white transition-colors">
                          Settle as Lost
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ticket.selections?.map((sel, i) => (
                      <div key={i} className={`bg-black/30 border p-5 rounded-2xl flex flex-col justify-between group transition-colors ${sel.confidence < 0.7 ? 'border-orange-500/20' : 'border-white/5'}`}>
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest">{sel.sport}</span>
                            
                            {/* --- MANUAL STATUS TOGGLES --- */}
                            <div className="flex gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => updateSelectionStatus(ticket.ticket_serial, sel.match, 'won')} className="p-1 hover:text-emerald-500 transition-colors" title="Force Win"><CheckCircle2 size={14}/></button>
                              <button onClick={() => updateSelectionStatus(ticket.ticket_serial, sel.match, 'lost')} className="p-1 hover:text-red-500 transition-colors" title="Force Loss"><XCircle size={14}/></button>
                              <button onClick={() => updateSelectionStatus(ticket.ticket_serial, sel.match, 'pending')} className="p-1 hover:text-white transition-colors" title="Reset to Pending"><RotateCcw size={14}/></button>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-slate-200 mb-1 leading-tight">{sel.match}</p>
                          <p className="text-[10px] font-black text-slate-500 uppercase italic mb-4 tracking-tighter">Pick: {sel.pick} • Status: <span className={sel.status === 'won' ? 'text-emerald-500' : sel.status === 'lost' ? 'text-red-500' : ''}>{sel.status}</span></p>
                        </div>

                        {/* --- FUZZY MATCH DISPLAY --- */}
                        {sel.resultInfo ? (
                          <div className={`mt-2 pt-4 border-t -mx-5 -mb-5 p-4 rounded-b-2xl ${sel.confidence > 0.85 ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-orange-500/5 border-orange-500/10'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex flex-col max-w-[70%]">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Matched Scraper Name</span>
                                  <span className={`text-[8px] font-bold px-1.5 rounded ${sel.confidence > 0.85 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                    {Math.round(sel.confidence * 100)}% Match
                                  </span>
                                </div>
                                <span className="text-[11px] font-black text-slate-200 uppercase leading-none italic">
                                  {sel.resultInfo.home_team} vs {sel.resultInfo.away_team}
                                </span>
                              </div>
                              <span className="text-[12px] font-black text-white bg-emerald-600 px-2 py-1 rounded italic shadow-lg shrink-0">
                                {sel.resultInfo.raw_clean_score}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 pt-4 border-t border-white/5 text-[9px] text-slate-700 italic font-black uppercase flex items-center gap-2">
                             <Activity size={10} className="animate-spin" />
                             Scanning DB...
                          </div>
                        )}
                      </div>
                    ))}
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
