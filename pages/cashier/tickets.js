import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import { 
  Search, 
  Receipt, 
  CheckCircle2, 
  ShieldAlert, 
  Coins, 
  Clock,
  UserCheck,
  AlertTriangle
} from 'lucide-react';

export default function TicketManager() {
  const [ticketId, setTicketId] = useState('');
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [error, setError] = useState(null);

  const findTicket = async () => {
    if (!ticketId) return;
    setLoading(true);
    setTicket(null);
    setError(null);
    
    // Querying the betsnow table
    // We search by the bet_code (the one printed on the receipt)
    const { data, error: fetchError } = await supabase
      .from('betsnow') 
      .select('*')
      .eq('bet_code', ticketId.toUpperCase().trim())
      .single();

    if (fetchError || !data) {
      setError("TICKET NOT FOUND IN SYSTEM");
    } else {
      setTicket(data);
    }
    setLoading(false);
  };

  const handlePayout = async () => {
    // Safety check: Only 'won' tickets that haven't been paid yet
    if (!ticket || ticket.status !== 'won' || ticket.is_paid) return;
    
    setPayoutLoading(true);
    
    // Update the betsnow record
    const { error: updateError } = await supabase
      .from('betsnow')
      .update({ 
        is_paid: true, 
        paid_at: new Date().toISOString(),
        // Assuming your auth context provides the cashier's identity
      })
      .eq('id', ticket.id);

    if (!updateError) {
      setTicket({ ...ticket, is_paid: true });
      alert("PAYOUT SUCCESSFUL: Transaction Logged.");
    } else {
      alert("DATABASE ERROR: Payout could not be processed.");
    }
    setPayoutLoading(false);
  };

  return (
    <CashierLayout>
      <div className="p-8 max-w-4xl mx-auto min-h-screen bg-[#0b0f1a] text-white">
        
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex p-3 bg-[#10b981]/10 rounded-2xl mb-4 border border-[#10b981]/20">
            <Receipt className="text-[#10b981]" size={24} />
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">Betsnow Validator</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic text-center">Cashier Payout Terminal v2.0</p>
        </div>

        {/* Search Input */}
        <div className="flex gap-4 mb-12">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-5 text-slate-500 group-focus-within:text-[#10b981] transition-colors" size={20} />
            <input 
              placeholder="ENTER BET CODE (E.G. BT-9920)" 
              className="w-full bg-[#111926] p-5 pl-14 rounded-2xl border border-white/5 focus:border-[#10b981] outline-none font-black tracking-[0.2em] text-sm uppercase placeholder:text-slate-700 transition-all shadow-inner"
              onChange={e => setTicketId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && findTicket()}
            />
          </div>
          <button 
            onClick={findTicket} 
            disabled={loading}
            className="bg-[#10b981] text-black px-12 rounded-2xl font-black flex items-center gap-3 hover:bg-white transition-all active:scale-95 shadow-xl shadow-[#10b981]/10 uppercase italic text-sm"
          >
            {loading ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : "Verify"}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl flex items-center gap-4 animate-shake">
            <AlertTriangle className="text-red-500" size={24} />
            <p className="text-xs font-black uppercase italic text-red-400 tracking-widest">{error}</p>
          </div>
        )}

        {/* Ticket Data */}
        {ticket && (
          <div className="bg-[#111926] rounded-[3rem] p-10 border border-white/5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="flex justify-between items-start border-b border-white/5 pb-8 mb-8">
              <div>
                <p className="text-[9px] text-slate-500 font-black uppercase italic tracking-widest mb-1">Ticket Reference</p>
                <h2 className="text-3xl font-black text-[#10b981] italic tracking-tighter">{ticket.bet_code}</h2>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-500 font-black uppercase italic tracking-widest mb-1">Current Status</p>
                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase italic ${ticket.status === 'won' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-slate-800 text-slate-500'}`}>
                  {ticket.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <DataTile label="Stake" value={`KES ${parseFloat(ticket.stake || 0).toLocaleString()}`} />
              <DataTile label="Total Odds" value={`x${parseFloat(ticket.total_odds || 0).toFixed(2)}`} />
              <DataTile 
                label="Winning Amount" 
                value={`KES ${parseFloat(ticket.potential_payout || 0).toLocaleString()}`} 
                highlight={ticket.status === 'won'}
              />
            </div>

            {/* Payout Logic */}
            {ticket.status === 'won' ? (
              ticket.is_paid ? (
                <div className="bg-blue-500/5 border border-blue-500/10 p-8 rounded-[2rem] text-center">
                  <CheckCircle2 className="mx-auto text-blue-5
