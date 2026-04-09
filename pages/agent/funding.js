import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AgentLayout from '../../components/agent/AgentLayout';
import { Send, Loader2, Database, Zap, Wallet, ArrowDownRight } from 'lucide-react';

export default function AgentFunding() {
  const [amount, setAmount] = useState('');
  const [targetId, setTargetId] = useState('');
  const [shops, setShops] = useState([]); // Changed from cashiers to shops
  const [profile, setProfile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch Agent Profile
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    // Fetch specifically the SHOPS under this Agent
    const { data: s } = await supabase.from('profiles')
      .select('*')
      .eq('parent_id', user.id)
      .eq('role', 'shop')
      .order('username', { ascending: true });

    setProfile(p);
    setShops(s || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDispatch = async () => {
    const val = Math.trunc(Number(amount));
    if (!targetId || val <= 0) return;
    if (val > (profile?.balance || 0)) {
        alert("INSUFFICIENT FLOAT: Request more from your Operator.");
        return;
    }

    setIsProcessing(true);
    try {
      // Executes the RPC transfer we fixed earlier
      const { error } = await supabase.rpc('process_transfer', {
        p_sender_id: profile.id,
        p_receiver_id: targetId,
        p_amount: val
      });
      
      if (error) throw error;
      
      setAmount('');
      setTargetId('');
      // Non-intrusive alert logic could go here, but using alert for now
      alert("LIQUIDITY DISPATCHED TO SHOP NODE");
    } catch (err) {
      alert(`NETWORK ERROR: ${err.message}`);
    } finally {
      setIsProcessing(false);
      fetchData();
    }
  };

  return (
    <AgentLayout profile={profile}>
      <div className="p-8 max-w-5xl mx-auto space-y-12 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* INFRASTRUCTURE HEADER */}
        <header className="flex justify-between items-end border-b border-white/5 pb-12">
          <div>
            <div className="flex items-center gap-2 text-blue-500 font-black uppercase text-[10px] italic mb-1 tracking-[0.3em]">
              <Database size={14} /> Capital Flow Control
            </div>
            <h1 className="text-7xl font-black uppercase italic tracking-tighter leading-none">Dispatch</h1>
            <p className="text-slate-500 font-bold uppercase text-xs mt-4 tracking-widest">Rebalance shop liquidity nodes</p>
          </div>
          
          <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 text-right min-w-[300px] shadow-2xl">
             <span className="text-[10px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Available Float</span>
             <span className="text-5xl font-black text-[#10b981] italic tracking-tighter">
               KES {parseFloat(profile?.balance || 0).toLocaleString()}
             </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* INPUT FORM (Left Side) */}
          <div className="lg:col-span-3 bg-[#111926] p-10 rounded-[3.5rem] border border-white/5 shadow-2xl space-y-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase italic ml-4 tracking-[0.2em] flex items-center gap-2">
                <ArrowDownRight size={12} className="text-blue-500" /> Destination Shop Node
              </label>
              <select 
                className="w-full bg-[#0b0f1a] p-7 rounded-[2rem] border border-white/10 text-white font-black text-lg outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
              >
                <option value="">SELECT TARGET BRANCH...</option>
                {shops.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.username.toUpperCase()} — {s.display_name?.toUpperCase() || 'LUCRA BRANCH'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase italic ml-4 tracking-[0.2em] flex items-center gap-2">
                <Zap size={12} className="text-yellow-500" /> Injection Amount (KES)
              </label>
              <div className="relative">
                <span className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-700 font-black text-4xl italic">KES</span>
                <input 
                  type="number"
                  placeholder="0.00"
                  className="w-full bg-[#0b0f1a] p-10 pl-28 rounded-[2rem] border border-white/10 text-6xl font-black text-blue-500 outline-none focus:border-blue-500/50 transition-all placeholder:text-white/5"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
            </div>

            <button 
              onClick={handleDispatch}
              disabled={isProcessing || !targetId || !amount}
              className="w-full bg-blue-600 text-white font-black py-8 rounded-[2rem] hover:bg-white hover:text-black transition-all italic text-sm uppercase tracking-[0.4em] flex items-center justify-center gap-4 shadow-[0_0_30px_rgba(37,99,235,0.3)] disabled:opacity-20 disabled:grayscale"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <Send size={20} />}
              {isProcessing ? 'SYNCHRONIZING LEDGER...' : 'AUTHORIZE DISPATCH'}
            </button>
          </div>

          {/* TARGET INFO CARD (Right Side) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-blue-600/5 border border-blue-500/20 p-8 rounded-[3rem] h-full flex flex-col justify-center">
                <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">Target Diagnostics</h3>
                {targetId ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        <div>
                            <span className="text-slate-500 text-[9px] uppercase font-black block">Branch Name</span>
                            <span className="text-2xl font-black italic">{shops.find(s => s.id === targetId)?.display_name}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 text-[9px] uppercase font-black block">Current Node Balance</span>
                            <span className="text-3xl font-black italic text-white">
                                KES {parseFloat(shops.find(s => s.id === targetId)?.balance || 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="pt-6 border-t border-white/5">
                             <div className="flex items-center gap-2 text-[#10b981] font-black text-[9px] uppercase tracking-widest">
                                <ShieldCheck size={12} /> Ready for injection
                             </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <Wallet size={40} className="mx-auto text-white/5 mb-4" />
                        <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest">No target node selected</p>
                    </div>
                )}
            </div>
          </div>

        </div>
      </div>
    </AgentLayout>
  );
}

function ShieldCheck({ size }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
    );
}
