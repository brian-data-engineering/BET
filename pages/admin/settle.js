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
  Activity // Added missing icon import
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

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Review Queue
      const { data: queueData } = await supabase
        .from('fuzzy_review_queue')
        .select('*')
        .neq('status', 'approved'); 
      setReviewQueue(queueData || []);

      // 2. Fetch Master Tickets (Case-insensitive status check)
      const { data: ticketsData, error: tErr } = await supabase
        .from('print')
        .select('*')
        .ilike('status', 'pending')
        .order('created_at', { ascending: false });

      if (tErr) throw tErr;

      // 3. Fetch All Selections for these tickets using ticket_serial
      const serials = (ticketsData || []).map(t => t.ticket_serial);
      
      let selectionsData = [];
      if (serials.length > 0) {
        const { data: sData, error: sErr } = await supabase
          .from('newselections')
          .select('*')
          .in('ticket_serial', serials);
        
        if (sErr) throw sErr;
        selectionsData = sData;
      }

      // 4. Manual Merge: Link selections to tickets via serial
      const merged = (ticketsData || []).map(ticket => ({
        ...ticket,
        selections: (selectionsData || []).filter(s => s.ticket_serial === ticket.ticket_serial)
      }));

      setTickets(merged);
    } catch (err) {
      console.error("Lucra Sync Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReview = async (item) => {
    try {
      const { data: sel } = await supabase
        .from('newselections')
        .select('pick')
        .eq('ticket_serial', item.ticket_serial)
        .eq('match', item.betika_match)
        .single();

      if (!sel) return;

      const h = item.scraped_score?.home || 0;
      const a = item.scraped_score?.away || 0;
      let status = 'lost';
      
      if (sel.pick === '1' && h > a) status = 'won';
      else if (sel.pick === '2' && a > h) status = 'won';
      else if (sel.pick === 'X' && h === a) status = 'won';

      await Promise.all([
        supabase.from('newselections').update({ status }).eq('ticket_serial', item.ticket_serial).eq('match', item.betika_match),
        supabase.from('fuzzy_review_queue').delete().eq('id', item.id)
      ]);

      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const finalizeTicket = async (ticketSerial, status) => {
    setIsSettling(ticketSerial);
    const { error } = await supabase
      .from('print')
      .update({ 
        status: status.toUpperCase(), 
        settled_at: new Date().toISOString() 
      })
      .eq('ticket_serial', ticketSerial);
    
    if (!error) fetchData();
    setIsSettling(null);
  };

  const filteredTickets = tickets.filter(t => 
    t.ticket_serial?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

        {/* --- REVIEW QUEUE --- */}
        {reviewQueue.length > 0 && (
          <div className="mb-12">
            <h2 className="flex items-center gap-3 text-orange-500 font-black uppercase tracking-widest text-sm mb-6">
              <AlertCircle size={18} /> Review Pending ({reviewQueue.length})
            </h2>
            <div className="grid gap-3">
              {reviewQueue.map(item => (
                <div key={item.id} className="bg-[#1a1f2e] border border-orange-500/20 rounded-2xl p-5 flex justify-between items-center shadow-lg">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500">SERIAL: {item.ticket_serial}</span>
                    <div className="flex items-center gap-3 text-sm mt-1">
                      <span className="text-white font-bold">{item.betika_match}</span>
                      <ChevronRight size={14} className="text-slate-600" />
                      <span className="text-emerald-400 font-bold">{item.linebet_match}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right mr-4">
                      <div className="text-xs font-black text-white">
                        {item.scraped_score?.home} - {item.scraped_score?.away}
                      </div>
                      <div className="text-[9px] text-slate-500 uppercase">Score Found</div>
                    </div>
                    <button 
                      onClick={() => handleApproveReview(item)} 
                      className="bg-emerald-500 text-black px-5 py-2 rounded-xl font-black text-[10px] uppercase hover:scale-105 transition-all"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => supabase.from('fuzzy_review_queue').delete().eq('id', item.id).then(fetchData)} 
                      className="text-slate-500 hover:text-red-500 transition-colors"
                    >
                      <XCircle size={20}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TICKETS LIST --- */}
        <h2 className="text-slate-500 font-black uppercase tracking-widest text-[10px] mb-6">Master Ticket List</h2>
        <div className="space-y-6">
          {loading ? (
            <div className="py-20 text-center font-black uppercase tracking-[1em] text-slate-800 animate-pulse">Scanning DB...</div>
          ) : (
            filteredTickets.map(ticket => {
              const allWon = ticket.selections?.length > 0 && ticket.selections.every(s => s.status === 'won');
              const anyLost = ticket.selections?.some(s => s.status === 'lost');

              return (
                <div key={ticket.id} className="bg-[#111926] border border-white/5 rounded-[2rem] p-8 hover:border-white/10 transition-all shadow-xl">
                  <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
                    <div>
                      <span className="text-[10px] text-slate-600 font-black tracking-[0.2em]">#{ticket.ticket_serial}</span>
                      <h3 className="text-3xl font-black italic text-white uppercase">KES {Number(ticket.potential_payout || 0).toLocaleString()}</h3>
                    </div>
                    
                    <div className="flex gap-3">
                      {allWon && (
                        <button 
                          disabled={isSettling === ticket.ticket_serial}
                          onClick={() => finalizeTicket(ticket.ticket_serial, 'won')}
                          className="bg-emerald-500 text-black px-8 py-3 rounded-2xl font-black uppercase italic text-xs hover:bg-emerald-400"
                        >
                          {isSettling === ticket.ticket_serial ? 'Processing...' : 'Authorize Payout'}
                        </button>
                      )}
                      {anyLost && (
                        <button 
                           disabled={isSettling === ticket.ticket_serial}
                           onClick={() => finalizeTicket(ticket.ticket_serial, 'lost')}
                           className="bg-red-500/10 text-red-500 border border-red-500/20 px-8 py-3 rounded-2xl font-black uppercase italic text-xs hover:bg-red-500 hover:text-white"
                        >
                          Settle as Lost
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ticket.selections?.map((sel, i) => (
                      <div key={i} className="bg-black/30 border border-white/5 p-5 rounded-2xl relative overflow-hidden">
                        <div className={`absolute top-0 right-0 p-2 ${sel.status === 'won' ? 'text-emerald-500' : sel.status === 'lost' ? 'text-red-500' : 'text-slate-700'}`}>
                          {sel.status === 'won' ? <CheckCircle2 size={16}/> : 
                           sel.status === 'lost' ? <XCircle size={16}/> : 
                           <Activity size={16} className="animate-pulse"/>}
                        </div>
                        <span className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest">{sel.sport}</span>
                        <p className="text-sm font-bold text-slate-200 mt-1 mb-3">{sel.match}</p>
                        <div className="flex justify-between items-end">
                           <span className="text-[10px] bg-white/5 px-2 py-1 rounded font-black text-slate-400 italic uppercase">PICK: {sel.pick}</span>
                           <span className="text-[10px] font-black uppercase italic text-slate-500">{sel.status || 'pending'}</span>
                        </div>
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
