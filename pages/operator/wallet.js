import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { 
  Wallet, 
  Users, 
  ArrowDownRight, 
  Info, 
  Send,
  History,
  Clock
} from 'lucide-react';

export default function ShopWallet() {
  const [amount, setAmount] = useState('');
  const [targetId, setTargetId] = useState('');
  const [cashiers, setCashiers] = useState([]);
  const [operatorProfile, setOperatorProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Fetch Data with Audit Logs
  const fetchOperatorData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Get Operator's own balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setOperatorProfile(profile);

      // Get Managed Cashiers
      const { data: managedCashiers } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'cashier')
        .eq('parent_id', user.id) 
        .order('username', { ascending: true });
      
      setCashiers(managedCashiers || []);

      // Get Last 5 Transfers (Audit Trail)
      const { data: logs } = await supabase
        .from('transactions')
        .select('*, profiles!transactions_receiver_id_fkey(username)')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setTransactions(logs || []);
    }
  }, []);

  useEffect(() => {
    fetchOperatorData();

    // LIVE SYNC: Update UI if Admin funds this Operator while page is open
    const channel = supabase
      .channel('wallet-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        fetchOperatorData();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchOperatorData]);

  const handleTransfer = async () => {
    if (!targetId || !amount || parseFloat(amount) <= 0) return;

    if (parseFloat(amount) > (operatorProfile?.balance || 0)) {
      alert("CRITICAL: Insufficient Float in Master Node!");
      return;
    }

    setIsProcessing(true);
    
    const { error } = await supabase.rpc('transfer_credits', {
      sender_id: operatorProfile.id,
      receiver_id: targetId,
      amount_to_transfer: parseFloat(amount)
    });

    if (error) {
      alert("Transfer Protocol Failed: " + error.message);
    } else {
      setAmount('');
      setTargetId('');
      await fetchOperatorData();
    }
    setIsProcessing(false);
  };

  const selectedCashier = cashiers.find(c => c.id === targetId);

  return (
    <OperatorLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-12 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-10">
          <div className="space-y-1">
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">Liquidity <span className="text-slate-700">Hub</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-1 italic">Authorized Asset Distribution</p>
          </div>
          
          <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 min-w-[350px] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#10b981]/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-[#10b981]/20 transition-all" />
            <p className="text-[9px] text-slate-500 font-black uppercase italic mb-2 tracking-widest relative z-10">Vault Status: <span className="text-[#10b981]">Online</span></p>
            <h2 className="text-4xl font-black text-white italic tracking-tighter relative z-10">
              KES {operatorProfile?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Dispatch UI */}
          <div className="lg:col-span-7 space-y-10">
            <div className="bg-[#111926] p-12 rounded-[3rem] border border-white/5 space-y-8 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#10b981]/10 rounded-xl flex items-center justify-center text-[#10b981] border border-[#10b981]/20 shadow-lg shadow-[#10b981]/5">
                  <Send size={20} />
                </div>
                <h2 className="font-black uppercase text-xs italic tracking-widest text-white">Initialize Dispatch Protocol</h2>
              </div>

              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic tracking-[0.2em]">Target Terminal Node</label>
                  <select 
                    className="w-full bg-[#0b0f1a] p-6 rounded-2xl border border-white/10 focus:border-[#10b981] outline-none text-sm font-bold uppercase text-white appearance-none cursor-pointer transition-all"
                    value={targetId}
                    onChange={e => setTargetId(e.target.value)}
                  >
                    <option value="">Select Terminal...</option>
                    {cashiers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.username} — Current Float: KES {parseFloat(c.balance).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic tracking-[0.2em]">Asset Volume (KES)</label>
                  <input 
                    type="number"
                    className="w-full bg-[#0b0f1a] p-8 rounded-2xl border border-white/10 focus:border-[#10b981] outline-none text-4xl font-black text-[#10b981] transition-all placeholder:text-white/5"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>
              </div>

              <button 
                onClick={handleTransfer}
                disabled={isProcessing || !targetId || !amount}
                className="w-full bg-[#10b981] text-black font-black py-7 rounded-2xl hover:bg-white transition-all active:scale-[0.98] italic text-xs uppercase tracking-[0.3em] shadow-2xl shadow-[#10b981]/10 disabled:opacity-10"
              >
                {isProcessing ? 'Verifying Credentials...' : 'Execute Asset Transfer'}
              </button>
            </div>

            {/* Transaction Ledger */}
            <div className="bg-[#111926] p-10 rounded-[3rem] border border-white/5 space-y-6 shadow-2xl">
              <div className="flex items-center gap-3">
                <History size={16} className="text-slate-600" />
                <h2 className="font-black uppercase text-[10px] italic tracking-widest text-slate-500">Recent Distribution History</h2>
              </div>
              <div className="space-y-4">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex justify-between items-center p-5 bg-[#0b0f1a] rounded-2xl border border-white/5 group hover:border-[#10b981]/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-[#10b981]/5 rounded-xl text-[#10b981]">
                        <ArrowDownRight size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase italic text-white">{tx.profiles?.username || 'System Node'}</p>
                        <p className="text-[8px] text-slate-600 font-bold uppercase mt-1 italic flex items-center gap-1">
                          <Clock size={8} /> {new Date(tx.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-black italic text-[#10b981]">KES {tx.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preview / Impact Analysis */}
          <div className="lg:col-span-5">
            <div className="sticky top-8 space-y-6">
              {targetId ? (
                <div className="bg-gradient-to-br from-[#1c2636] to-[#111926] p-12 rounded-[3.5rem] border border-[#10b981]/20 space-y-10 shadow-2xl animate-in zoom-in-95">
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest text-center italic">Dispatch Target</p>
                    <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter text-center">
                      {selectedCashier?.username}
                    </h3>
                  </div>

                  <div className="space-y-6 pt-10 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Terminal Result</span>
                      <span className="text-white text-2xl font-black italic">
                        KES {(parseFloat(selectedCashier?.balance || 0) + (parseFloat(amount) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-6 rounded-2xl">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Hub Impact</span>
                      <span className="text-[#10b981] text-2xl font-black italic">
                        - KES {(parseFloat(amount) || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="bg-emerald-500/5 p-6 rounded-3xl flex gap-4 border border-emerald-500/10">
                      <Info size={20} className="text-[#10b981] shrink-0 mt-1" />
                      <p className="text-[11px] text-[#10b981]/80 font-bold uppercase leading-relaxed italic tracking-tight">
                        Warning: This operation is irreversible once authorized. The receiving node will be credited immediately.
                      </p>
                  </div>
                </div>
              ) : (
                <div className="h-[500px] bg-[#111926] border-2 border-dashed border-white/5 rounded-[3.5rem] flex flex-col items-center justify-center text-center p-16 space-y-6 opacity-40">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-slate-700 animate-pulse">
                    <Wallet size={40} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-white font-black uppercase text-xs tracking-[0.5em] italic">System Idle</p>
                    <p className="text-[10px] text-slate-600 font-bold uppercase italic max-w-[200px] leading-relaxed">
                      Select a terminal node to generate dispatch impact analysis
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}
