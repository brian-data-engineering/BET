import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { Trophy, Search, Hash, Activity, CheckCircle2, XCircle, ChevronRight, Zap, AlertCircle } from 'lucide-react';

export default function SettlementPage() {
  const [tickets, setTickets] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { 
    fetchData(); 
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch the Fuzzy Review Queue
      const { data: queueData } = await supabase
        .from('fuzzy_review_queue')
        .select('*')
        .eq('status', 'pending_review');
      
      setReviewQueue(queueData || []);

      // 2. Fetch Pending Tickets (The standard view)
      const { data: ticketsData } = await supabase
        .from('print')
        .select(`
          *,
          newselections (*)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setTickets(ticketsData || []);
    } catch (err) {
      console.error("Lucra Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReview = async (item) => {
    // Determine win/loss based on user pick and scraped score
    const h = item.scraped_score.home;
    const a = item.scraped_score.away;
    
    // We need to fetch the pick from newselections first to be sure
    const { data: sel } = await supabase
      .from('newselections')
      .select('pick')
      .eq('ticket_serial', item.ticket_serial)
      .eq('match', item.betika_match)
      .single();

    let finalStatus = 'lost';
    if (sel.pick === '1' && h > a) finalStatus = 'won';
    if (sel.pick === '2' && a > h) finalStatus = 'won';
    if (sel.pick === 'X' && h === a) finalStatus = 'won';

    // Update Selection
    await supabase
      .from('newselections')
      .update({ status: finalStatus })
      .eq('ticket_serial', item.ticket_serial)
      .eq('match', item.betika_match);

    // Remove from Review Queue
    await supabase.from('fuzzy_review_queue').delete().eq('id', item.id);
    
    fetchData(); // Refresh
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
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white">Settlement</h1>
          </div>
        </header>

        {/* --- SECTION 1: FUZZY REVIEW QUEUE --- */}
        {reviewQueue.length > 0 && (
          <div className="mb-12">
            <h2 className="flex items-center gap-3 text-orange-500 font-black uppercase tracking-widest text-sm mb-6">
              <AlertCircle size={18} /> Needs Human Review ({reviewQueue.length})
            </h2>
            <div className="grid gap-4">
              {reviewQueue.map(item => (
                <div key={item.id} className="bg-[#1a1f2e] border border-orange-500/20 rounded-2xl p-6 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block">SERIAL: {item.ticket_serial}</span>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-white font-bold">{item.betika_match}</span>
                      <ChevronRight size={14} className="text-slate-600" />
                      <span className="text-emerald-400 font-bold">{item.linebet_match}</span>
                    </div>
                    <div className="mt-2 text-[10px] bg-white/5 inline-block px-2 py-1 rounded">
                      Confidence: {(item.confidence_score * 100).toFixed(1)}% | Score: {item.scraped_score.home}-{item.scraped_score.away}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleApproveReview(item)}
                      className="bg-emerald-500 text-black px-6 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-400 transition-all"
                    >
                      Approve Match
                    </button>
                    <button 
                      onClick={() => supabase.from('fuzzy_review_queue').delete().eq('id', item.id).then(fetchData)}
                      className="bg-white/5 text-slate-400 px-6 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-red-500/20 hover:text-red-500"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- SECTION 2: ALL PENDING TICKETS --- */}
        <h2 className="text-slate-500 font-black uppercase tracking-widest text-sm mb-6">Master Ticket List</h2>
        <div className="space-y-6">
          {loading ? (
            <div className="py-20 text-center font-black uppercase tracking-[1em] text-slate-800 animate-pulse">Syncing Lucra...</div>
          ) : (
            tickets.filter(t => t.ticket_serial?.includes(searchTerm)).map(ticket => (
              <div key={ticket.id} className="bg-[#111926] border border-white/5 rounded-[2rem] p-6 hover:border-white/10 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">#{ticket.ticket_serial}</span>
                    <h3 className="text-2xl font-black italic text-white mt-1">KES {Number(ticket.potential_payout).toLocaleString()}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Status</span>
                    <span className="text-xs font-black text-orange-500 uppercase italic">Waiting for results</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ticket.newselections?.map((sel, i) => (
                    <div key={i} className="bg-black/20 border border-white/5 p-4 rounded-xl">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-black text-emerald-500 uppercase">{sel.sport}</span>
                        <span className={`text-[9px] font-black px-2 py-1 rounded ${sel.status === 'won' ? 'bg-emerald-500/10 text-emerald-500' : sel.status === 'lost' ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-500'}`}>
                          {sel.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-300 mb-1">{sel.match}</p>
                      <p className="text-[10px] font-black text-slate-600 uppercase italic">Pick: {sel.pick}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
