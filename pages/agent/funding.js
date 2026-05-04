import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AgentLayout from '../../components/agent/AgentLayout';
import { 
  Send, 
  Loader2, 
  Database, 
  Zap, 
  Wallet, 
  ArrowDownRight, 
  CheckCircle2,
  Store,
  Users
} from 'lucide-react';

export default function AgentFunding() {
  const [amount, setAmount] = useState('');
  const [targetId, setTargetId] = useState('');
  const [nodes, setNodes] = useState([]); 
  const [profile, setProfile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Get Agent Profile to access their tenant_id
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    if (p) {
      setProfile(p);

      // 2. Fetch all Shops and Cashiers within the same Brand (tenant_id)
      // This solves the 'parent_id' issue where agents couldn't see cashiers created by shops.
      const { data: n } = await supabase.from('profiles')
        .select('id, username, display_name, balance, role, parent_id')
        .eq('tenant_id', p.tenant_id) 
        .in('role', ['shop', 'cashier']) 
        .neq('id', user.id) // Don't show the agent themselves
        .order('role', { ascending: false }) // Shops first
        .order('username', { ascending: true });

      setNodes(n || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { 
    fetchData(); 
    
    const channel = supabase.channel(`agent-funding-${profile?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData, profile?.id]);

  const groupedNodes = useMemo(() => {
    return {
      shops: nodes.filter(n => n.role === 'shop'),
      cashiers: nodes.filter(n => n.role === 'cashier')
    };
  }, [nodes]);

  const handleDispatch = async () => {
    const val = Math.trunc(Number(amount));
    if (!targetId || val <= 0) return;
    
    if (val > (profile?.balance || 0)) {
        alert("INSUFFICIENT FLOAT: Request more from your Operator.");
        return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc('process_transfer', {
        p_sender_id: profile.id,
        p_receiver_id: targetId,
        p_amount: val
      });
      
      if (error) throw error;
      
      setShowSuccess(true);
      setAmount('');
      setTargetId('');
      
      setTimeout(() => {
        setShowSuccess(false);
        setIsProcessing(false);
        fetchData();
      }, 2500);

    } catch (err) {
      alert(`NETWORK ERROR: ${err.message}`);
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#0b0f1a] flex flex-col items-center justify-center gap-4">
        <Loader2 className="text-blue-500 animate-spin" size={40} />
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Initialising Agent Treasury...</p>
      </div>
    );
  }

  const selectedNode = nodes.find(n => n.id === targetId);

  return (
    <AgentLayout profile={profile}>
      <div className="p-8 max-w-7xl mx-auto space-y-12 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/5 pb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-500 font-black uppercase text-[10px] italic mb-1 tracking-[0.3em]">
              <Database size={14} /> Capital Flow Control
            </div>
            <h1 className="text-7xl font-black uppercase italic tracking-tighter leading-none">Dispatch</h1>
            <p className="text-slate-500 font-bold uppercase text-xs mt-4 tracking-widest">Inject liquidity into sub-nodes</p>
          </div>
          
          <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 text-right min-w-[300px] shadow-2xl">
             <span className="text-[10px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Agent Available Float</span>
             <span className="text-5xl font-black text-blue-500 italic tracking-tighter">
                KES {parseFloat(profile?.balance || 0).toLocaleString()}
             </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8">
            {showSuccess ? (
              <div className="bg-[#111926] border border-blue-500/30 h-[500px] rounded-[3.5rem] flex flex-col items-center justify-center p-12 text-center animate-in zoom-in duration-300">
                <CheckCircle2 size={100} className="text-[#10b981] mb-6" />
                <h3 className="text-5xl font-black uppercase italic text-white tracking-tighter">DISPATCHED</h3>
                <p className="text-slate-500 font-bold uppercase text-xs mt-4 tracking-widest">Ledger successfully synchronized</p>
              </div>
            ) : (
              <div className="bg-[#111926] p-10 rounded-[3.5rem] border border-white/5 shadow-2xl space-y-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase italic ml-4 tracking-[0.2em] flex items-center gap-2">
                    <ArrowDownRight size={12} className="text-blue-500" /> Destination Node (Shop/Cashier)
                  </label>
                  <select 
                    className="w-full bg-[#0b0f1a] p-7 rounded-[2rem] border border-white/10 text-white font-black text-lg outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                    value={targetId}
                    onChange={e => setTargetId(e.target.value)}
                  >
                    <option value="">SELECT TARGET...</option>
                    
                    {groupedNodes.shops.length > 0 && (
                      <optgroup label="SHOPS / BRANCHES" className="bg-[#111926] text-blue-400">
                        {groupedNodes.shops.map(s => (
                          <option key={s.id} value={s.id} className="text-white">
                            🏠 {s.username.toUpperCase()} — {s.display_name?.toUpperCase() || 'LUCRA BRANCH'}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {groupedNodes.cashiers.length > 0 && (
                      <optgroup label="CASHIERS (ALL BRANCHES)" className="bg-[#111926] text-purple-400">
                        {groupedNodes.cashiers.map(c => (
                          <option key={c.id} value={c.id} className="text-white">
                            👤 {c.username.toUpperCase()}
                          </option>
                        ))}
                      </optgroup>
                    )}
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
                      className="w-full bg-[#0b0f1a] p-10 pl-28 rounded-[2rem] border border-white/10 text-6xl font-black text-blue-500 outline-none focus:border-blue-500/50 transition-all"
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
                  {isProcessing ? 'AUTHORIZING DISPATCH...' : 'AUTHORIZE DISPATCH'}
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-blue-600/5 border border-blue-500/20 p-10 rounded-[3rem] h-full flex flex-col justify-between min-h-[500px]">
                <div>
                  <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-8">Node Diagnostics</h3>
                  {targetId ? (
                      <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                          <div>
                              <span className="text-slate-500 text-[9px] uppercase font-black block mb-1">Node Type</span>
                              <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase italic">
                                {selectedNode?.role === 'shop' ? <Store size={14} /> : <Users size={14} />}
                                {selectedNode?.role}
                              </div>
                          </div>
                          <div>
                              <span className="text-slate-500 text-[9px] uppercase font-black block mb-1">Identifier</span>
                              <span className="text-3xl font-black italic break-all leading-tight">
                                {selectedNode?.username.toUpperCase()}
                              </span>
                          </div>
                          <div>
                              <span className="text-slate-500 text-[9px] uppercase font-black block mb-1">Current Node Balance</span>
                              <span className="text-4xl font-black italic text-white">
                                  KES {parseFloat(selectedNode?.balance || 0).toLocaleString()}
                              </span>
                          </div>
                          <div className="bg-blue-500/10 p-6 rounded-2xl border border-blue-500/10">
                              <span className="text-blue-400 text-[9px] uppercase font-black block mb-1">Projected Total</span>
                              <span className="text-2xl font-black italic">
                                KES {(parseFloat(selectedNode?.balance || 0) + (parseFloat(amount) || 0)).toLocaleString()}
                              </span>
                          </div>
                      </div>
                  ) : (
                      <div className="text-center py-20">
                          <Wallet size={60} className="mx-auto text-white/5 mb-6" />
                          <p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.4em] leading-loose">
                            Select Node<br/>for analysis
                          </p>
                      </div>
                  )}
                </div>

                {targetId && (
                  <div className="pt-6 border-t border-white/5 flex items-center gap-2 text-[#10b981] font-black text-[9px] uppercase tracking-[0.2em]">
                    <ShieldCheck size={16} /> Direct Injection Protocol Ready
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
