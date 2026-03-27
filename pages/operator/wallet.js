import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { Wallet, Send, Users, ArrowDownRight, Info } from 'lucide-react';

export default function ShopWallet() {
  const [amount, setAmount] = useState('');
  const [targetId, setTargetId] = useState('');
  const [cashiers, setCashiers] = useState([]);
  const [operatorProfile, setOperatorProfile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Fetch Operator's specific Cashiers
  const fetchOperatorData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Get Operator's own balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setOperatorProfile(profile);

      // Get Cashiers managed by this Operator
      const { data: managedCashiers } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'cashier')
        .eq('parent_id', user.id) // Only shows cashiers registered by THIS operator
        .order('username', { ascending: true });
      
      setCashiers(managedCashiers || []);
    }
  };

  useEffect(() => {
    fetchOperatorData();
  }, []);

  const handleTransfer = async () => {
    if (!targetId || !amount || parseFloat(amount) <= 0) {
      alert("Invalid transfer details.");
      return;
    }

    if (parseFloat(amount) > operatorProfile.balance) {
      alert("Insufficient Master Float!");
      return;
    }

    setIsProcessing(true);
    
    // Using the 'transfer_credits' RPC we created earlier
    const { error } = await supabase.rpc('transfer_credits', {
      sender_id: operatorProfile.id,
      receiver_id: targetId,
      amount_to_transfer: parseFloat(amount)
    });

    if (error) {
      alert("Transfer Error: " + error.message);
    } else {
      alert("Float Transferred Successfully!");
      setAmount('');
      fetchOperatorData(); // Refresh balances
    }
    setIsProcessing(false);
  };

  const selectedCashier = cashiers.find(c => c.id === targetId);

  return (
    <AdminLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Shop Distribution</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 italic">Allocate Liquidity to Cashier Terminals</p>
          </div>
          
          <div className="bg-[#1c2636] p-6 rounded-3xl border border-white/5 min-w-[280px]">
            <p className="text-[9px] text-[#10b981] font-black uppercase italic mb-1">Your Master Float</p>
            <h2 className="text-3xl font-black text-white italic tracking-tighter">
              KES {operatorProfile?.balance?.toLocaleString() || '0.00'}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Transfer Form */}
          <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <Users size={18} className="text-[#10b981]" />
              <h2 className="font-black uppercase text-xs italic tracking-widest text-white">Select Destination</h2>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Active Cashier Terminal</label>
              <select 
                className="w-full bg-[#0b0f1a] p-4 rounded-2xl border border-white/5 focus:border-[#10b981] outline-none text-sm font-bold uppercase text-white appearance-none cursor-pointer"
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
              >
                <option value="">Select a cashier...</option>
                {cashiers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.username} (Current: KES {parseFloat(c.balance).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Amount to Dispatch (KES)</label>
              <input 
                type="number"
                className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 focus:border-[#10b981] outline-none text-xl font-black text-[#f59e0b] transition-all"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            <button 
              onClick={handleTransfer}
              disabled={isProcessing || !targetId || !amount}
              className="w-full bg-[#10b981] text-black font-black py-5 rounded-2xl hover:bg-white transition-all active:scale-95 italic text-sm uppercase tracking-widest shadow-xl shadow-[#10b981]/10"
            >
              {isProcessing ? 'AUTHORIZING DISPATCH...' : 'CONFIRM FLOAT TRANSFER'}
            </button>
          </div>

          {/* Preview Panel */}
          <div className="flex flex-col justify-center">
            {targetId ? (
              <div className="bg-[#1c2636]/50 p-10 rounded-[2.5rem] border border-white/5 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Recipient Terminal</p>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                      {selectedCashier?.username}
                    </h3>
                  </div>
                  <div className="w-12 h-12 bg-[#10b981]/10 rounded-xl flex items-center justify-center text-[#10b981]">
                    <ArrowDownRight size={24} />
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase">New Cashier Balance</span>
                    <span className="text-white font-black italic">
                      KES {(parseFloat(selectedCashier?.balance || 0) + (parseFloat(amount) || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Remaining Float</span>
                    <span className="text-[#10b981] font-black italic">
                      KES {(parseFloat(operatorProfile?.balance || 0) - (parseFloat(amount) || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-500/10 p-4 rounded-xl flex gap-3 border border-blue-500/20">
                    <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-blue-400 font-bold uppercase leading-relaxed">
                        Notice: This transaction is permanent and cannot be reversed by the operator. Contact Super Admin for corrections.
                    </p>
                </div>
              </div>
            ) : (
              <div className="h-full border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-12 opacity-20">
                <Wallet size={64} className="text-slate-500 mb-4" />
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Select Target to Preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
