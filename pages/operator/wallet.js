import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { 
  ShieldCheck, 
  UserCheck, 
  Zap, 
  History, 
  Clock, 
  Loader2, 
  Database,
  CheckCircle2,
  Search,
  Filter,
  Store,
  Users
} from 'lucide-react';

export default function Funding() {
  const [operatorProfile, setOperatorProfile] = useState(null);
  const [chain, setChain] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [amount, setAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const syncChainData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    if (profile) {
      setOperatorProfile(profile);

      // GLOBAL BRAND FETCH: We pull everyone sharing your tenant_id
      const [cRes, hRes] = await Promise.all([
        supabase.from('profiles')
          .select('id, username, display_name, balance, role, tenant_id')
          .eq('tenant_id', profile.tenant_id) // Pulls the entire brand tree
          .neq('id', user.id)                // Excludes you from the list
          .order('username', { ascending: true }),

        supabase.from('ledger')
          .select('*, target:profiles!ledger_reference_id_fkey(username, role)')
          .eq('user_id', user.id)
          .eq('type', 'debit')
          .eq('source', 'transfer')
          .order('created_at', { ascending: false })
          .limit(10)
      ]);
      
      setChain(cRes.data || []);
      setHistory(hRes.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    syncChainData();
    const channel = supabase.channel(`operator-chain-${operatorProfile?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => syncChainData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [syncChainData, operatorProfile?.id]);

  const filteredGroups = useMemo(() => {
    const searchLower = searchQuery.toLowerCase().trim();
    const list = chain.filter(a => 
      !searchLower || 
      a.username?.toLowerCase().includes(searchLower) || 
      a.display_name?.toLowerCase().includes(searchLower)
    );

    return {
      agents: list.filter(a => a.role === 'agent'),
      // Flexible check for shops (case insensitive + catch testshop3 if needed)
      shops: list.filter(a => a.role?.toLowerCase() === 'shop' || a.username?.toLowerCase().includes('shop')),
      cashiers: list.filter(a => a.role === 'cashier' && !a.username?.toLowerCase().includes('shop')),
    };
  }, [chain, searchQuery]);

  const handleDispatch = async () => {
    const numAmount = Math.trunc(Number(amount));
    if (numAmount > (operatorProfile?.balance || 0)) {
      alert("INSUFFICIENT OPERATOR FLOAT");
      return;
    }
    if (!selectedId || !numAmount || numAmount <= 0) return;
    
    setIsProcessing(true);
    const { error } = await supabase.rpc('process_transfer', {
      p_sender_id: operatorProfile.id,
      p_receiver_id: selectedId,
      p_amount: numAmount
    });

    if (error) {
      alert("DISPATCH REJECTED: " + error.message);
      setIsProcessing(false);
    } else {
      setShowSuccess(true);
      setAmount('');
      setTimeout(() => {
        setShowSuccess(false);
        setIsProcessing(false);
      }, 2500);
    }
  };

  if (loading || !operatorProfile) {
    return (
      <div className="h-screen bg-[#0b0f1a] flex flex-col items-center justify-center gap-4">
        <Loader2 className="text-[#10b981] animate-spin" size={40} />
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Syncing Chain Treasury...</p>
      </div>
    );
  }

  const selectedNode = chain.find(c => c.id === selectedId);

  return (
    <OperatorLayout profile={operatorProfile}>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* TOP SEARCH PROTOCOL BAR */}
        <div className="bg-[#111926] p-4 rounded-3xl border border-white/5 flex flex-col md:flex-row items-center gap-4 shadow-2xl">
          <div className="flex items-center gap-3 px-4 border-r border-white/10 shrink-0">
            <Database className="text-emerald-500" size={20} />
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Access Level</p>
              <p className="text-xs font-bold uppercase italic text-white">Operator Hub</p>
            </div>
          </div>
          
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              className="w-full bg-[#0b0f1a] border border-white/5 p-4 pl-12 rounded-2xl text-sm font-bold uppercase outline-none focus:border-emerald-500 transition-all placeholder:text-slate-700"
              placeholder="SEARCH CHAIN BY USERNAME..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="bg-[#0b0f1a] px-6 py-3 rounded-2xl border border-white/5 text-right min-w-[220px]">
            <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Available Float</p>
            <p className="text-xl font-black italic">KES {parseFloat(operatorProfile.balance || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: CATEGORIZED TARGETS */}
          <div className="lg:col-span-3 space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center gap-2 px-2 text-[10px] font-black text-slate-500 uppercase italic tracking-widest mb-2">
              <Filter size={12} /> Distribution Network
            </div>
            
            {Object.entries(filteredGroups).map(([role, users]) => users.length > 0 && (
              <div key={role} className="space-y-2">
                <div className="flex items-center gap-2 ml-2 mt-4 opacity-50">
                   {role === 'shops' ? <Store size={10}/> : <Users size={10}/>}
                   <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">{role}</p>
                </div>
                {users.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => setSelectedId(acc.id)}
                    className={`w-full flex flex-col p-4 rounded-2xl border transition-all text-left group ${selectedId === acc.id ? 'bg-emerald-600 border-emerald-400 shadow-lg shadow-emerald-900/20' : 'bg-[#111926] border-white/5 hover:border-white/10'}`}
                  >
                    <span className="font-black uppercase italic text-xs tracking-tight">{acc.username}</span>
                    <span className={`text-[9px] font-bold ${selectedId === acc.id ? 'text-white/70' : 'text-slate-500'}`}>
                      Balance: KES {parseFloat(acc.balance || 0).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* CENTER: THE DISPATCHER */}
          <div className="lg:col-span-6">
            {showSuccess ? (
              <div className="bg-[#111926] border border-emerald-500/30 h-[550px] rounded-[3.5rem] flex flex-col items-center justify-center p-12 text-center animate-in zoom-in duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
                <CheckCircle2 size={100} className="text-emerald-500 mb-6 relative z-10" />
                <h3 className="text-5xl font-black uppercase italic text-white tracking-tighter relative z-10">DISPATCHED</h3>
                <div className="mt-8 bg-black/40 p-10 rounded-[2.5rem] border border-white/10 w-full max-w-sm relative z-10">
                   <p className="text-[10px] font-black text-emerald-500 uppercase mb-2 tracking-[0.2em]">Transaction Confirmed</p>
                   <p className="text-4xl font-black italic text-white">
                     KES {parseFloat(amount || 0).toLocaleString()}
                   </p>
                </div>
              </div>
            ) : selectedNode ? (
              <div className="bg-[#111926] min-h-[550px] rounded-[3.5rem] border border-white/5 p-12 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                <div className="space-y-10">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
                      {selectedNode.role === 'shop' ? <Store size={40} /> : <UserCheck size={40} />}
                    </div>
                    <div>
                      <h2 className="text-5xl font-black uppercase italic tracking-tighter leading-none">{selectedNode.username}</h2>
                      <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em] italic mt-2">Target Role: {selectedNode.role}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-[#0b0f1a] p-8 rounded-[2rem] border border-white/5">
                      <p className="text-[9px] font-black text-slate-600 uppercase mb-2 tracking-widest">Current Load</p>
                      <p className="text-2xl font-bold italic text-white/40">KES {parseFloat(selectedNode.balance || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-emerald-600/5 p-8 rounded-[2rem] border border-emerald-500/10">
                      <p className="text-[9px] font-black text-emerald-500 uppercase mb-2 tracking-widest">Est. Post-Dispatch</p>
                      <p className="text-2xl font-black italic text-white">KES {(parseFloat(selectedNode.balance || 0) + (parseFloat(amount) || 0)).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="space-y-4 bg-[#0b0f1a] p-10 rounded-[3rem] border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase italic ml-2 tracking-widest">Injection Amount (KES)</p>
                    <input 
                      type="number"
                      className="w-full bg-transparent border-none text-6xl font-black italic text-emerald-500 outline-none placeholder:text-emerald-900/20"
                      placeholder="0.00"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                    />
                    <button 
                      onClick={handleDispatch}
                      disabled={isProcessing || !amount}
                      className="w-full bg-emerald-600 hover:bg-white text-white hover:text-black py-7 rounded-[1.5rem] font-black uppercase italic tracking-[0.2em] transition-all disabled:opacity-20 flex items-center justify-center gap-4 text-sm mt-4 shadow-xl shadow-emerald-950/40"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" /> : <Zap size={20} />}
                      {isProcessing ? 'AUTHORIZING...' : 'CONFIRM DISPATCH'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#111926]/50 border-2 border-dashed border-white/5 min-h-[550px] rounded-[3.5rem] flex flex-col items-center justify-center text-center opacity-30">
                <ShieldCheck size={70} className="text-slate-700 mb-6" />
                <p className="text-[10px] font-black uppercase italic tracking-[0.5em] leading-loose">
                  Select Chain Node<br/>Ready for Distribution
                </p>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR: LIVE AUDIT */}
          <div className="lg:col-span-3">
            <div className="bg-[#111926] rounded-3xl border border-white/5 overflow-hidden h-full flex flex-col shadow-2xl">
              <div className="p-6 border-b border-white/5 flex items-center gap-2">
                <History size={16} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase italic tracking-widest">Dispatch Audit</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {history.map(log => (
                  <div key={log.id} className="bg-[#0b0f1a] p-5 rounded-2xl border border-white/[0.03] hover:border-emerald-500/20 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase italic text-white/90">{log.target?.username}</span>
                        <span className="text-[7px] text-slate-500 font-bold uppercase">{log.target?.role}</span>
                      </div>
                      <span className="text-rose-500 font-black italic text-xs">-{parseFloat(log.amount).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-1 opacity-40">
                        <Clock size={10} />
                        <span className="text-[8px] font-bold">{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                      <span className="text-[6px] border border-white/10 px-2 py-0.5 rounded uppercase font-black tracking-widest text-slate-600 italic">Settled</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </OperatorLayout>
  );
}
