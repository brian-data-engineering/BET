import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import PrintableTicket from '../../components/cashier/PrintableTicket';
import {
  Search, CheckCircle2, Clock, Loader2, Receipt,
  Banknote, Printer, X, Eye, XCircle
} from 'lucide-react';

// ── Status config ─────────────────────────────────────────────────────
const STATUS = {
  won:     { label: 'Won',     color: 'text-[#10b981]', icon: CheckCircle2 },
  lost:    { label: 'Lost',    color: 'text-rose-500',   icon: XCircle      },
  pending: { label: 'Pending', color: 'text-amber-400', icon: Clock        },
};

function SelectionRow({ sel }) {
  const result = sel.result || 'pending';
  const score  = sel.score  || null;
  const resultColor =
    result === 'won'  ? 'text-[#10b981]' :
    result === 'lost' ? 'text-rose-500'   : 'text-amber-400';

  return (
    <div className="flex items-start justify-between py-2 border-b border-white/5 last:border-0 gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-white truncate">{sel.matchName}</p>
        <p className="text-[9px] text-slate-500 uppercase">
          {sel.marketName} · <span className="text-slate-300">{sel.selection}</span>
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[11px] font-black text-[#f59e0b]">{Number(sel.odds).toFixed(2)}</p>
        {score && <p className="text-[9px] text-slate-400 font-bold">{score}</p>}
        <p className={`text-[9px] font-black uppercase ${resultColor}`}>{result}</p>
      </div>
    </div>
  );
}

export default function TicketManager() {
  const [tickets, setTickets]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [user, setUser]                 = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [page, setPage]                 = useState(0);
  const [totalCount, setTotalCount]     = useState(0);
  const pageSize = 15;
  const shouldPrintRef = useRef(false);

  // Auto-print after modal opens
  useEffect(() => {
    if (selectedTicket && shouldPrintRef.current) {
      const timer = setTimeout(() => {
        const previewElement = document.getElementById('visible-preview');
        if (!previewElement) return;
        const printContainer = document.createElement('div');
        printContainer.id = 'temp-print-portal';
        printContainer.innerHTML = `<div style="background:white;width:100%;">${previewElement.innerHTML}</div>`;
        document.body.appendChild(printContainer);
        window.focus();
        window.print();
        setTimeout(() => {
          document.getElementById('temp-print-portal')?.remove();
          shouldPrintRef.current = false;
        }, 1000);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [selectedTicket]);

  const fetchTickets = useCallback(async (userId, currentPage, currentSearch, currentStatus) => {
    if (!userId) return;
    setLoading(true);
    const from = currentPage * pageSize;
    const to   = from + pageSize - 1;

    try {
      let query = supabase
        .from('unified_terminal_ledger') 
        .select('*', { count: 'exact' })
        .eq('cashier_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (currentSearch) query = query.ilike('ticket_serial', `%${currentSearch}%`);
      if (currentStatus !== 'all') query = query.eq('status', currentStatus);

      const { data, count, error } = await query;
      if (error) {
        const fallback = await supabase
          .from('print')
          .select('*', { count: 'exact' })
          .eq('cashier_id', userId)
          .order('created_at', { ascending: false })
          .range(from, to);
        if (fallback.error) throw fallback.error;
        setTickets(fallback.data || []);
        setTotalCount(fallback.count || 0);
      } else {
        setTickets(data || []);
        setTotalCount(count || 0);
      }
    } catch (err) {
      console.error('Ledger Fetch Error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        setUser(u);
        fetchTickets(u.id, page, search, statusFilter);
      }
    };
    init();
  }, [fetchTickets, page, search, statusFilter]);

  const handlePayout = async (ticket) => {
    if (ticket.status !== 'won') return alert('❌ Ticket not marked as won yet.');
    if (ticket.paid_at) return alert('❌ Already paid out.');
    const payout = parseFloat(ticket.potential_payout);
    if (!window.confirm(`PAYOUT KES ${payout.toLocaleString()}?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc('execute_lucra_payout', {
        p_ticket_id:     ticket.id,
        p_cashier_id:    user.id,
        p_payout_amount: payout
      });
      if (error) throw error;
      alert('✅ PAYOUT SUCCESSFUL');
      fetchTickets(user.id, page, search, statusFilter);
      setSelectedTicket(null);
    } catch (err) {
      alert(`❌ PAYOUT FAILED: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalPages  = Math.ceil(totalCount / pageSize);

  return (
    <CashierLayout>
      <div className="p-4 md:p-6 bg-[#0b0f1a] min-h-screen text-white font-sans no-print">

        {/* Header - Pro Compact */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#10b981]/10 flex items-center justify-center border border-[#10b981]/20">
              <Receipt size={20} className="text-[#10b981]" />
            </div>
            <div>
               <h1 className="text-xl font-black italic uppercase tracking-tighter text-white">Ledger</h1>
               <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none">Identity & Returns</p>
            </div>
          </div>
          <div className="flex-1 max-w-md bg-[#111926] p-2 px-4 rounded-xl border border-white/5 flex items-center gap-3 focus-within:border-[#10b981]/50 transition-all w-full">
            <Search size={14} className="text-[#10b981] opacity-50 shrink-0" />
            <input
              className="bg-transparent outline-none w-full font-black uppercase tracking-widest text-[11px] placeholder:text-white/10"
              placeholder="SEARCH BY SERIAL OR CODE..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1.5 mb-6 flex-wrap">
          {[
            { key: 'all',     label: `All (${totalCount})`,        color: '' },
            { key: 'pending', label: `Pending`,  color: 'text-amber-400' },
            { key: 'won',     label: `Won`,          color: 'text-[#10b981]' },
            { key: 'lost',    label: `Lost`,        color: 'text-rose-500'   },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => { setStatusFilter(f.key); setPage(0); }}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${
                statusFilter === f.key
                  ? 'bg-[#10b981] border-[#10b981] text-black shadow-lg shadow-[#10b981]/20'
                  : `bg-white/5 border-white/5 ${f.color || 'text-slate-400'} hover:border-white/20 hover:bg-white/[0.03]`
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Pro Ledger View */}
        {loading && tickets.length === 0 ? (
          <div className="flex flex-col items-center mt-40 gap-4 opacity-20">
            <Loader2 className="animate-spin text-[#10b981]" size={32} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Syncing Records...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center mt-20 opacity-10">
            <Receipt size={48} className="mx-auto mb-4" />
            <p className="font-black uppercase tracking-widest text-[10px]">No Records Found</p>
          </div>
        ) : (
          <div className="bg-[#111926]/50 rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
            <div className="hidden lg:grid grid-cols-12 gap-4 px-8 py-5 border-b border-white/5 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic bg-white/[0.02]">
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-3">Ticket Identity</div>
              <div className="col-span-3">Market Context</div>
              <div className="col-span-1 text-center">Picks</div>
              <div className="col-span-3 text-right pr-4">Returns (Stake · Payout)</div>
              <div className="col-span-1 text-center">Action</div>
            </div>

            <div className="divide-y divide-white/5">
              {tickets.map(t => {
                const st         = STATUS[t.status] || STATUS.pending;
                const Icon       = st.icon;
                const selections = t.selections || [];
                const isPaid     = !!t.paid_at;

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-6 lg:px-8 py-6 lg:py-5 items-center hover:bg-[#10b981]/[0.05] transition-all cursor-pointer group relative overflow-hidden"
                  >
                    {/* Status Badge */}
                    <div className="col-span-1 flex lg:justify-center items-center gap-4 lg:gap-0">
                      <div className={`p-3 rounded-2xl lg:mx-auto shadow-xl transition-all group-hover:scale-110 ${
                        t.status === 'won'  ? 'bg-[#10b981] text-black shadow-[#10b981]/20' :
                        t.status === 'lost' ? 'bg-rose-500/20 text-rose-500' :
                        'bg-white/5 text-amber-400'
                      }`}>
                        <Icon size={18} strokeWidth={3} />
                      </div>
                      <div className="lg:hidden flex-1">
                        <div className="flex items-center gap-2">
                           <p className="text-sm font-black text-white italic tracking-tighter">#{t.ticket_serial}</p>
                           {t.booking_code && <span className="text-[8px] bg-white/10 px-1 rounded font-black text-amber-400 uppercase tracking-widest">{t.booking_code}</span>}
                        </div>
                        <p className={`text-[9px] font-black uppercase mt-0.5 ${st.color}`}>{st.label} {isPaid ? '· Paid' : ''}</p>
                      </div>
                    </div>

                    {/* Ticket Identity */}
                    <div className="hidden lg:col-span-3 lg:flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[14px] font-black italic uppercase text-white group-hover:text-[#10b981] transition-colors leading-none tracking-tight">
                          #{t.ticket_serial}
                        </span>
                        {t.booking_code && (
                          <span className="bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                            {t.booking_code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={10} className="text-slate-600" />
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                          {new Date(t.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })} · {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    {/* Market Context */}
                    <div className="hidden lg:col-span-3 lg:flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[9px] font-black bg-[#10b981]/10 text-[#10b981] px-2 py-0.5 rounded-lg uppercase italic border border-[#10b981]/20">
                          {t.sport_key || 'Multi'}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 uppercase truncate max-w-[150px] tracking-tight italic">
                           {t.display_league || 'General Markets'}
                        </span>
                      </div>
                      {t.country && (
                        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.3em] ml-1">{t.country}</p>
                      )}
                    </div>

                    {/* Picks */}
                    <div className="hidden lg:col-span-1 text-center flex flex-col items-center">
                      <span className="text-[16px] font-black text-white leading-none tracking-tighter">{selections.length}</span>
                      <span className="text-[8px] font-black text-slate-600 uppercase mt-1 tracking-widest">Picks</span>
                    </div>

                    {/* Returns */}
                    <div className="col-span-2 lg:col-span-3 flex flex-row lg:flex-col justify-between lg:justify-center items-center lg:items-end gap-2 lg:gap-1.5 lg:pr-4">
                       <div className="flex flex-col items-end">
                          <p className="lg:hidden text-[8px] text-slate-600 uppercase font-black mb-0.5">Stake</p>
                          <p className="text-xs font-black text-slate-400 tabular-nums">
                            <span className="text-[9px] mr-1 opacity-50 uppercase font-bold">KSh</span>
                            {Number(t.stake).toLocaleString()}
                          </p>
                       </div>
                       <div className="flex flex-col items-end">
                          <p className="lg:hidden text-[8px] text-[#f59e0b] uppercase font-black mb-0.5">Returns</p>
                          <p className={`text-lg lg:text-sm font-black tabular-nums leading-none ${t.status === 'won' ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>
                            <span className="text-[9px] mr-1 opacity-50 uppercase font-bold">KSh</span>
                            {Number(t.potential_payout).toLocaleString()}
                          </p>
                       </div>
                    </div>

                    {/* Action Button */}
                    <div className="col-span-1 flex items-center justify-end lg:justify-center gap-3" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedTicket(t)}
                          className="h-10 w-10 flex items-center justify-center bg-white/5 rounded-2xl text-slate-400 hover:text-[#10b981] hover:bg-[#10b981]/10 transition-all border border-white/5 group-hover:border-[#10b981]/30"
                        >
                          <Eye size={18} />
                        </button>

                        {t.status === 'won' && !isPaid && (
                          <button
                            onClick={() => handlePayout(t)}
                            className="bg-[#10b981] text-black h-10 px-5 rounded-2xl font-black italic uppercase text-[11px] hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(16,185,129,0.2)] flex items-center gap-2 border border-white/10"
                          >
                            <Banknote size={15} /> Collect
                          </button>
                        )}
                        
                        {isPaid && (
                          <div className="flex flex-col items-center px-2 opacity-40">
                             <CheckCircle2 size={14} className="text-[#10b981] mb-0.5" />
                             <span className="text-[9px] font-black text-[#10b981] uppercase italic">Cleared</span>
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination - Dense */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center px-8 py-5 border-t border-white/5 bg-white/[0.01]">
                <div className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] italic">
                   Total Inventory: {totalCount} Records
                </div>
                <div className="flex items-center gap-3">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black disabled:opacity-20 hover:bg-[#10b981] hover:text-black transition-all border border-white/5"
                  >PREV</button>
                  <span className="text-[11px] font-black text-white px-2">
                    {page + 1} <span className="text-slate-600 italic">of</span> {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black disabled:opacity-20 hover:bg-[#10b981] hover:text-black transition-all border border-white/5"
                  >NEXT</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTicket && (
        <div 
          onClick={() => setSelectedTicket(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 no-print overflow-y-auto backdrop-blur-md cursor-pointer"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="relative bg-[#111926] border border-white/10 rounded-[3rem] p-6 md:p-8 max-w-2xl w-full shadow-2xl my-auto animate-in zoom-in-95 duration-300 cursor-default"
          >
            {/* Top Navigation Row */}
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
              <button
                onClick={() => setSelectedTicket(null)}
                className="flex items-center gap-3 text-slate-400 hover:text-[#10b981] transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#10b981] group-hover:text-black transition-all">
                   <X size={16} />
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest italic">Back to Ledger</span>
              </button>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/5">
                 <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${
                   selectedTicket.status === 'won' ? 'bg-[#10b981] shadow-[#10b981]' : 
                   selectedTicket.status === 'lost' ? 'bg-rose-500 shadow-rose-500' : 'bg-amber-400 shadow-amber-400'
                 }`} />
                 <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">{selectedTicket.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
               {/* Left Side: Intel Breakdown */}
               <div className="flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-lg font-black italic uppercase tracking-[0.2em] text-white">Ticket Intelligence</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                     <div className="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-1">
                        <p className="text-[9px] font-black text-slate-600 uppercase italic">Serial No.</p>
                        <p className="text-sm font-black text-white italic">#{selectedTicket.ticket_serial}</p>
                     </div>
                     <div className="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-1">
                        <p className="text-[9px] font-black text-slate-600 uppercase italic">Booking Code</p>
                        <p className="text-sm font-black text-amber-500 italic tracking-widest">{selectedTicket.booking_code || 'N/A'}</p>
                     </div>
                     <div className="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-1 col-span-2">
                        <p className="text-[9px] font-black text-slate-600 uppercase italic">Deployment Timestamp</p>
                        <p className="text-[11px] font-bold text-slate-400">
                           {new Date(selectedTicket.created_at).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}
                        </p>
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[300px] pr-2">
                    <p className="text-[10px] font-black text-[#10b981] uppercase italic mb-3 tracking-[0.3em]">Strategy Breakdown ({selectedTicket.selections?.length})</p>
                    <div className="space-y-1">
                      {selectedTicket.selections?.map((sel, i) => (
                        <SelectionRow key={i} sel={sel} />
                      ))}
                    </div>
                  </div>
               </div>

               {/* Right Side: Visual & Execution */}
               <div className="flex flex-col gap-6">
                  <div className="bg-white p-3 rounded-2xl mx-auto shadow-2xl w-full flex-1 overflow-hidden min-h-[350px] relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 pointer-events-none" />
                    <div className="scale-[0.8] origin-top h-full overflow-y-auto no-scrollbar">
                       <PrintableTicket ticket={selectedTicket} isReprint={true} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => {
                        shouldPrintRef.current = true;
                        setSelectedTicket({ ...selectedTicket });
                      }}
                      className="w-full bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all text-xs italic uppercase border border-white/10"
                    >
                      <Printer size={18} className="text-[#10b981]" /> Execute Reprint
                    </button>

                    {selectedTicket.status === 'won' && !selectedTicket.paid_at && (
                      <button
                        onClick={() => handlePayout(selectedTicket)}
                        className="w-full bg-[#10b981] text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all text-sm italic uppercase shadow-[0_15px_30px_rgba(16,185,129,0.3)] border-2 border-white/10"
                      >
                        <Banknote size={20} /> Authorize Payout · KES {Number(selectedTicket.potential_payout).toLocaleString()}
                      </button>
                    )}
                    
                    {selectedTicket.paid_at && (
                      <div className="w-full bg-[#10b981]/10 border border-[#10b981]/20 py-4 rounded-2xl flex items-center justify-center gap-3">
                         <CheckCircle2 size={18} className="text-[#10b981]" />
                         <span className="text-[11px] font-black text-[#10b981] uppercase italic tracking-widest">Transaction Cleared</span>
                      </div>
                    )}
                  </div>
               </div>
            </div>

            <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5 opacity-30">
               <span className="text-[8px] font-black text-white uppercase tracking-[0.5em]">Lucra Quantum POS</span>
               <span className="text-[8px] font-black text-white uppercase tracking-[0.5em]">Node ID: {user?.id.slice(0,8)}</span>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.4); }
        
        @media screen { #temp-print-portal { display: none !important; } }
        @media print {
          #__next, .no-print, .fixed { display: none !important; }
          #temp-print-portal {
            display: block !important;
            width: 72mm !important;
            position: absolute;
            top: 0; left: 0;
          }
        }
      `}</style>
    </CashierLayout>
  );
}
