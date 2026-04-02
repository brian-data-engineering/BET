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
  const { profile: adminProfile } = useContext(AdminContext);
  
  const [accounts, setAccounts] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // FETCH TARGETS - Logic fix for blank dropdown
  const fetchTargets = async () => {
    if (!adminProfile?.id) return;

    try {
      let query = supabase.from('profiles').select('id, username, balance, role');
      
      // Check role with more flexibility (handles underscore or no underscore)
      const roleStr = (adminProfile.role || '').toLowerCase();
      const isAdmin = roleStr.includes('admin');

      if (isAdmin) {
        // ADMIN sees all Operators to fund them
        query = query.eq('role', 'operator');
      } else {
        // OPERATOR sees only their own Cashiers
        query = query.eq('role', 'cashier').eq('parent_id', adminProfile.id);
      }
      
      const { data: targets, error } = await query.order('username', { ascending: true });
      
      if (error) throw error;
      setAccounts(targets || []);
    } catch (err) {
      console.error("Target Acquisition Failure:", err.message);
    }
  };

  useEffect(() => {
    fetchTargets();

    // REALTIME SYNC - Listen for balance changes
    const targetSub = supabase.channel('funding-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        fetchTargets();
      })
      .subscribe();

    return () => { supabase.removeChannel(targetSub); };
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
    
    // EXECUTE ATOMIC TRANSACTION (Ensure this RPC exists in Supabase)
    const { error } = await supabase.rpc('transfer_credits', {
      sender_id: adminProfile.id,
      receiver_id: selectedId,
      amount_to_transfer: numAmount
    });

    if (error) {
      alert("Dispatch Protocol Error: " + error.message);
    } else {
      setAmount('');
      setSelectedId('');
      alert(`SUCCESS: KES ${numAmount.toLocaleString()} injected into network.`);
    }
    setIsProcessing(false);
  };

  const selectedRecipient = accounts.find(c => c.id === selectedId);

  // LOADING STATE
  if (!adminProfile) return (
    <AdminLayout>
      <div className="h-screen bg-[#0b0f1a] flex items-center justify-center">
        <Zap className="text-[#10b981] animate-pulse" size={48} />
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-[#10b981]" size={20} />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">
                Authorized Node: {adminProfile?.username}
              </span>
            </div>
            <h1 className="text-5xl font-black uppercase tracking-tighter italic">Treasury</h1>
          </div>

          <div className="bg-[#111926] border border-white/5 p-8 rounded-[2.5rem] min-w-[350px] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <Zap size={100} />
              </div>
              <p className="text-[10px] text-[#10b981] font-black uppercase italic mb-2 tracking-widest relative z-10">Your Current Float</p>
              <h2 className="text-4xl font-black text-white italic tracking-tighter relative z-10 leading-none">
                KES {adminProfile?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
              </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* FORM PANEL */}
          <div className="bg-[#111926] p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
            <div className="flex items-center gap-3 border-b border-white/5 pb-6">
              <div className="p-2 bg-[#10b981]/10 rounded-xl text-[#10b981]">
                <Send size={18} />
              </div>
              <h2 className="font-black uppercase text-xs italic tracking-widest">Injection Protocol</h2>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] text-slate-500 font-black uppercase ml-2 tracking-widest italic">Target Account</label>
              <select 
                className="w-full bg-[#0b0f1a] border border-white/10 p-5 rounded-2xl text-sm font-bold uppercase text-white outline-none focus:border-[#10b981] transition-all cursor-pointer"
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
              >
                <option value="">Select Recipient...</option>
                {accounts.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#111926]">
                    {c.username} (Current: KES {Number(c.balance).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] text-slate-500 font-black uppercase ml-2 tracking-widest italic">Amount to Dispatch</label>
              <div className="relative">
                <input 
                  type="number" 
                  className="w-full bg-[#0b0f1a] border border-white/10 p-6 rounded-2xl text-[#10b981] font-black text-3xl outline-none focus:border-[#10b981] transition-all"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
            </div>

            <button 
              onClick={handleDispatch}
              disabled={isProcessing || !amount || !selectedId}
              className="w-full bg-[#10b981] hover:bg-white text-black font-black py-6 rounded-2xl flex items-center justify-center gap-4 transition-all active:scale-[0.97] disabled:opacity-10 uppercase italic text-sm"
            >
              {isProcessing ? 'Processing...' : 'Transfer Credits'}
            </button>
          </div>

          {/* PREVIEW PANEL */}
          <div className="flex flex-col justify-center">
            {selectedId ? (
              <div className="bg-[#1c2636]/30 p-12 rounded-[3rem] border border-[#10b981]/20 space-y-8 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-[#10b981]/10 rounded-[2.2rem] flex items-center justify-center text-[#10b981] border border-[#10b981]/20">
                    <UserCheck size={40} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">
                      {selectedRecipient?.username}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                      Confirmed {selectedRecipient?.role} node
                    </p>
                  </div>
                </div>
                
                <div className="space-y-6 pt-10 border-t border-white/5">
                  <div className="flex justify-between items-center bg-[#0b0f1a] p-4 rounded-xl">
                     <span className="text-[10px] font-black uppercase text-slate-500 italic">Net Projection</span>
                     <span className="text-[#10b981] font-black italic">
                        KES {(parseFloat(selectedRecipient?.balance || 0) + (parseFloat(amount) || 0)).toLocaleString()}
                     </span>
                  </div>
                  
                  <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex items-center gap-3">
                     <History size={16} className="text-blue-500" />
                     <p className="text-[9px] text-blue-400 font-bold uppercase italic">
                       This action is logged in the immutable master ledger.
                     </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-center p-20 opacity-20">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] italic">Select Target Node</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
