import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { ShieldCheck, Send, UserCheck, Zap, ArrowRightLeft, History, Clock } from 'lucide-react';

export default function MasterFunding() {
  const [adminProfile, setAdminProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Get Admin Profile
  const getSessionAndProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        setAdminProfile(profile);
        return profile;
      }
    } catch (err) {
      console.error("Auth Error:", err.message);
    }
    return null;
  };

  // 2. Fetch Target Accounts
  const fetchTargets = async (profile) => {
    const currentProfile = profile || adminProfile;
    if (!currentProfile) return;
    try {
      let query = supabase.from('profiles').select('id, username, balance, role, parent_id');
      if (currentProfile.role === 'super_admin') {
        query = query.eq('role', 'operator');
      } else {
        query = query.eq('role', 'cashier').eq('parent_id', currentProfile.id);
      }
      const { data, error } = await query.order('username', { ascending: true });
      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      console.error("Sync Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch Money Trail (Transactions)
  const fetchHistory = async (profile) => {
    const currentProfile = profile || adminProfile;
    if (!currentProfile) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .or(`sender_id.eq.${currentProfile.id},receiver_id.eq.${currentProfile.id}`)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("History Error:", err.message);
    }
  };

  useEffect(() => {
    const init = async () => {
      const profile = await getSessionAndProfile();
      if (profile) {
        await fetchTargets(profile);
        await fetchHistory(profile);
      }
    };
    init();
  }, []);

  const handleDispatch = async () => {
    const numAmount = parseFloat(amount);
    if (!selectedId || !numAmount || numAmount <= 0) return;

    setIsProcessing(true);
    const { error } = await supabase.rpc('transfer_credits', {
      sender_id: adminProfile.id,
      receiver_id: selectedId,
      amount_to_transfer: numAmount
    });

    if (error) {
      alert("Transfer Protocol Failed: " + error.message);
    } else {
      setAmount('');
      setSelectedId('');
      const updatedProfile = await getSessionAndProfile();
      await fetchTargets(updatedProfile);
      await fetchHistory(updatedProfile);
      alert("SUCCESS: Liquidity Injection Confirmed.");
    }
    setIsProcessing(false);
  };

  if (!adminProfile) return (
    <AdminLayout>
      <div className="h-screen bg-[#0b0f1a] flex items-center justify-center">
        <Zap className="text-[#10b981] animate-pulse" size={40} />
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
                Node ID: {adminProfile.username}
              </span>
            </div>
            <h1 className="text-5xl font-black uppercase tracking-tighter italic">Treasury</h1>
          </div>

          <div className="bg-[#111926] border border-white/5 p-8 rounded-[2.5rem] min-w-[350px] shadow-2xl">
              <p className="text-[10px] text-[#10b981] font-black uppercase italic mb-2 tracking-widest">Available Float</p>
              <h2 className="text-4xl font-black text-white italic tracking-tighter">
                KES {parseFloat(adminProfile.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* FUNDING FORM */}
          <div className="lg:col-span-5 bg-[#111926] p-10 rounded-[3rem] border border-white/5 space-y-8">
            <div className="flex items-center gap-3 border-b border-white/5 pb-6">
              <ArrowRightLeft size={18} className="text-[#10b981]" />
              <h2 className="font-black uppercase text-xs italic tracking-widest">Injection Protocol</h2>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] text-slate-500 font-black uppercase ml-2 tracking-widest italic">Target Account</label>
              <select 
                className="w-full bg-[#0b0f1a] border border-white/10 p-5 rounded-2xl text-sm font-bold uppercase text-white outline-none focus:border-[#10b981]"
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
              >
                <option value="">Choose Node...</option>
                {accounts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.username.toUpperCase()} (KES {parseFloat(c.balance).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] text-slate-500 font-black uppercase ml-2 tracking-widest italic">Volume (KES)</label>
              <input 
                type="number" 
                className="w-full bg-[#0b0f1a] border border-white/10 p-6 rounded-2xl text-[#10b981] font-black text-3xl outline-none focus:border-[#10b981]"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            <button 
              onClick={handleDispatch}
              disabled={isProcessing || !amount || !selectedId}
              className="w-full bg-[#10b981] hover:bg-white text-black font-black py-6 rounded-2xl flex items-center justify-center gap-4 transition-all disabled:opacity-10 uppercase italic text-sm tracking-widest shadow-xl shadow-[#10b981]/10"
            >
              {isProcessing ? 'Processing...' : 'Authorize Dispatch'}
            </button>
          </div>

          {/* PREVIEW PANEL */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {selectedId ? (
              <div className="bg-[#1c2636]/30 p-12 rounded-[3rem] border border-[#10b981]/20 space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-[#10b981]/10 rounded-3xl flex items-center justify-center text-[#10b981] border border-[#10b981]/20 shadow-lg shadow-[#10b981]/10">
                    <UserCheck size={40} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">
                      {accounts.find(c => c.id === selectedId)?.username}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic text-white/50">
                      Node Status: ACTIVE {accounts.find(c => c.id === selectedId)?.role}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-6 pt-10 border-t border-white/5">
                  <div className="flex justify-between items-center bg-[#0b0f1a] p-5 rounded-2xl border border-white/5">
                     <span className="text-[10px] font-black uppercase text-slate-500 italic tracking-widest">Current Float</span>
                     <span className="text-white font-bold italic">KES {parseFloat(accounts.find(c => c.id === selectedId)?.balance).toLocaleString()}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[10px] text-[#10b981] font-black uppercase italic ml-1 tracking-widest">Projected Float</p>
                    <div className="flex justify-between items-center bg-[#10b981]/5 p-6 rounded-3xl border border-[#10b981]/10">
                       <p className="text-4xl font-black text-white tracking-tighter italic">
                          KES {(parseFloat(accounts.find(c => c.id === selectedId)?.balance || 0) + (parseFloat(amount) || 0)).toLocaleString()}
                       </p>
                       <Zap className="text-[#10b981] animate-pulse" size={32} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-center p-20 opacity-20">
                <Zap className="mb-4 text-slate-500" size={48} />
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] italic leading-relaxed">
                  Treasury Standby<br/>Select Target Node to Initialize Injection
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RECENT MONEY TRAIL TABLE */}
        <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 bg-white/[0.01] flex items-center gap-3">
            <History size={18} className="text-[#10b981]" />
            <h2 className="text-xs font-black uppercase italic tracking-widest">Recent Money Trail</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#0b0f1a]/50 text-slate-600 uppercase text-[9px] font-black tracking-widest italic">
                <tr>
                  <th className="p-6">Timestamp</th>
                  <th className="p-6">Destination</th>
                  <th className="p-6 text-right">Amount (KES)</th>
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
                    <td className="p-6 font-black uppercase italic text-sm tracking-tighter">
                      {tx.receiver_username || 'NODE_UNKNOWN'}
                    </td>
                    <td className="p-6 text-right text-[#10b981] font-black italic">
                      {parseFloat(tx.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length === 0 && (
              <div className="p-10 text-center text-slate-700 font-black uppercase italic text-[10px] tracking-widest">
                No Transactions Found
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
