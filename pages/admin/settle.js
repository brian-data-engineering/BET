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
      // 1. Fetch raw tickets without the 'cashier' join to avoid relationship errors
      const { data, error } = await supabase
        .from('betsnow')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 2. Map through tickets and fetch match results for each
      const ticketsWithResults = await Promise.all((data || []).map(async (ticket) => {
        const matchIds = ticket.selections?.map(s => s.matchId) || [];
        
        const { data: results } = await supabase
          .from('soccer_results')
          .select('*')
          .in('event_id', matchIds);

        return { 
          ...ticket, 
          available_results: results || [],
          // Fallback for cashier name since we removed the join
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
      default:
        return 'PENDING';
    }
  };

  const handleSettle = async (ticket, finalStatus) => {
    if (processingId) return;
    setProcessingId(ticket.id);
    
    try {
      // 1. Log the settlement
      await supabase.from('settlement_logs').insert({
        ticket_id: ticket.id,
        ticket_serial: ticket.ticket_serial,
        cashier_id: ticket.cashier_id,
        payout_amount: finalStatus === 'won' ? ticket.potential_payout : 0,
        settlement_data: { selections: ticket.selections }
      });

      // 2. Update ticket status
      const { error } = await supabase
        .from('betsnow')
        .update({ 
          status: finalStatus, 
          is_paid: finalStatus === 'won',
          settled_at: new Date().toISOString()
        })
        .eq('id', ticket.id);

      if (!error) {
        setTickets(prev => prev.filter(t => t.id !== ticket.id));
      }
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
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Manual Override & Payout</span>
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">Lucra Settlement</h1>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text"
              placeholder="SEARCH SERIAL OR TEAM..."
              className="w-full bg-[#111926] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold uppercase italic focus:border-[#f59e0b] outline-none transition-all placeholder:opacity-20"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="py-20 text-center animate-pulse italic font-black text-slate-700 uppercase tracking-[0.5em]">Scanning Active Tickets...</div>
          ) : (
            filteredTickets.map((ticket) => {
              const results = ticket.available_results || [];
              const ticketEvaluation = (ticket.selections || []).map(sel => {
                const res = results.find(r => String(r.event_id) === String(sel.matchId));
                return { ...sel, status: checkLegStatus(sel, res) };
              });

              const canSettleWon = ticketEvaluation.length > 0 && ticketEvaluation.every(l => l.status === 'WON');
              const isLost = ticketEvaluation.some(l => l.status === 'LOST');

              return (
                <div key={ticket.id} className="bg-[#111926] border border-white/5 rounded-[2.5rem] overflow-hidden transition-all hover:border-white/10">
                  <div className="p-6 flex flex-col lg:flex-row gap-8">
                    
                    <div className="min-w-[200px] space-y-2">
                      <div className="flex items-center gap-2">
                        <Hash size={12} className="text-slate-500" />
                        <span className="text-xs font-black italic text-slate-400">{ticket.ticket_serial || 'NO SERIAL'}</span>
                      </div>
                      <div className="text-2xl font-black text-[#10b981] italic tracking-tight">KES {ticket.potential_payout}</div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase italic">
                        <Wallet size={12} />
                        Cashier: {ticket.display_cashier}
                      </div>
                    </div>

                    <div className="flex-1 space-y-3">
                      {ticketEvaluation.map((sel, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-[#0b0f1a] p-3 rounded-2xl border border-white/[0.03]">
                          <div className="max-w-[70%]">
                            <span className="text-
