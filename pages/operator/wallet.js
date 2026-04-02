import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { ArrowDownRight, Loader2, Send, History } from 'lucide-react';

export default function Funding() {
  const [amount, setAmount] = useState('');
  const [targetId, setTargetId] = useState('');
  const [cashiers, setCashiers] = useState([]);
  const [operatorProfile, setOperatorProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. SYNC DATA FROM DATABASE
  const syncData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [pRes, cRes, tRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('profiles').select('*').eq('role', 'cashier').eq('parent_id', user.id).order('username', { ascending: true }),
      supabase.from('transactions')
        .select('*, receiver:profiles!transactions_receiver_id_fkey(username)')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    if (pRes.data) setOperatorProfile(pRes.data);
    if (cRes.data) setCashiers(cRes.data || []);
    if (tRes.data) setTransactions(tRes.data || []);
    setLoading(false);
  }, []);

  // 2. REALTIME & INITIALIZE
  useEffect(() => {
    let channel;
    
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await syncData();

        // FIXED REALTIME ORDER: .on() BEFORE .subscribe()
        channel = supabase
          .channel('funding-updates')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'profiles',
            filter: `id=eq.${user.id}` 
          }, () => syncData())
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'transactions' 
          }, () => syncData())
          .subscribe();
      }
    };

    init();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [syncData]);

  // 3. TRANSFER EXECUTION
  const handleTransfer = async () => {
    const cleanAmount = Math.trunc(Number(amount));
    if (!targetId || !cleanAmount || cleanAmount <= 0) return;

    setIsProcessing(true); // LOCK UI
    try {
      const { error } = await supabase.rpc('transfer_credits', {
        p_sender_id: operatorProfile.id,
        p_receiver_id: targetId,
        p_amount: cleanAmount
      });

      if (error) throw error;

      setAmount('');
      setTargetId('');
      // syncData will be triggered by Realtime channel
    } catch (err) {
      alert("Critical Error: " + err.message);
    } finally {
      setIsProcessing(false); // UNLOCK UI
    }
  };

  if (loading) return (
    <div className="h-screen bg-[#0b0f1a] flex items-center justify-center">
      <Loader2 className="animate-spin text-[#10b981]" />
    </div>
  );

  return (
    <OperatorLayout profile={operatorProfile}>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* HEADER & BALANCE */}
        <div className="flex justify-between items-end border-b border-white/5 pb-10">
          <div>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter text-white">Liquidity</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-2 italic">Operator: {operatorProfile?.username}</p>
          </div>
          <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <span className="text-[9px] font-black text-slate-500 uppercase italic block mb-1">True Vault Balance</span>
            <span className="text-4xl font-black text-[#10b981] italic tracking-tighter">
              KES {Math.floor(operatorProfile?.balance || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* DISPATCH FORM */}
          <div className={`lg:col-span-7 bg-[#111926] p-12 rounded-[3rem] border border-white/5 space-y-10 shadow-2xl ${isProcessing ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 italic tracking-widest">Select Node</label>
                <select 
                  className="w-full bg-[#0b0f1a] p-6 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#10b981]" 
                  value={targetId} 
                  onChange={e => setTargetId(e.target.value)}
                >
                  <option value="">Select Terminal...</option>
                  {cashiers.map(c => (
                    <option key={c.id} value={c.id}>{c.username.toUpperCase()} (Float: {Math.floor(c.balance).toLocaleString()})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 italic tracking-widest">Amount to Send</label>
                <input 
                  type="number" 
                  className="w-full bg-[#0b0f1a] p-8 rounded-2xl border border-white/10 text-5xl font-black text-[#10b981] outline-none" 
                  placeholder="0" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                />
              </div>
            </div>
            <button 
              onClick={handleTransfer} 
              disabled={isProcessing || !targetId || !amount} 
              className="w-full bg-[#10b981] text-black font-black py-7 rounded-2xl hover:bg-white transition-all italic text-xs uppercase tracking-[0.3em]"
            >
              {isProcessing ? 'Synchronizing...' : 'Authorize Dispatch'}
            </button>
          </div>

          {/* AUDIT TRAIL */}
          <div className="lg:col-span-5 bg-[#111926] p-10 rounded-[3rem] border border-white/5 shadow-2xl">
            <h2 className="text-[10px] font-black uppercase text-slate-500 italic tracking-widest mb-6 flex items-center gap-2">
              <History size={14} /> Audit Trail
            </h2>
            <div className="space-y-4">
              {transactions.map(tx => (
                <div key={tx.id} className="flex justify-between items-center p-5 bg-[#0b0f1a] rounded-2xl border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#10b981]/5 rounded-xl text-[#10b981]"><ArrowDownRight size={16} /></div>
                    <div>
                        <span className="text-xs font-black uppercase italic text-white/70 block">{tx.receiver?.username || 'Node'}</span>
                        <span className="text-[8px] text-slate-600 font-bold uppercase">{new Date(tx.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <span className="text-sm font-black italic text-[#10b981]">KES {Math.floor(tx.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}
