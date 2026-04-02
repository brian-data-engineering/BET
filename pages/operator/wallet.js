import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { Wallet, ArrowDownRight, Info, Send, History, Clock, Loader2 } from 'lucide-react';

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
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setOperatorProfile(profile);

      const { data: managed } = await supabase.from('profiles').select('*').eq('role', 'cashier').eq('parent_id', user.id).order('username', { ascending: true });
      setCashiers(managed || []);

      const { data: logs } = await supabase.from('transactions').select('*, receiver:profiles!transactions_receiver_id_fkey(username)').eq('sender_id', user.id).order('created_at', { ascending: false }).limit(5);
      setTransactions(logs || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    syncWalletData();
    const channel = supabase.channel('wallet-v3').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => syncWalletData()).subscribe();
    return () => supabase.removeChannel(channel);
  }, [syncWalletData]);

  const handleTransfer = async () => {
    const numAmount = parseFloat(amount);
    if (!targetId || !numAmount || numAmount <= 0) return;

    // PREVENT NEGATIVE CONSTRAINT ERROR
    if (numAmount > (operatorProfile?.balance || 0)) {
      alert("CRITICAL: Insufficient Float in Hub!");
      return;
    }

    setIsProcessing(true);
    const { error } = await supabase.rpc('transfer_credits', {
      sender_id: operatorProfile.id,      // Exact match to your SQL
      receiver_id: targetId,             // Exact match to your SQL
      amount_to_transfer: numAmount      // Exact match to your SQL
    });

    if (error) {
      alert("Transfer Protocol Failed: " + error.message);
      setIsProcessing(false);
    } else {
      setAmount('');
      setTargetId('');
      await syncWalletData();
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="h-screen bg-[#0b0f1a] flex items-center justify-center"><Loader2 className="animate-spin text-[#10b981]" /></div>;

  const selectedCashier = cashiers.find(c => c.id === targetId);

  return (
    <OperatorLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-12 bg-[#0b0f1a] min-h-screen text-white font-sans">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-10">
          <div className="space-y-1">
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">Liquidity <span className="text-slate-700">Hub</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-1 italic">Vault Node: {operatorProfile?.username}</p>
          </div>
          <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 min-w-[350px] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#10b981]/10 rounded-full blur-3xl" />
            <h2 className="text-4xl font-black text-white italic tracking-tighter relative z-10">
              KES {parseFloat(operatorProfile?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 space-y-10">
            <div className="bg-[#111926] p-12 rounded-[3rem] border border-white/5 space-y-8 shadow-2xl">
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic tracking-widest">Target Terminal</label>
                  <select className="w-full bg-[#0b0f1a] p-6 rounded-2xl border border-white/10 text-sm font-bold text-white appearance-none" value={targetId} onChange={e => setTargetId(e.target.value)}>
                    <option value="">Select Node...</option>
                    {cashiers.map(c => <option key={c.id} value={c.id}>{c.username} (KES {parseFloat(c.balance).toLocaleString()})</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic tracking-widest">Amount (KES)</label>
                  <input type="number" className="w-full bg-[#0b0f1a] p-8 rounded-2xl border border-white/10 text-4xl font-black text-[#10b981] outline-none" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
              </div>
              <button onClick={handleTransfer} disabled={isProcessing || !targetId || !amount} className="w-full bg-[#10b981] text-black font-black py-7 rounded-2xl hover:bg-white transition-all italic text-xs uppercase tracking-[0.3em] shadow-2xl disabled:opacity-20">
                {isProcessing ? 'Verifying...' : 'Execute Asset Transfer'}
              </button>
            </div>

            <div className="bg-[#111926] p-10 rounded-[3rem] border border-white/5 space-y-6 shadow-2xl">
              <h2 className="font-black uppercase text-[10px] italic tracking-widest text-slate-500 flex items-center gap-2"><History size={14} /> Recent Distributions</h2>
              <div className="space-y-4">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex justify-between items-center p-5 bg-[#0b0f1a] rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-[#10b981]/5 rounded-xl text-[#10b981]"><ArrowDownRight size={16} /></div>
                      <div>
                        <p className="text-xs font-black uppercase italic text-white">{tx.receiver?.username || 'Terminal'}</p>
                        <p className="text-[8px] text-slate-600 font-bold uppercase mt-1 italic flex items-center gap-1"><Clock size={8} /> {new Date(tx.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <span className="text-sm font-black italic text-[#10b981]">KES {parseFloat(tx.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            {selectedCashier ? (
              <div className="bg-gradient-to-br from-[#1c2636] to-[#111926] p-12 rounded-[3.5rem] border border-[#10b981]/20 space-y-10 shadow-2xl">
                <div className="space-y-2 text-center">
                  <p className="text-[10px] text-slate-500 font-black uppercase italic tracking-widest">Dispatch Target</p>
                  <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter">{selectedCashier.username}</h3>
                </div>
                <div className="space-y-6 pt-10 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase italic">Resulting Balance</span>
                    <span className="text-white text-2xl font-black italic">KES {(parseFloat(selectedCashier.balance || 0) + (parseFloat(amount) || 0)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-6 rounded-2xl">
                    <span className="text-[10px] font-black text-slate-500 uppercase italic">Hub Impact</span>
                    <span className="text-[#10b981] text-2xl font-black italic">- KES {(parseFloat(amount) || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[400px] border-2 border-dashed border-white/5 rounded-[3.5rem] flex items-center justify-center text-slate-700 font-black uppercase italic text-[10px] tracking-widest text-center px-10">Select terminal to analyze impact</div>
            )}
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}
