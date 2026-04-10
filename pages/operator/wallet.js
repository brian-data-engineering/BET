import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { ArrowDownRight, Loader2, Send, History, Database, Search, Filter, Store, UserCheck } from 'lucide-react';

export default function Funding() {
  const [amount, setAmount] = useState('');
  const [targetId, setTargetId] = useState('');
  const [chain, setChain] = useState([]); // All accounts in your chain
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // all, agent, shop, cashier
  const [operatorProfile, setOperatorProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    if (profile) {
      setOperatorProfile(profile);

      const [cRes, tRes] = await Promise.all([
        // FETCH THE ENTIRE CHAIN: Filtered by parent and brand
        supabase.from('profiles')
          .select('*')
          .eq('parent_id', user.id)
          .eq('tenant_id', profile.tenant_id)
          .order('username', { ascending: true }),

        supabase.from('ledger')
          .select(`*, receiver:profiles!ledger_reference_id_fkey(username, display_name, role)`)
          .eq('user_id', user.id) 
          .eq('type', 'debit')   
          .eq('source', 'transfer')
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (cRes.data) setChain(cRes.data);
      if (tRes.data) setTransactions(tRes.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // SEARCH & FILTER ENGINE
  const filteredChain = useMemo(() => {
    return chain.filter(item => {
      const matchesSearch = 
        item.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.display_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'all' || item.role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [chain, searchTerm, filterRole]);

  const handleTransfer = async () => {
    const cleanAmount = Math.trunc(Number(amount));
    if (cleanAmount > (operatorProfile?.balance || 0)) {
      alert("INSUFFICIENT FLOAT");
      return;
    }
    if (!targetId || !cleanAmount || cleanAmount <= 0) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc('process_transfer', {
        p_sender_id: operatorProfile.id,
        p_receiver_id: targetId,
        p_amount: cleanAmount
      });
      if (error) throw error;
      setAmount('');
      setTargetId('');
      fetchData();
    } catch (err) {
      alert("Rejected: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="h-screen bg-[#0b0f1a] flex items-center justify-center"><Loader2 className="animate-spin text-[#10b981]" size={32} /></div>;

  return (
    <OperatorLayout profile={operatorProfile}>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* HEADER */}
        <div className="flex justify-between items-end border-b border-white/5 pb-10">
          <div>
            <div className="flex items-center gap-2 text-blue-500 font-black uppercase text-[10px] italic mb-1 tracking-widest">
              <Database size={12} /> Network Treasury
            </div>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter text-white">Chain Dispatch</h1>
          </div>
          <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl text-right">
            <span className="text-[9px] font-black text-slate-500 uppercase italic block mb-1">Operator Balance</span>
            <span className="text-4xl font-black text-[#10b981] italic tracking-tighter">
              KES {parseFloat(operatorProfile?.balance || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* LEFT: DISPATCH & SEARCH */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* SEARCH & FILTERS */}
            <div className="bg-[#111926] p-6 rounded-[2rem] border border-white/5 space-y-4 shadow-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text"
                  placeholder="SEARCH CHAIN (USERNAME OR NAME)..."
                  className="w-full bg-[#0b0f1a] pl-12 pr-6 py-4 rounded-xl border border-white/10 text-xs font-bold outline-none focus:border-blue-500 transition-all uppercase"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                {['all', 'agent', 'shop', 'cashier'].map((role) => (
                  <button
                    key={role}
                    onClick={() => setFilterRole(role)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase italic transition-all border ${
                      filterRole === role ? 'bg-blue-600 border-blue-400 text-white' : 'bg-[#0b0f1a] border-white/5 text-slate-500 hover:text-white'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* MAIN DISPATCH FORM */}
            <div className={`bg-[#111926] p-10 rounded-[3rem] border border-white/5 space-y-8 shadow-2xl ${isProcessing ? 'opacity-50 grayscale' : ''}`}>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 italic tracking-widest">Select Destination</label>
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {filteredChain.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setTargetId(item.id)}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        targetId === item.id ? 'bg-blue-600/20 border-blue-500' : 'bg-[#0b0f1a] border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.role === 'shop' ? <Store size={16} className="text-orange-400" /> : <UserCheck size={16} className="text-emerald-400" />}
                        <div className="text-left">
                          <p className="text-[11px] font-black leading-none">{item.username.toUpperCase()}</p>
                          <p className="text-[9px] text-slate-500 font-bold">{item.role.toUpperCase()}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-black text-[#10b981]">KES {parseFloat(item.balance || 0).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 italic tracking-widest">Dispatch Amount</label>
                <input 
                  type="number" 
                  className="w-full bg-[#0b0f1a] p-8 rounded-2xl border border-white/10 text-5xl font-black text-[#10b981] outline-none placeholder:text-white/5" 
                  placeholder="0" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                />
              </div>

              <button 
                onClick={handleTransfer} 
                disabled={isProcessing || !targetId || !amount} 
                className="w-full bg-[#10b981] text-black font-black py-7 rounded-2xl hover:bg-white transition-all italic text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3"
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : <Send size={16} />}
                AUTHORIZE DISPATCH
              </button>
            </div>
          </div>

          {/* RIGHT: HISTORY */}
          <div className="lg:col-span-5 bg-[#111926] p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col h-full">
            <h2 className="text-[10px] font-black uppercase text-slate-500 italic tracking-widest mb-6 flex items-center gap-2">
              <History size={14} /> Audit Log
            </h2>
            <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {transactions.map(tx => (
                <div key={tx.id} className="flex justify-between items-center p-5 bg-[#0b0f1a] rounded-2xl border border-white/[0.03]">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500"><ArrowDownRight size={16} /></div>
                    <div>
                      <span className="text-xs font-black uppercase italic text-white/70 block">
                        {tx.receiver?.username} ({tx.receiver?.role})
                      </span>
                      <span className="text-[8px] text-slate-600 font-bold uppercase">{new Date(tx.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <span className="text-sm font-black italic text-rose-500">-KES {parseFloat(tx.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}
