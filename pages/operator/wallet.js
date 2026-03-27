import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { Wallet, Users, ArrowDownRight, Info, Send } from 'lucide-react';
import { LayoutDashboard, Send } from 'lucide-react';

export default function ShopWallet() {
  const [amount, setAmount] = useState('');
  const [targetId, setTargetId] = useState('');
  const [cashiers, setCashiers] = useState([]);
  const [operatorProfile, setOperatorProfile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Fetch Operator's specific Cashiers and Balance
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

      // Get Cashiers managed by this Operator (Parent Link)
      const { data: managedCashiers } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'cashier')
        .eq('parent_id', user.id) 
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

    if (parseFloat(amount) > (operatorProfile?.balance || 0)) {
      alert("Insufficient Master Float!");
      return;
    }

    setIsProcessing(true);
    
    // Execute the 'transfer_credits' RPC function
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
      setTargetId('');
      fetchOperatorData(); // Refresh balances for UI
    }
    setIsProcessing(false);
  };

  const selectedCashier = cashiers.find(c => c.id === targetId);

  return (
    <ProtectedRoute allowedRoles={['operator']}>
      <AdminLayout>
        <div className="p-8 max-w-6xl mx-auto space-y-8 bg-[#0b0f1a] min-h-screen text-white font-sans">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="flex flex-col">
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Shop Distribution</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 italic">Allocate Liquidity to Cashier Terminals</p>
            </div>
            
            <div className="bg-[#111926] p-6 rounded-3xl border border-white/5 min-w-[300px] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#10b981]/10 rounded-full -mr-12 -mt-12 blur-2xl" />
              <p className="text-[9px] text-[#10b981] font-black uppercase italic mb-1 tracking-widest relative z-10">Your Master Float</p>
              <h2 className="text-3xl font-black text-white italic tracking-tighter relative z-10">
                KES {operatorProfile?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Transfer Form */}
            <div className="bg-[#111926] p-10 rounded-[2.5rem] border border-white/5 space-y-8 shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#10b981]/10 rounded-xl text-[#10b981]">
                  <Send size={18} />
                </div>
                <h2 className="font-black uppercase text-xs italic tracking-widest text-white">Dispatch Protocol</h2>
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic tracking-widest">Active Cashier Terminal</label>
                <div className="relative">
                  <select 
                    className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 focus:border-[#10b981] outline-none text-sm font-bold uppercase text-white appearance-none cursor-pointer transition-all"
                    value={targetId}
                    onChange={e => setTargetId(e.target.value)}
                  >
                    <option value="">Select a destination...</option>
                    {cashiers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.username} (Bal: KES {parseFloat(c.balance).toLocaleString()})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                     <Users size={16} />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic tracking-widest">Amount to Dispatch (KES)</label>
                <input 
                  type="number"
                  className="w-full bg-[#0b0f1a] p-6 rounded-2xl border border-white/5 focus:border-[#10b981] outline-none text-2xl font-black text-[#10b981] transition-all placeholder:text-slate-800"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>

              <button 
                onClick={handleTransfer}
                disabled={isProcessing || !targetId || !amount}
                className="w-full bg-[#10b981] text-black font-black py-6 rounded-2xl hover:bg-white transition-all active:scale-95 italic text-sm uppercase tracking-widest shadow-xl shadow-[#10b981]/10 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed"
              >
                {isProcessing ? 'AUTHORIZING DISPATCH...' : 'CONFIRM FLOAT TRANSFER'}
              </button>
            </div>

            {/* Preview Panel */}
            <div className="flex flex-col justify-center">
              {targetId ? (
                <div className="bg-[#1c2636]/30 p-10 rounded-[2.5rem] border border-[#10b981]/10 space-y-8 animate-in fade-in slide-in-from-right-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase mb-1 tracking-widest">Recipient Identity</p>
                      <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                        {selectedCashier?.username}
                      </h3>
                    </div>
                    <div className="w-14 h-14 bg-[#10b981]/10 rounded-2xl flex items-center justify-center text-[#10b981] border border-[#10b981]/20">
                      <ArrowDownRight size={28} />
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/5 space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">New Terminal Balance</span>
                      <span className="text-white text-xl font-black italic">
                        KES {(parseFloat(selectedCashier?.balance || 0) + (parseFloat(amount) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Remaining Master Float</span>
                      <span className="text-[#10b981] text-xl font-black italic">
                        KES {(parseFloat(operatorProfile?.balance || 0) - (parseFloat(amount) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="bg-emerald-500/5 p-5 rounded-2xl flex gap-4 border border-emerald-500/10">
                      <Info size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-emerald-500/80 font-bold uppercase leading-relaxed italic">
                        Protocol Note: Dispatch operations are audited in real-time. Please verify terminal identity before confirming the transfer.
                      </p>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[400px] border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-12 space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-slate-600">
                    <Wallet size={32} />
                  </div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] italic">Awaiting Destination Input</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
