import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { ArrowDownRight, Send, Loader2, History, Clock } from 'lucide-react';

export default function ShopWallet() {
  const [amount, setAmount] = useState('');
  const [targetId, setTargetId] = useState('');
  const [cashiers, setCashiers] = useState([]);
  const [operatorProfile, setOperatorProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  const syncWalletData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetching fresh data directly from DB to ensure local state isn't "guessing"
    const [pRes, cRes, tRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('profiles').select('*').eq('role', 'cashier').eq('parent_id', user.id).order('username', { ascending: true }),
      supabase.from('transactions').select('*, receiver:profiles!transactions_receiver_id_fkey(username)').eq('sender_id', user.id).order('created_at', { ascending: false }).limit(10)
    ]);

    if (pRes.data) setOperatorProfile(pRes.data);
    if (cRes.data) setCashiers(cRes.data);
    if (tRes.data) setTransactions(tRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { syncWalletData(); }, [syncWalletData]);

  const handleTransfer = async () => {
    // 1. Force Clean Whole Numbers (Prevents Decimal Bleed)
    const numAmount = Math.floor(parseFloat(amount));
    
    if (!targetId || !numAmount || numAmount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    // 2. Local Safety Check
    const currentBalance = Math.floor(operatorProfile?.balance || 0);
    if (numAmount > currentBalance) {
      alert(`Insufficient Funds. Your max available is KES ${currentBalance.toLocaleString()}`);
      return;
    }

    setIsProcessing(true);
    try {
      // 3. Call RPC with verified p_ arguments
      const { error } = await supabase.rpc('transfer_credits', {
        p_sender_id: operatorProfile.id,
        p_receiver_id: targetId,
        p_amount: numAmount
      });

      if (error) throw error;

      // 4. Success Routine
      setAmount('');
      setTargetId('');
      
      // 5. HARD REFRESH: Fetch new balance immediately after the DB lock is released
      await syncWalletData();
      alert("Asset Dispatch Confirmed.");

    } catch (err) {
      console.error("Transfer Blocked:", err);
      alert("Protocol Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="h-screen bg-[#0b0f1a] flex items-center justify-center"><Loader2 className="animate-spin text-[#10b981]" /></div>;

  return (
    <OperatorLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        <div className="flex justify-between items-end border-b border-white/5 pb-10">
          <div>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter">Liquidity Hub</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-2 italic">Node: {operatorProfile?.username}</p>
          </div>
          <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic block mb-1">Available Float</span>
            <span className="text-4xl font-black text-[#10b981] italic tracking-tighter">
              KES {Math.floor(operatorProfile?.balance || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 bg-[#111926] p-12 rounded-[3rem] border border-white/5 space-y-10 shadow-2xl">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 italic tracking-widest">Select Target Terminal</label>
                <select className="w-full bg-[#0b0f1a] p-6 rounded-2xl border border-white/10 text-white font-bold outline-none" value={targetId} onChange={e => setTargetId(e.target.value)}>
                  <option value="">Choose Cashier...</option>
                  {cashiers.map(c => <option key={c.id} value={c.id}>{c.username.toUpperCase()} (KES {Math.floor(c.balance).toLocaleString()})</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 italic tracking-widest">Amount to Transfer</label>
                <input type="number" step="1" className="w-full bg-[#0b0f1a] p-8 rounded-2xl border border-white/10 text-5xl font-black text-[#10b981] outline-none" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
            </div>
            <button onClick={handleTransfer} disabled={isProcessing || !targetId || !amount} className="w-full bg-[#10b981] text-black font-black py-7 rounded-2xl hover:bg-white transition-all italic text-xs uppercase tracking-[0.3em] shadow-xl disabled:opacity-20">
              {isProcessing ? 'Authorizing Dispatch...' : 'Execute Asset Transfer'}
            </button>
          </div>

          <div className="lg:col-span-5 bg-[#111926] p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-6">
            <h2 className="text-[10px] font-black uppercase text-slate-500 italic tracking-widest flex items-center gap-2"><History size={14}/> Recent Activity</h2>
            <div className="space-y-4">
              {transactions.map(tx => (
                <div key={tx.id} className="flex justify-between items-center p-5 bg-[#0b0f1a] rounded-2xl border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#10b981]/5 rounded-xl text-[#10b981]"><ArrowDownRight size={16} /></div>
                    <div>
                        <span className="text-xs font-black uppercase italic text-white/70 block">{tx.receiver?.username || 'Cashier'}</span>
                        <span className="text-[8px] text-slate-600 font-bold uppercase italic">{new Date(tx.created_at).toLocaleTimeString()}</span>
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
