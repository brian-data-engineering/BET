import { useState, useEffect, useCallback } from 'react';
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
  Search
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

    // 1. Fetch Admin Profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    if (profile) {
      setAdminProfile(profile);

      // 2. UNIVERSAL TARGET FETCH: Get everyone in the same Brand (Tenant)
      // This allows funding any node down the chain.
      let query = supabase.from('profiles')
        .select('id, username, balance, role, display_name')
        .neq('id', profile.id) // Can't fund yourself
        .order('username', { ascending: true });

      if (profile.role !== 'superadmin') {
        query = query.eq('tenant_id', profile.tenant_id);
      }

      const { data: targets } = await query;
      setAccounts(targets || []);

      // 3. Fetch Ledger (Sent transfers)
      const { data: logs } = await supabase.from('ledger')
        .select('*, target:profiles!ledger_user_id_fkey(username)')
        .eq('user_id', user.id)
        .eq('type', 'debit')
        .order('created_at', { ascending: false })
        .limit(8);
      
      setHistory(logs || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    syncTreasuryData();
    const channel = supabase.channel('treasury-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => syncTreasuryData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ledger' }, () => syncTreasuryData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [syncTreasuryData]);

  const handleDispatch = async () => {
    const numAmount = Math.trunc(Number(amount));
    if (!selectedId || !numAmount || numAmount <= 0) return;
    
    if (numAmount > adminProfile.balance) {
      alert("TREASURY EXHAUSTED: Amount exceeds available float.");
      return;
    }

    setIsProcessing(true);
    // Calling our updated process_transfer RPC
    const { error } = await supabase.rpc('process_transfer', {
      p_sender_id: adminProfile.id,
      p_receiver_id: selectedId,
      p_amount: numAmount
    });

    if (error) {
      alert("PROTOCOL ERROR: " + error.message);
      setIsProcessing(false);
    } else {
      setShowSuccess(true);
      setAmount('');
      // Success state is high-intensity, so we wait 3 seconds then reset
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedId('');
        setIsProcessing(false);
      }, 3000);
    }
  };

  // Filter accounts based on search
  const filteredAccounts = accounts.filter(a => 
    a.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || !adminProfile) return (
    <div className="h-screen bg-[#0b0f1a] flex items-center justify-center">
      <Loader2 className="text-blue-500 animate-spin" size={40} />
    </div>
  );

  const selectedNode = accounts.find(c => c.id === selectedId);

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white">
        
        {/* HEADER & BALANCE */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-10">
          <div>
            <div className="flex items-center gap-2 text-blue-500 font-black uppercase text-[10px] italic mb-1 tracking-[0.3em]">
              <Database size={12} /> Global Treasury Node
            </div>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Funding</h1>
          </div>
          <div className="bg-[#111926] p-8 rounded-[2rem] border border-white/5 min-w-[300px] text-right">
             <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Vault Balance</p>
             <h2 className="text-4xl font-black italic text-white">KES {parseFloat(adminProfile.balance || 0).toLocaleString()}</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* FORM AREA */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-5 text-slate-500" size={18} />
                <input 
                  placeholder="SEARCH USERNAME OR ROLE..."
                  className="w-full bg-[#0b0f1a] border border-white/5 p-5 pl-12 rounded-2xl text-xs font-black uppercase outline-none focus:border-blue-500 transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredAccounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => setSelectedId(acc.id)}
                    className={`flex justify-between items-center p-5 rounded-2xl border transition-all ${selectedId === acc.id ? 'bg-blue-600 border-blue-400 text-white' : 'bg-[#0b0f1a] border-white/5 text-slate-400 hover:border-white/20'}`}
                  >
                    <div className="text-left">
                      <p className="font-black italic uppercase text-sm">{acc.username}</p>
                      <p className="text-[9px] uppercase tracking-widest font-bold opacity-60">{acc.role}</p>
                    </div>
                    <p className="font-bold text-xs italic">KES {parseFloat(acc.balance).toLocaleString()}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase italic ml-2">Injection Amount (KES)</label>
                <input 
                  type="number"
                  placeholder="0.00"
                  className="w-full bg-[#0b0f1a] border border-white/5 p-6 rounded-2xl text-3xl font-black italic text-blue-500 outline-none focus:border-blue-500"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>

              <button 
                onClick={handleDispatch}
                disabled={isProcessing || !amount || !selectedId}
                className="w-full bg-blue-600 hover:bg-white text-white hover:text-black py-6 rounded-2xl font-black uppercase italic tracking-[0.2em] transition-all disabled:opacity-20 flex items-center justify-center gap-3"
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : <ArrowRightLeft size={20} />}
                {isProcessing ? 'AUTHORIZING...' : 'EXECUTE DISPATCH'}
              </button>
            </div>
          </div>

          {/* VISUALIZATION PANEL */}
          <div className="lg:col-span-7">
            {showSuccess ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 h-full rounded-[3rem] flex flex-col items-center justify-center p-12 text-center animate-in zoom-in duration-300">
                <CheckCircle2 size={80} className="text-emerald-500 mb-6" />
                <h3 className="text-4xl font-black uppercase italic text-white tracking-tighter">Dispatch Success</h3>
                <p className="text-emerald-500/70 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Node Balance Synchronized</p>
                
                <div className="mt-8 bg-black/20 p-6 rounded-2xl border border-white/5 w-full max-w-sm">
                   <p className="text-[9px] font-black text-slate-500 uppercase mb-1">New Node State</p>
                   <p className="text-3xl font-black italic text-white">
                      KES {(parseFloat(selectedNode?.balance || 0) + (parseFloat(amount) || 0)).toLocaleString()}
                   </p>
                </div>
              </div>
            ) : selectedNode ? (
              <div className="bg-[#111926] h-full rounded-[3rem] border border-blue-500/20 p-12 space-y-10 relative overflow-hidden">
                <Zap className="absolute -top-10 -right-10 text-blue-500/5" size={300} />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-500">
                      <UserCheck size={32} />
                    </div>
                    <div>
                      <h3 className="text-4xl font-black uppercase italic tracking-tighter">{selectedNode.username}</h3>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] italic">Level: {selectedNode.role}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-[#0b0f1a] p-6 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black text-slate-600 uppercase mb-2">Current Load</p>
                      <p className="text-xl font-bold italic text-white/60">KES {parseFloat(selectedNode.balance).toLocaleString()}</p>
                    </div>
                    <div className="bg-blue-500/5 p-6 rounded-2xl border border-blue-500/20">
                      <p className="text-[9px] font-black text-blue-500 uppercase mb-2">Post Injection</p>
                      <p className="text-xl font-black italic text-white">KES {(parseFloat(selectedNode.balance) + (parseFloat(amount) || 0)).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center p-20 opacity-30 text-center">
                <ShieldCheck size={48} className="mb-4 text-slate-500" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] italic">Awaiting Target Selection</p>
              </div>
            )}
          </div>
        </div>

        {/* LOGS */}
        <div className="bg-[#111926] rounded-[2.5rem] border border-white/5 overflow-hidden">
           <div className="p-6 border-b border-white/5 flex items-center gap-2">
             <History size={16} className="text-blue-500" />
             <span className="text-[10px] font-black uppercase italic tracking-widest">Recent Activity</span>
           </div>
           <div className="p-4 space-y-2">
              {history.map(log => (
                <div key={log.id} className="flex justify-between items-center bg-[#0b0f1a] p-4 rounded-xl border border-white/[0.02]">
                   <div className="flex items-center gap-4">
                      <Clock size={12} className="text-slate-600" />
                      <span className="text-xs font-black uppercase italic text-white/80">{log.target?.username || 'SYSTEM'}</span>
                   </div>
                   <span className="text-rose-500 font-black italic text-sm">- KES {parseFloat(log.amount).toLocaleString()}</span>
                </div>
              ))}
           </div>
        </div>
      </div>
    </AdminLayout>
  );
}
