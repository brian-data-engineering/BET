import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { ArrowDownRight, Loader2, Send, History, Database } from 'lucide-react';

export default function Funding() {
  const [amount, setAmount] = useState('');
  const [targetId, setTargetId] = useState('');
  const [agents, setAgents] = useState([]);
  const [operatorProfile, setOperatorProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. DATA ENGINE: Fetches Profile, Subordinate Agents, and Audit Trail
  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch operator profile first to get the brand context (tenant_id)
    const { data: profile } = await supabase.from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      setOperatorProfile(profile);

      const [aRes, tRes] = await Promise.all([
        // AGENTS: Must belong to this operator AND the same brand
        supabase.from('profiles')
          .select('*')
          .eq('role', 'agent') 
          .eq('parent_id', user.id)
          .eq('tenant_id', profile.tenant_id)
          .order('username', { ascending: true }),

        // LEDGER: Link to profiles via ledger_reference_id_fkey for receiver names
        supabase.from('ledger')
          .select(`
            *,
            receiver:profiles!ledger_reference_id_fkey(username, display_name)
          `)
          .eq('user_id', user.id) 
          .eq('type', 'debit')   
          .eq('source', 'transfer')
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (aRes.data) setAgents(aRes.data);
      if (tRes.data) setTransactions(tRes.data);
    }

    setLoading(false);
  }, []);

  // 2. REAL-TIME ENGINE: Listen for balance or ledger changes
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`operator-sync-${operatorProfile?.id || 'global'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ledger' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData, operatorProfile?.id]);

  // 3. TRANSACTION HANDLER: Authorizes liquidity dispatch
  const handleTransfer = async () => {
    const cleanAmount = Math.trunc(Number(amount));
    
    // Safety check: Prevent over-drafting
    if (cleanAmount > (operatorProfile?.balance || 0)) {
      alert("Insufficient Float: You cannot dispatch more than your current balance.");
      return;
    }

    if (!targetId || !cleanAmount || cleanAmount <= 0) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc('process_transfer', {
        p_sender_id: operatorProfile.id,
        p_receiver_id: targetId,
        p_amount: cleanAmount
      });

      if (error) throw error;

      setAmount('');
      setTargetId('');
    } catch (err) {
      alert("Dispatch Rejected: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div className="h-screen bg-[#0b0f1a] flex items-center justify-center">
      <Loader2 className="animate-spin text-[#10b981]" size={32} />
    </div>
  );

  return (
    <OperatorLayout profile={operatorProfile}>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* HEADER SECTION */}
        <div className="flex justify-between items-end border-b border-white/5 pb-10">
          <div>
            <div className="flex items-center gap-2 text-blue-500 font-black uppercase text-[10px] italic mb-1 tracking-widest">
              <Database size={12} /> Liquidity Distribution
            </div>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter text-white">Dispatch</h1>
          </div>
          <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl text-right">
            <span className="text-[9px] font-black text-slate-500 uppercase italic block mb-1 text-slate-400">Operator Float</span>
            <span className="text-4xl font-black text-[#10b981] italic tracking-tighter">
              KES {parseFloat(operatorProfile?.balance || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* DISPATCH FORM */}
          <div className={`lg:col-span-7 bg-[#111926] p-12 rounded-[3rem] border border-white/5 space-y-10 shadow-2xl ${isProcessing ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 italic tracking-widest">Select Target Agent</label>
                <select 
                  className="w-full bg-[#0b0f1a] p-6 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#10b981] transition-all appearance-none cursor-pointer" 
                  value={targetId} 
                  onChange={e => setTargetId(e.target.value)}
                >
                  <option value="">Select an Agent...</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id} className="bg-[#111926]">
                      {a.username.toUpperCase()} — {a.display_name} (KES {parseFloat(a.balance || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 italic tracking-widest">Amount to Send (KES)</label>
                <input 
                  type="number" 
                  className="w-full bg-[#0b0f1a] p-8 rounded-2xl border border-white/10 text-5xl font-black text-[#10b981] outline-none placeholder:text-white/5 focus:border-[#10b981]/50 transition-all" 
                  placeholder="0" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                />
              </div>
            </div>

            <button 
              onClick={handleTransfer} 
              disabled={isProcessing || !targetId || !amount} 
              className="w-full bg-[#10b981] text-black font-black py-7 rounded-2xl hover:bg-white transition-all italic text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl shadow-emerald-950/20 active:scale-[0.98]"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <Send size={16} />}
              {isProcessing ? 'SYNCHRONIZING...' : 'AUTHORIZE DISPATCH'}
            </button>
          </div>

          {/* AUDIT LOG */}
          <div className="lg:col-span-5 bg-[#111926] p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col max-h-[600px]">
            <h2 className="text-[10px] font-black uppercase text-slate-500 italic tracking-widest mb-6 flex items-center gap-2">
              <History size={14} /> Dispatch Audit
            </h2>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {transactions.length === 0 ? (
                <div className="text-center py-20 text-slate-700 text-[10px] font-bold uppercase italic tracking-widest">No recent dispatches</div>
              ) : (
                transactions.map(tx => (
                  <div key={tx.id} className="flex justify-between items-center p-5 bg-[#0b0f1a] rounded-2xl border border-white/[0.03] hover:border-emerald-500/20 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500 group-hover:bg-rose-500/20"><ArrowDownRight size={16} /></div>
                      <div>
                        <span className="text-xs font-black uppercase italic text-white/70 block">
                          {tx.receiver?.display_name || tx.receiver?.username || 'SYSTEM_NODE'}
                        </span>
                        <span className="text-[8px] text-slate-600 font-bold uppercase">{new Date(tx.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <span className="text-sm font-black italic text-rose-500">-KES {parseFloat(tx.amount).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </OperatorLayout>
  );
}
