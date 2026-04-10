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

      let query = supabase.from('profiles')
        .select('id, username, balance, role, tenant_id')
        .neq('id', profile.id)
        .order('role', { ascending: true });

      if (profile.role !== 'superadmin') {
        query = query.eq('tenant_id', profile.tenant_id);
      }

      const { data: targets } = await query;
      setAccounts(targets || []);

      const { data: logs } = await supabase.from('ledger')
        .select('*, target:profiles!ledger_user_id_fkey(username)')
        .eq('user_id', user.id)
        .eq('type', 'debit')
        .order('created_at', { ascending: false })
        .limit(6);
      
      setHistory(logs || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    syncTreasuryData();
    const channel = supabase.channel('treasury-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => syncTreasuryData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [syncTreasuryData]);

  // CATEGORIZED FILTERING LOGIC
  const groupedAccounts = useMemo(() => {
    const filtered = accounts.filter(a => 
      a.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return {
      operators: filtered.filter(a => a.role === 'operator'),
      agents: filtered.filter(a => a.role === 'agent'),
      shops: filtered.filter(a => a.role === 'shop'),
      cashiers: filtered.filter(a => a.role === 'cashier'),
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
      }, 4000);
    }
  };

  if (loading || !adminProfile) return <div className="h-screen bg-[#0b0f1a] flex items-center justify-center"><Loader2 className="text-blue-500 animate-spin" size={40} /></div>;

  const selectedNode = accounts.find(c => c.id === selectedId);

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6 bg-[#0b0f1a] min-h-screen text-white">
        
        {/* TOP SEARCH PROTOCOL BAR */}
        <div className="bg-[#111926] p-4 rounded-3xl border border-white/5 flex flex-col md:flex-row items-center gap-4 shadow-2xl">
          <div className="flex items-center gap-3 px-4 border-r border-white/10">
            <Database className="text-blue-500" size={20} />
            <div className="hidden lg:block">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Node Status</p>
              <p className="text-xs font-bold uppercase italic text-emerald-500">Active Treasury</p>
            </div>
          </div>
          
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              className="w-full bg-[#0b0f1a] border border-white/5 p-4 pl-12 rounded-2xl text-sm font-bold uppercase outline-none focus:border-blue-500 transition-all placeholder:text-slate-700"
              placeholder="SEARCH ACCOUNTS BY USERNAME OR ROLE (E.G. 'AGENT')..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="bg-[#0b0f1a] px-6 py-3 rounded-2xl border border-white/5 text-right min-w-[200px]">
            <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Available Float</p>
            <p className="text-xl font-black italic">KES {parseFloat(adminProfile.balance).toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT SIDEBAR: THE LIST */}
          <div className="lg:col-span-3 space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center gap-2 px-2 text-[10px] font-black text-slate-500 uppercase italic tracking-widest mb-2">
              <Filter size={12} /> Target Selection
            </div>
            
            {Object.entries(groupedAccounts).map(([role, users]) => users.length > 0 && (
              <div key={role} className="space-y-2">
                <p className="text-[9px] font-black text-blue-500/50 uppercase tracking-[0.2em] ml-2 mt-4">{role}</p>
                {users.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => setSelectedId(acc.id)}
                    className={`w-full flex flex-col p-4 rounded-2xl border transition-all text-left ${selectedId === acc.id ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/20' : 'bg-[#111926] border-white/5 hover:border-white/20'}`}
                  >
                    <span className="font-black uppercase italic text-xs tracking-tight">{acc.username}</span>
                    <span className={`text-[9px] font-bold ${selectedId === acc.id ? 'text-white/70' : 'text-slate-500'}`}>
                      KES {parseFloat(acc.balance).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* CENTER: DISPATCH ENGINE */}
          <div className="lg:col-span-6">
            {showSuccess ? (
              <div className="bg-[#111926] border border-emerald-500/30 h-[500px] rounded-[3rem] flex flex-col items-center justify-center p-12 text-center animate-in zoom-in duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
                <CheckCircle2 size={80} className="text-emerald-500 mb-6 relative z-10" />
                <h3 className="text-5xl font-black uppercase italic text-white tracking-tighter relative z-10">Dispatch Locked</h3>
                <div className="mt-8 bg-black/40 p-8 rounded-[2rem] border border-white/10 w-full max-w-sm relative z-10">
                   <p className="text-[10px] font-black text-emerald-500 uppercase mb-2 tracking-[0.2em]">Updated Target Balance</p>
                   <p className="text-4xl font-black italic text-white">
                      KES {(parseFloat(selectedNode?.balance || 0) + (parseFloat(amount) || 0)).toLocaleString()}
                   </p>
                </div>
              </div>
            ) : selectedNode ? (
              <div className="bg-[#111926] min-h-[500px] rounded-[3rem] border border-white/5 p-10 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                <div className="space-y-8">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-center text-blue-500">
                      <UserCheck size={32} />
                    </div>
                    <div>
                      <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">{selectedNode.username}</h2>
                      <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mt-2 inline-block">Role: {selectedNode.role}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#0b0f1a] p-6 rounded-3xl border border-white/5">
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Current Balance</p>
                      <p className="text-xl font-bold italic">KES {parseFloat(selectedNode.balance).toLocaleString()}</p>
                    </div>
                    <div className="bg-blue-600/5 p-6 rounded-3xl border border-blue-500/20">
                      <p className="text-[9px] font-black text-blue-500 uppercase mb-1">New Calculated Total</p>
                      <p className="text-xl font-black italic">KES {(parseFloat(selectedNode.balance) + (parseFloat(amount) || 0)).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="space-y-4 bg-[#0b0f1a] p-8 rounded-[2.5rem] border border-white/5">
                    <label className="text-[10px] font-black text-slate-500 uppercase italic ml-2">Injection Amount</label>
                    <input 
                      type="number"
                      className="w-full bg-transparent border-none text-5xl font-black italic text-blue-500 outline-none placeholder:text-blue-900/30"
                      placeholder="0.00"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                    />
                    <button 
                      onClick={handleDispatch}
                      disabled={isProcessing || !amount}
                      className="w-full bg-blue-600 hover:bg-white text-white hover:text-black py-6 rounded-2xl font-black uppercase italic tracking-widest transition-all disabled:opacity-20 flex items-center justify-center gap-4 text-sm"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" /> : <Zap size={20} />}
                      {isProcessing ? 'SYNCHRONIZING...' : 'AUTHORIZE FLOAT DISPATCH'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#111926]/50 border-2 border-dashed border-white/5 min-h-[500px] rounded-[3rem] flex flex-col items-center justify-center text-center opacity-40">
                <ShieldCheck size={60} className="text-slate-700 mb-4" />
                <p className="text-xs font-black uppercase italic tracking-[0.3em] leading-relaxed">
                  Secure Treasury Standby<br/>Select Node from Sidebar
                </p>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR: AUDIT TRAIL */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-[#111926] rounded-3xl border border-white/5 overflow-hidden h-full flex flex-col">
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-blue-500" />
                  <span className="text-[10px] font-black uppercase italic text-white/70">Audit Trail</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {history.map(log => (
                  <div key={log.id} className="bg-[#0b0f1a] p-4 rounded-2xl border border-white/5 flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase italic text-white truncate w-24">{log.target?.username}</span>
                      <span className="text-rose-500 font-black italic text-xs">-{parseFloat(log.amount).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-40">
                      <Clock size={8} />
                      <span className="text-[8px] font-bold">{new Date(log.created_at).toLocaleTimeString()}</span>
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
