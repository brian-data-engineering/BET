import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { ShieldCheck, UserCheck, Zap, ArrowRightLeft, History, Clock, Loader2, Database } from 'lucide-react';

export default function MasterFunding() {
  const [adminProfile, setAdminProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Unified Sync Function - Now computes balance from the Ledger
  const syncTreasuryData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch Base Profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    if (profile) {
      // Calculate TRUE balance from Ledger
      const { data: ledgerEntries } = await supabase.from('ledger').select('amount, type').eq('user_id', user.id);
      const trueBalance = (ledgerEntries || []).reduce((acc, row) => 
        row.type === 'credit' ? acc + Number(row.amount) : acc - Number(row.amount), 0
      );

      setAdminProfile({ ...profile, balance: trueBalance });

      // Fetch Target Nodes
      let query = supabase.from('profiles').select('id, username, balance, role');
      if (profile.role === 'super_admin') {
        query = query.eq('role', 'operator');
      } else {
        query = query.eq('role', 'cashier').eq('parent_id', profile.id);
      }
      const { data: targets } = await query.order('username', { ascending: true });
      setAccounts(targets || []);

      // Fetch Recent Outward Ledger Entries (The Money Trail)
      const { data: auditTrail } = await supabase
        .from('ledger')
        .select(`
          *,
          target:profiles!ledger_user_id_fkey(username)
        `)
        .eq('type', 'debit')
        .eq('source', 'transfer')
        .order('created_at', { ascending: false })
        .limit(10);
      
      setHistory(auditTrail || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    syncTreasuryData();
  }, [syncTreasuryData]);

  // 2. The Fixed Dispatch Protocol (Calls the Ledger RPC)
  const handleDispatch = async () => {
    const numAmount = parseFloat(amount);
    if (!selectedId || !numAmount || numAmount <= 0) return;
    if (numAmount > adminProfile.balance) {
      alert("INSUFFICIENT FLOAT: Request exceeds available treasury.");
      return;
    }

    setIsProcessing(true);
    
    // Calls our unified RPC that handles both profiles and ledger entries
    const { error } = await supabase.rpc('transfer_credits', {
      p_sender_id: adminProfile.id,
      p_receiver_id: selectedId,
      p_amount: numAmount
    });

    if (error) {
      console.error(error);
      alert("Protocol Error: " + error.message);
    } else {
      setAmount('');
      setSelectedId('');
      await syncTreasuryData(); 
      alert("SUCCESS: Ledger Entry Finalized.");
    }
    setIsProcessing(false);
  };

  if (loading || !adminProfile) return (
    <AdminLayout>
      <div className="h-screen bg-[#0b0f1a] flex items-center justify-center">
        <Loader2 className="text-blue-500 animate-spin" size={40} />
      </div>
    </AdminLayout>
  );

  const selectedNode = accounts.find(c => c.id === selectedId);

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* TREASURY HEADER */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="text-blue-500" size={20} />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">
                Verified Treasury Node
              </span>
            </div>
            <h1 className="text-5xl font-black uppercase tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-600">
              Treasury
            </h1>
          </div>

          <div className="bg-[#111926] border border-white/5 p-8 rounded-[2.5rem] min-w-[350px] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={80}/></div>
              <p className="text-[10px] text-blue-500 font-black uppercase italic mb-2 tracking-widest relative z-10 text-right">Available Vault Float</p>
              <h2 className="text-4xl font-black text-white italic tracking-tighter relative z-10 text-right">
                KES {parseFloat(adminProfile.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* INJECTION FORM */}
          <div className="lg:col-span-5 bg-[#111926] p-10 rounded-[3rem] border border-white/5 space-y-8 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/5 pb-6">
              <ArrowRightLeft size={18} className="text-blue-500" />
              <h2 className="font-black uppercase text-xs italic tracking-widest">Injection Protocol</h2>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] text-slate-500 font-black uppercase ml-2 tracking-widest italic">Target Node</label>
              <select 
                className="w-full bg-[#0b0f1a] border border-white/10 p-5 rounded-2xl text-sm font-bold uppercase text-white outline-none focus:border-blue-500 appearance-none cursor-pointer"
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
              >
                <option value="">Select Account...</option>
                {accounts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.username.toUpperCase()} — {c.role.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] text-slate-500 font-black uppercase ml-2 tracking-widest italic">Volume (KES)</label>
              <input 
                type="number" 
                className="w-full bg-[#0b0f1a] border border-white/10 p-6 rounded-2xl text-blue-500 font-black text-3xl outline-none focus:border-blue-500"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            <button 
              onClick={handleDispatch}
              disabled={isProcessing || !amount || !selectedId}
              className="w-full bg-blue-600 hover:bg-white text-white hover:text-black font-black py-6 rounded-2xl flex items-center justify-center gap-4 transition-all disabled:opacity-10 uppercase italic text-sm tracking-widest shadow-xl shadow-blue-500/10"
            >
              {isProcessing ? 'AUTHORIZING...' : 'Authorize Dispatch'}
            </button>
          </div>

          {/* PREVIEW PANEL */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {selectedNode ? (
              <div className="bg-[#1c2636]/30 p-12 rounded-[3rem] border border-blue-500/20 space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-lg shadow-blue-500/10">
                    <UserCheck size={40} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">
                      {selectedNode.username}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic">
                      Role: {selectedNode.role} | Internal Node Detected
                    </p>
                  </div>
                </div>
                
                <div className="space-y-6 pt-10 border-t border-white/5">
                  <div className="flex justify-between items-center bg-[#0b0f1a] p-5 rounded-2xl border border-white/5">
                     <span className="text-[10px] font-black uppercase text-slate-500 italic tracking-widest">Static Balance</span>
                     <span className="text-white font-bold italic">KES {parseFloat(selectedNode.balance).toLocaleString()}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[10px] text-blue-500 font-black uppercase italic ml-1 tracking-widest">Projected Node Capacity</p>
                    <div className="flex justify-between items-center bg-blue-500/5 p-6 rounded-3xl border border-blue-500/10">
                       <p className="text-4xl font-black text-white tracking-tighter italic">
                          KES {(parseFloat(selectedNode.balance || 0) + (parseFloat(amount) || 0)).toLocaleString()}
                       </p>
                       <Zap className="text-blue-500 animate-pulse" size={32} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-center p-20 opacity-20">
                <Database className="mb-4 text-slate-500" size={48} />
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] italic leading-relaxed">
                  Treasury Standby<br/>Select Target Node to Initialize Injection
                </p>
              </div>
            )}
          </div>
        </div>

        {/* AUDIT TRAIL TABLE */}
        <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 bg-white/[0.01] flex items-center gap-3">
            <History size={18} className="text-blue-500" />
            <h2 className="text-xs font-black uppercase italic tracking-widest">Audit Trail (Outward Transfers)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#0b0f1a]/50 text-slate-600 uppercase text-[9px] font-black tracking-widest italic">
                <tr>
                  <th className="p-6">Timestamp</th>
                  <th className="p-6">Target Node</th>
                  <th className="p-6">Source</th>
                  <th className="p-6 text-right">Magnitude</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-all">
                    <td className="p-6 flex items-center gap-2 text-slate-400">
                      <Clock size={12} />
                      <span className="text-[10px] font-bold tracking-tighter">
                        {new Date(tx.created_at).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="p-6 font-black uppercase italic text-sm tracking-tighter text-white">
                      {tx.target?.username || 'SYSTEM'}
                    </td>
                    <td className="p-6">
                      <span className="text-[9px] font-black uppercase italic px-3 py-1 bg-white/5 rounded-full border border-white/5 text-slate-400">
                        {tx.source}
                      </span>
                    </td>
                    <td className="p-6 text-right text-rose-500 font-black italic text-lg">
                      - {parseFloat(tx.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
