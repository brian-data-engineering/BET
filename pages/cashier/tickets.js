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
  lost:    { label: 'Lost',    color: 'text-red-400',   icon: XCircle      },
  pending: { label: 'Pending', color: 'text-amber-400', icon: Clock        },
};

function SelectionRow({ sel }) {
  const result = sel.result || 'pending';
  const score  = sel.score  || null;
  const resultColor =
    result === 'won'  ? 'text-[#10b981]' :
    result === 'lost' ? 'text-red-400'   : 'text-amber-400';

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
        .from('print')
        .select('*', { count: 'exact' })
        .eq('cashier_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (currentSearch) query = query.ilike('ticket_serial', `%${currentSearch}%`);
      if (currentStatus !== 'all') query = query.eq('status', currentStatus);

      const { data, count, error } = await query;
      if (error) throw error;
      setTickets(data || []);
      setTotalCount(count || 0);
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
    } catch (err) {
      alert(`❌ PAYOUT FAILED: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalPages  = Math.ceil(totalCount / pageSize);
  const wonCount     = tickets.filter(t => t.status === 'won').length;
  const lostCount    = tickets.filter(t => t.status === 'lost').length;
  const pendingCount = tickets.filter(t => t.status === 'pending').length;

  return (
    <CashierLayout>
      <div className="p-4 md:p-8 bg-[#0b0f1a] min-h-screen text-white font-sans no-print">

        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center">
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-[#10b981] shrink-0">
            Terminal Ledger
          </h1>
          <div className="flex-1 bg-[#111926] p-3 rounded-2xl border border-white/5 flex items-center gap-3 focus-within:border-[#10b981]/50 transition-all w-full">
            <Search size={16} className="text-[#10b981] opacity-50 shrink-0" />
            <input
              className="bg-transparent outline-none w-full font-black uppercase tracking-widest text-sm placeholder:text-white/10"
              placeholder="SEARCH SERIAL..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: 'all',     label: `All (${totalCount})`,        color: '' },
            { key: 'pending', label: `Pending (${pendingCount})`,  color: 'text-amber-400' },
            { key: 'won',     label: `Won (${wonCount})`,          color: 'text-[#10b981]' },
            { key: 'lost',    label: `Lost (${lostCount})`,        color: 'text-red-400'   },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => { setStatusFilter(f.key); setPage(0); }}
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase border transition-all ${
                statusFilter === f.key
                  ? 'bg-[#10b981] border-[#10b981] text-black'
                  : `bg-white/5 border-white/5 ${f.color || 'text-slate-400'} hover:border-white/20`
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Ticket list */}
        {loading && tickets.length === 0 ? (
          <div className="flex flex-col items-center mt-40 gap-4 opacity-20">
            <Loader2 className="animate-spin text-[#10b981]" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Loading...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center mt-20 opacity-10">
            <Receipt size={64} className="mx-auto mb-4" />
            <p className="font-black uppercase tracking-widest text-xs">No Records Found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(t => {
              const st         = STATUS[t.status] || STATUS.pending;
              const Icon       = st.icon;
              const selections = t.selections || [];
              const settledCount = selections.filter(s => s.result && s.result !== 'pending').length;
              // paid_at = cash paid out, settled_at = graded by settlement scraper
              const isPaid     = !!t.paid_at;

              return (
                <div
                  key={t.id}
                  className="bg-[#111926]/80 backdrop-blur-md rounded-[1.5rem] border border-white/5 hover:border-[#10b981]/20 transition-all overflow-hidden"
                >
                  {/* Ticket header */}
                  <div className="flex justify-between items-center p-4 md:p-5">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${
                        t.status === 'won'  ? 'bg-[#10b981] text-black' :
                        t.status === 'lost' ? 'bg-red-500/20 text-red-400' :
                        'bg-white/5 text-amber-400'
                      }`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <h4 className="font-black italic uppercase tracking-tight text-base">
                          #{t.ticket_serial}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className={`text-[9px] font-black uppercase ${st.color}`}>{st.label}</span>
                          <span className="text-[9px] text-slate-600">·</span>
                          <span className="text-[9px] text-slate-500">
                            {selections.length} pick{selections.length !== 1 ? 's' : ''} · {settledCount}/{selections.length} settled
                          </span>
                          <span className="text-[9px] text-slate-600">·</span>
                          <span className="text-[9px] text-slate-500">
                            {new Date(t.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}{' '}
                            {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 md:gap-6">
                      {/* Stake × Odds = Payout */}
                      <div className="hidden md:block text-right">
                        <p className="text-[8px] text-slate-600 uppercase font-bold">Stake · Odds · Payout</p>
                        <p className="text-sm font-black">
                          <span className="text-slate-400">{Number(t.stake).toLocaleString()}</span>
                          <span className="text-slate-600 mx-1">×</span>
                          <span className="text-[#f59e0b]">{Number(t.total_odds).toFixed(2)}</span>
                          <span className="text-slate-600 mx-1">=</span>
                          <span className={t.status === 'won' ? 'text-[#10b981]' : 'text-white'}>
                            {Number(t.potential_payout).toLocaleString()}
                          </span>
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTicket(t)}
                          className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-[#10b981] transition-colors"
                          title="View / Reprint"
                        >
                          <Eye size={16} />
                        </button>

                        {/* Collect button — only if won AND not yet paid out */}
                        {t.status === 'won' && !isPaid && (
                          <button
                            onClick={() => handlePayout(t)}
                            className="bg-[#10b981] text-black px-3 py-2 rounded-xl font-black italic uppercase text-[9px] hover:scale-105 transition-all shadow-lg flex items-center gap-1.5"
                          >
                            <Banknote size={13} /> Collect
                          </button>
                        )}

                        {t.status === 'won' && isPaid && (
                          <span className="text-[9px] font-black text-[#10b981]/40 uppercase italic">Paid</span>
                        )}

                        {t.status === 'lost' && (
                          <span className="text-[9px] font-black text-red-500/40 uppercase italic">Lost</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Selections — always visible */}
                  <div className="border-t border-white/5 px-4 md:px-5 pb-3">
                    {selections.map((sel, i) => (
                      <SelectionRow key={i} sel={sel} />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 pt-4">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="p-2 bg-white/5 rounded-xl disabled:opacity-20 hover:bg-white/10 transition-colors"
                >←</button>
                <span className="text-[10px] font-black uppercase text-slate-500">
                  Page {page + 1} of {totalPages} · {totalCount} tickets
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="p-2 bg-white/5 rounded-xl disabled:opacity-20 hover:bg-white/10 transition-colors"
                >→</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reprint modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 no-print overflow-y-auto">
          <div className="relative bg-[#111926] border border-white/10 rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl my-auto">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute top-4 right-4 bg-black/20 hover:bg-[#10b981] hover:text-black transition-all p-2 rounded-full text-white/50"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-4 mt-2">
              <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                selectedTicket.status === 'won'  ? 'bg-[#10b981]/20 text-[#10b981]' :
                selectedTicket.status === 'lost' ? 'bg-red-500/20 text-red-400'    :
                'bg-amber-500/20 text-amber-400'
              }`}>
                {selectedTicket.status?.toUpperCase()}
                {selectedTicket.paid_at ? ' · PAID' : ''}
              </span>
            </div>

            <button
              onClick={() => {
                shouldPrintRef.current = true;
                setSelectedTicket({ ...selectedTicket });
              }}
              className="w-full bg-[#10b981] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all mb-6 text-sm italic uppercase shadow-xl"
            >
              <Printer size={18} /> Reprint Ticket
            </button>

            <div id="visible-preview" className="bg-white p-2 rounded-xl mx-auto">
              <PrintableTicket ticket={selectedTicket} isReprint={true} />
            </div>

            <p className="text-[8px] text-center text-white/20 mt-4 uppercase font-bold tracking-[0.3em]">
              Lucra Terminal System
            </p>
          </div>
        </div>
      )}

      <style jsx global>{`
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
