import { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout, { AdminContext } from '../../components/admin/AdminLayout';
import { 
  Wallet, 
  Send, 
  ArrowUpRight, 
  UserCheck, 
  ShieldCheck, 
  Zap, 
  History 
} from 'lucide-react';

export default function MasterFunding() {
  // 1. LIVE DATA FROM CONTEXT (Ensures balance in header is always realtime)
  const { profile: adminProfile } = useContext(AdminContext);
  
  const [accounts, setAccounts] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 2. FETCH TARGET ACCOUNTS (Hierarchy Aware)
  const fetchTargets = async () => {
    if (!adminProfile) return;

    let query = supabase.from('profiles').select('*');
    
    // Super Admin funds Operators | Operators fund their own Cashiers
    if (['admin', 'super_admin'].includes(adminProfile.role)) {
      query = query.eq('role', 'operator');
    } else {
      query = query.eq('parent_id', adminProfile.id).eq('role', 'cashier');
    }
    
    const { data: targets } = await query.order('username', { ascending: true });
    setAccounts(targets || []);
  };

  useEffect(() => {
    fetchTargets();

    // 3. REALTIME TARGET SYNC: Update balances in dropdown live
    const targetSub = supabase
      .channel('funding-targets-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        fetchTargets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(targetSub);
    };
  }, [adminProfile]);

  const handleDispatch = async () => {
    const numAmount = parseFloat(amount);
    
    if (!selectedId || !numAmount || numAmount <= 0) {
      alert("Verification Failed: Select a target and valid KES amount.");
      return;
    }

    if (numAmount > (adminProfile?.balance || 0)) {
      alert("Treasury Exhausted: Insufficient master liquidity!");
      return;
    }

    setIsProcessing(true);
    
    // EXECUTE ATOMIC TRANSACTION (Postgres RPC)
    const { error } = await supabase.rpc('transfer_credits', {
      sender_id: adminProfile.id,
      receiver_id: selectedId,
      amount_to_transfer: numAmount
    });

    if (error) {
      alert("Dispatch Protocol Error: " + error.message);
    } else {
      // NOTE: We don't need to manually update adminProfile balance here
      // our AdminLayout context will catch the DB update and refresh it live!
      setAmount('');
      setSelectedId('');
      alert(`SUCCESS: KES ${numAmount.toLocaleString()} injected into network.`);
    }
    setIsProcessing(false);
  };

  const selectedRecipient = accounts.find(c => c.id === selectedId);

  // Vercel Build/Loading Safety
  if (!adminProfile) return <AdminLayout><div className="h-screen bg-[#0b0f1a]" /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* HEADER & MASTER BALANCE */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-[#10b981]" size={20} />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">
                Authority: {adminProfile?.role?.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-5xl font-black uppercase tracking-tighter italic">Master Treasury</h1>
          </div>

          <div className="bg-[#111926] border border-white/5 p-8 rounded-[2.5rem] min-w-[350px] shadow-2xl relative overflow-hidden group transition-all hover:border-[#10b981]/20">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Zap size={100} />
             </div>
             <p className="text-[10px] text-[#10b981] font-black uppercase italic mb-2 tracking-widest relative z-10">Available Liquidity Pool</p>
             <h2 className="text-4xl font-black text-white italic tracking-tighter relative z-10 leading-none">
                KES {adminProfile?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
             </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Dispatch Form */}
          <div className="bg-[#111926] p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-8 relative overflow-hidden">
            <div className="flex items-center gap-3 border-b border-white/5 pb-6">
              <div className="p-2 bg-[#10b981]/10 rounded-xl text-[#10b981]">
                <Send size={18} />
              </div>
              <h2 className="font-black uppercase text-xs italic tracking-widest">Injection Protocol</h2>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] text-slate-500 font-black uppercase ml-2 tracking-widest italic">Target Entity</label>
              <select 
                className="w-full bg-[#0b0f1a] border border-white/5 p-5 rounded-2xl text-sm font-bold uppercase text-white outline-none focus:border-[#10b981] transition-all appearance-none cursor-pointer"
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
              >
                <option value="">Select recipient...</option>
                {accounts.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#111926]">
                    {c.username} — KES {parseFloat(c.balance).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] text-slate-500 font-black uppercase ml-2 tracking-widest italic">Funding Amount (KES)</label>
              <div className="relative">
                <input 
                  type="number" 
                  className="w-full bg-[#0b0f1a] border border-white/5 p-6 rounded-2xl text-[#10b981] font-black text-3xl outline-none focus:border-[#10b981] transition-all placeholder:text-slate-900"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-500 font-black">KES</span>
                </div>
              </div>
            </div>

            <button 
              onClick={handleDispatch}
              disabled={isProcessing || !amount || !selectedId}
              className="w-full bg-[#10b981] hover:bg-white text-black font-black py-6 rounded-2xl flex items-center justify-center gap-4 transition-all active:scale-[0.97] disabled:opacity-20 shadow-xl shadow-[#10b981]/10 uppercase italic text-sm tracking-widest"
            >
              {isProcessing ? 'AUTHORIZING DISPATCH...' : 'EXECUTE MASTER FUNDING'}
            </button>
          </div>

          {/* Preview Panel */}
          <div className="flex flex-col justify-center min-h-[500px]">
            {selectedId ? (
              <div className="bg-[#1c2636]/30 p-12 rounded-[3rem] border border-[#10b981]/10 space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-[#10b981]/10 rounded-[2.2rem] flex items-center justify-center text-[#10b981] border border-[#10b981]/20">
                    <UserCheck size={40} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Recipient Identity</p>
                    <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">
                      {selectedRecipient?.username}
                    </h3>
                    <div className="mt-2 inline-flex items-center px-3 py-1 bg-[#10b981]/10 rounded-lg border border-[#10b981]/20">
                      <span className="text-[9px] text-[#10b981] font-black uppercase tracking-widest">
                        {selectedRecipient?.role?.replace('_', ' ')} Verified
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6 pt-10 border-t border-white/5">
                  <div className="flex justify-between items-center bg-[#0b0f1a] p-4 rounded-xl border border-white/5">
                     <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Current Pool</span>
                     <span className="text-white font-black italic">KES {parseFloat(selectedRecipient?.balance || 0).toLocaleString()}</span>
                  </div>
                  
                  <div className="space-y-2">
                      <p className="text-[10px] text-[#10b981] font-black uppercase italic tracking-widest ml-1">Projected Balance</p>
                      <div className="flex justify-between items-end bg-[#10b981]/5 p-6 rounded-2xl border border-[#10b981]/10">
                        <p className="text-4xl font-black text-white tracking-tighter italic">
                          KES {(parseFloat(selectedRecipient?.balance || 0) + (parseFloat(amount) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <ArrowUpRight className="text-[#10b981] mb-2" size={40} />
                      </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                     <History size={16} className="text-blue-500 shrink-0" />
                     <p className="text-[9px] text-blue-400/80 font-bold uppercase italic leading-relaxed">
                       Ledger Notice: This transaction is final and visible to all parent network nodes.
                     </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-center p-12 opacity-20 space-y-6">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-slate-600">
                  <Zap size={40} />
                </div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em] italic">Awaiting Treasury Target Selection</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
