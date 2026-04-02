import { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout, { AdminContext } from '../../components/admin/AdminLayout';
import { Wallet, Send, ArrowUpRight, UserCheck, ShieldCheck, Zap, History } from 'lucide-react';

export default function MasterFunding() {
  const { profile: adminProfile } = useContext(AdminContext);
  const [accounts, setAccounts] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchTargets = async () => {
    if (!adminProfile?.id) return;

    try {
      // THE FIX: We strictly match the hierarchy from your JSON
      let query = supabase.from('profiles').select('id, username, balance, role, parent_id');

      if (adminProfile.role === 'super_admin') {
        // Super Admin funds Operators (e.g., TESTSHOP, TESTSHOPS)
        query = query.eq('role', 'operator');
      } else if (adminProfile.role === 'operator') {
        // Operators fund their specific Cashiers (e.g., k, brayo)
        query = query.eq('role', 'cashier').eq('parent_id', adminProfile.id);
      } else {
        // Cashiers shouldn't see anyone
        setAccounts([]);
        return;
      }

      const { data, error } = await query.order('username', { ascending: true });
      if (error) throw error;
      
      setAccounts(data || []);
    } catch (err) {
      console.error("Treasury Sync Error:", err.message);
    }
  };

  useEffect(() => {
    fetchTargets();

    // Live refresh when balances move
    const sub = supabase.channel('funding-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => fetchTargets())
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [adminProfile]);

  const handleDispatch = async () => {
    const numAmount = parseFloat(amount);
    if (!selectedId || !numAmount || numAmount <= 0) return;

    setIsProcessing(true);
    
    // Using your exact RPC definition: sender_id, receiver_id, amount_to_transfer
    const { error } = await supabase.rpc('transfer_credits', {
      sender_id: adminProfile.id,
      receiver_id: selectedId,
      amount_to_transfer: numAmount
    });

    if (error) {
      alert("Protocol Error: " + error.message);
    } else {
      setAmount('');
      setSelectedId('');
      alert(`SUCCESS: KES ${numAmount.toLocaleString()} transferred.`);
    }
    setIsProcessing(false);
  };

  const selectedRecipient = accounts.find(c => c.id === selectedId);

  if (!adminProfile) return <AdminLayout><div className="h-screen bg-[#0b0f1a]" /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* HEADER */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-[#10b981]" size={20} />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">
                Authorized Node: {adminProfile.username}
              </span>
            </div>
            <h1 className="text-5xl font-black uppercase tracking-tighter italic">Treasury</h1>
          </div>

          <div className="bg-[#111926] border border-white/5 p-8 rounded-[2.5rem] min-w-[350px] shadow-2xl relative overflow-hidden">
              <p className="text-[10px] text-[#10b981] font-black uppercase italic mb-2 tracking-widest relative z-10">Total Liquidity Pool</p>
              <h2 className="text-4xl font-black text-white italic tracking-tighter relative z-10">
                KES {Number(adminProfile.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* DISPATCH FORM */}
          <div className="bg-[#111926] p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
            <div className="flex items-center gap-3 border-b border-white/5 pb-6">
              <Send size={18} className="text-[#10b981]" />
              <h2 className="font-black uppercase text-xs italic tracking-widest">Injection Protocol</h2>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] text-slate-500 font-black uppercase ml-2 tracking-widest italic">Target Node</label>
              <select 
                className="w-full bg-[#0b0f1a] border border-white/10 p-5 rounded-2xl text-sm font-bold uppercase text-white outline-none focus:border-[#10b981] transition-all"
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
              >
                <option value="">Select Recipient...</option>
                {accounts.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#111926]">
                    {c.username.toUpperCase()} — KES {Number(c.balance).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] text-slate-500 font-black uppercase ml-2 tracking-widest italic">Amount (KES)</label>
              <input 
                type="number" 
                className="w-full bg-[#0b0f1a] border border-white/10 p-6 rounded-2xl text-[#10b981] font-black text-3xl outline-none focus:border-[#10b981]"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            <button 
              onClick={handleDispatch}
              disabled={isProcessing || !amount || !selectedId}
              className="w-full bg-[#10b981] hover:bg-white text-black font-black py-6 rounded-2xl flex items-center justify-center gap-4 transition-all disabled:opacity-10 uppercase italic text-sm tracking-widest"
            >
              {isProcessing ? 'Processing...' : 'Transfer KES'}
            </button>
          </div>

          {/* PREVIEW */}
          <div className="flex flex-col justify-center">
            {selectedId ? (
              <div className="bg-[#1c2636]/30 p-12 rounded-[3rem] border border-[#10b981]/20 space-y-8 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-[#10b981]/10 rounded-2xl flex items-center justify-center text-[#10b981]">
                    <UserCheck size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                      {selectedRecipient?.username}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                      {selectedRecipient?.role} Node Confirmed
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4 pt-6 border-t border-white/5">
                  <div className="flex justify-between items-center bg-[#0b0f1a] p-4 rounded-xl border border-white/5">
                     <span className="text-[9px] font-black uppercase text-slate-500 italic tracking-widest">Current Balance</span>
                     <span className="text-white font-bold italic">KES {Number(selectedRecipient?.balance).toLocaleString()}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[10px] text-[#10b981] font-black uppercase italic ml-1">New Projection</p>
                    <div className="flex justify-between items-center bg-[#10b981]/5 p-6 rounded-2xl border border-[#10b981]/10">
                       <p className="text-3xl font-black text-white tracking-tighter italic">
                          KES {(parseFloat(selectedRecipient?.balance || 0) + (parseFloat(amount) || 0)).toLocaleString()}
                       </p>
                       <ArrowUpRight className="text-[#10b981]" size={32} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-center p-20 opacity-20">
                <Zap className="mb-4 text-slate-500" size={48} />
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] italic leading-tight">
                  No target node selected.<br/>Select a recipient to begin transfer.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
