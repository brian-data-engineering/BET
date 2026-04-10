import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  ShieldCheck, 
  UserCheck, 
  Zap, 
  ArrowRightLeft, 
  History, 
  Clock, 
  Loader2, 
  Database,
  CheckCircle2,
  Search,
  Filter
} from 'lucide-react';

export default function MasterFunding() {
  const [adminProfile, setAdminProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [amount, setAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const syncTreasuryData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    if (profile) {
      setAdminProfile(profile);

      // 1. START BASE QUERY
      let query = supabase.from('profiles')
        .select('id, username, balance, role, tenant_id')
        .neq('id', profile.id)
        .order('username', { ascending: true });

      // 2. APPLY SMART FILTER
      // If you are superadmin (with or without underscore) or have NO tenant_id, you see EVERYONE.
      const isSuper = profile.role?.includes('super') || !profile.tenant_id;
      
      if (!isSuper) {
        query = query.eq('tenant_id', profile.tenant_id);
      }

      const { data: targets, error: targetError } = await query;
      if (targetError) console.error("Query Error:", targetError);
      setAccounts(targets || []);

      // 3. FETCH LEDGER
      const { data: logs } = await supabase.from('ledger')
        .select('*, target:profiles!ledger_user_id_fkey(username)')
        .eq('user_id', user.id)
        .eq('type', 'debit')
        .order('created_at', { ascending: false })
        .limit(10);
      
      setHistory(logs || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    syncTreasuryData();
    const channel = supabase.channel('treasury-v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => syncTreasuryData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [syncTreasuryData]);

  // CATEGORIZED FILTERING & SEARCH ENGINE
  const filteredGroups = useMemo(() => {
    const searchLower = searchQuery.toLowerCase().trim();
    
    const list = accounts.filter(a => 
      !searchLower || 
      a.username?.toLowerCase().includes(searchLower) || 
      a.role?.toLowerCase().includes(searchLower)
    );

    return {
      operators: list.filter(a => a.role === 'operator'),
      agents: list.filter(a => a.role === 'agent'),
      shops: list.filter(a => a.role === 'shop'),
      cashiers: list.filter(a => a.role === 'cashier'),
    };
  }, [accounts, searchQuery]);

  const handleDispatch = async () => {
    const numAmount = Math.trunc(Number(amount));
    if (!selectedId || !numAmount || numAmount <= 0) return;
    
    setIsProcessing(true);
    const { error } = await supabase.rpc('process_transfer', {
      p_sender_id: adminProfile.id,
      p_receiver_id: selectedId,
      p_amount: numAmount
    });

    if (error) {
      alert("DISPATCH FAILED: " + error.message);
      setIsProcessing(false);
    } else {
      setShowSuccess(true);
      setAmount('');
      setTimeout(() => {
        setShowSuccess(false);
        setIsProcessing(false);
      }, 3000);
    }
  };

  if (loading || !adminProfile) {
    return (
      <div className="h-screen bg-[#0b0f1a] flex flex-col items-center justify-center gap-4">
        <Loader2 className="text-blue-500 animate-spin" size={40} />
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Syncing Treasury...</p>
      </div>
    );
  }

  const selectedNode = accounts.find(c => c.id === selectedId);

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6 bg-[#0b0f1a] min-h-screen text-white">
        
        {/* TOP SEARCH PROTOCOL BAR */}
        <div className="bg-[#111926] p-4 rounded-3xl border border-white/5 flex flex-col md:flex-row items-center gap-4 shadow-2xl">
          <div className="flex items-center gap-3 px-4 border-r border-white/10 shrink-0">
            <Database className="text-blue-500" size={20} />
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Status</p>
              <p className="text-xs font-bold uppercase italic text-emerald-500">Root Node</p>
            </div>
          </div>
          
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              className="w-full bg-[#0b0f1a] border border-white/5 p-4 pl-12 rounded-2xl text-sm font-bold uppercase outline-none focus:border-blue-500 transition-all placeholder:text-slate-700"
              placeholder="SEARCH USERNAME OR ROLE..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="bg-[#0b0f1a] px-6 py-3 rounded-2xl border border-white/5 text-right min-w-[220px]">
            <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Master Float</p>
            <p className="text-xl font-black italic">KES {parseFloat(adminProfile.balance || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT SIDEBAR: CATEGORIZED LIST */}
          <div className="lg:col-span-3 space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center gap-2 px-2 text-[10px] font-black text-slate-500 uppercase italic tracking-widest mb-2">
              <Filter size={12} /> Direct Injection Targets
            </div>
            
            {Object.entries(filteredGroups).some(([_, users]) => users.length > 0) ? (
              Object.entries(filteredGroups).map(([role, users]) => users.length > 0 && (
                <div key={role} className="space-y-2">
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] ml-2 mt-4">{role}s</p>
                  {users.map(acc => (
                    <button
                      key={acc.id}
                      onClick={() => setSelectedId(acc.id)}
                      className={`w-full flex flex-col p-4 rounded-2xl border transition-all text-left group ${selectedId === acc.id ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/20' : 'bg-[#111926] border-white/5 hover:border-white/10'}`}
                    >
                      <span className="font-black uppercase italic text-xs tracking-tight">{acc.username}</span>
                      <span className={`text-[9px] font-bold ${selectedId === acc.id ? 'text-white/70' : 'text-slate-500'}`}>
                        Load: KES {parseFloat(acc.balance || 0).toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <div className="p-10 text-center opacity-20">
                <p className="text-[10px] font-black uppercase italic">No nodes found</p>
              </div>
            )}
          </div>

          {/* CENTER: THE DISPATCHER */}
          <div className="lg:col-span-6">
            {showSuccess ? (
              <div className="bg-[#111926] border border-emerald-500/30 h-[550px] rounded-[3.5rem] flex flex-col items-center justify-center p-12 text-center animate-in zoom-in duration-300 relative overflow-hidden shadow-2xl shadow-emerald-950/20">
                <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
                <CheckCircle2 size={100} className="text-emerald-500 mb-6 relative z-10" />
                <h3 className="text-5xl font-black uppercase italic text-white tracking-tighter relative z-10">SUCCESS</h3>
                <div className="mt-8 bg-black/40 p-10 rounded-[2.5rem] border border-white/10 w-full max-w-sm relative z-10">
                   <p className="text-[10px] font-black text-emerald-500 uppercase mb-2 tracking-[0.2em]">Synchronization Complete</p>
                   <p className="text-3xl font-bold italic text-white/50 mb-1">New Total</p>
                   <p className="text-4xl font-black italic text-white">
                      KES {(parseFloat(selectedNode?.balance || 0) + (parseFloat(amount) || 0)).toLocaleString()}
                   </p>
                </div>
              </div>
            ) : selectedNode ? (
              <div className="bg-[#111926] min-h-[550px] rounded-[3.5rem] border border-white/5 p-12 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                <div className="space-y-10">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-500/10 rounded-3xl border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-inner">
                      <UserCheck size={40} />
                    </div>
                    <div>
                      <h2 className="text-5xl font-black uppercase italic tracking-tighter leading-none">{selectedNode.username}</h2>
                      <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.4em] italic mt-2">Protocol Layer: {selectedNode.role}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-[#0b0f1a] p-8 rounded-[2rem] border border-white/5 shadow-inner">
                      <p className="text-[9px] font-black text-slate-600 uppercase mb-2 tracking-widest">Base Balance</p>
                      <p className="text-2xl font-bold italic text-white/40">KES {parseFloat(selectedNode.balance || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-blue-600/5 p-8 rounded-[2rem] border border-blue-500/10">
                      <p className="text-[9px] font-black text-blue-500 uppercase mb-2 tracking-widest">Post-Dispatch</p>
                      <p className="text-2xl font-black italic text-white">KES {(parseFloat(selectedNode.balance || 0) + (parseFloat(amount) || 0)).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="space-y-4 bg-[#0b0f1a] p-10 rounded-[3rem] border border-white/5 shadow-2xl">
                    <p className="text-[10px] font-black text-slate-500 uppercase italic ml-2 tracking-widest">Fund Amount (KES)</p>
                    <input 
                      type="number"
                      className="w-full bg-transparent border-none text-6xl font-black italic text-blue-500 outline-none placeholder:text-blue-900/20"
                      placeholder="0.00"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                    />
                    <button 
                      onClick={handleDispatch}
                      disabled={isProcessing || !amount}
                      className="w-full bg-blue-600 hover:bg-white text-white hover:text-black py-7 rounded-[1.5rem] font-black uppercase italic tracking-[0.2em] transition-all disabled:opacity-20 flex items-center justify-center gap-4 text-sm mt-4 shadow-xl shadow-blue-950/40"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" /> : <Zap size={20} />}
                      {isProcessing ? 'AUTHORIZING TRANSACTION...' : 'EXECUTE DIRECT FUNDING'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#111926]/50 border-2 border-dashed border-white/5 min-h-[550px] rounded-[3.5rem] flex flex-col items-center justify-center text-center opacity-30">
                <ShieldCheck size={70} className="text-slate-700 mb-6" />
                <p className="text-[10px] font-black uppercase italic tracking-[0.5em] leading-loose">
                  Treasury Standby<br/>Select Target User
                </p>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR: AUDIT TRAIL */}
          <div className="lg:col-span-3">
            <div className="bg-[#111926] rounded-3xl border border-white/5 overflow-hidden h-full flex flex-col shadow-2xl">
              <div className="p-6 border-b border-white/5 flex items-center gap-2">
                <History size={16} className="text-blue-500" />
                <span className="text-[10px] font-black uppercase italic tracking-widest">Live Audit</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {history.map(log => (
                  <div key={log.id} className="bg-[#0b0f1a] p-5 rounded-2xl border border-white/[0.03] hover:border-blue-500/20 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black uppercase italic text-white/90">{log.target?.username}</span>
                      <span className="text-rose-500 font-black italic text-xs">-{parseFloat(log.amount).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 opacity-40">
                        <Clock size={10} />
                        <span className="text-[8px] font-bold">{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                      <span className="text-[7px] bg-white/5 px-2 py-0.5 rounded uppercase font-black tracking-widest text-slate-500 italic">Confirmed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}
