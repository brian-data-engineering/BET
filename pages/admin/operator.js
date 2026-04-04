import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { UserPlus, Briefcase, ShieldCheck, ArrowRightLeft, TrendingUp, Activity, Key, Database } from 'lucide-react';
import { useRouter } from 'next/router';

export default function ManageOperators() {
  const router = useRouter();
  const [operators, setOperators] = useState([]);
  const [adminId, setAdminId] = useState(null);
  const [form, setForm] = useState({ password: '', username: '' }); // Email removed from form
  const [loading, setLoading] = useState(false);

  const syncNetworkState = useCallback(async () => {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, balance, role, created_at')
      .eq('role', 'operator')
      .order('created_at', { ascending: false });

    if (error) return console.error("Sync Error:", error.message);
    setOperators(profiles || []);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAdminId(user.id);
        syncNetworkState();
      }
    };
    init();

    const channel = supabase
      .channel('operator-mgmt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => syncNetworkState())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [syncNetworkState]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // GHOST LOGIC: Auto-generate the internal administrative email
    const ghostEmail = `${form.username.toLowerCase().trim()}@lucra.internal`;
    
    const { error } = await supabase.auth.signUp({ 
      email: ghostEmail, 
      password: form.password,
      options: {
        shouldCreateSession: false, // Prevent the admin from being logged out
        data: { 
          username: form.username.trim(),
          role: 'operator',      
          parent_id: adminId 
        }
      }
    });
    
    if (error) {
      alert("Registration Failure: " + error.message);
    } else {
      alert(`NODE INITIALIZED: Operator ${form.username} provisioned with identity ${ghostEmail}`);
      setForm({ password: '', username: '' });
      syncNetworkState();
    }
    setLoading(false);
  };

  const totalFloat = operators.reduce((acc, op) => acc + (parseFloat(op.balance) || 0), 0);

  return (
    <AdminLayout>
      <div className="p-8 space-y-10 bg-[#06080f] min-h-screen text-white font-sans">
        
        {/* NETWORK STATS */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Database size={16} className="text-blue-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Network Ledger</span>
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">Operator Nodes</h1>
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full xl:w-auto">
            <div className="bg-[#111926] p-6 rounded-[2rem] border border-white/5 min-w-[200px]">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic mb-2 block">Network Liability</span>
              <span className="text-2xl font-black text-blue-500 italic tracking-tighter">
                KES {totalFloat.toLocaleString()}
              </span>
            </div>
            <div className="bg-blue-500/5 p-6 rounded-[2rem] border border-blue-500/20 min-w-[150px]">
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest italic mb-2 block">Active Nodes</span>
              <span className="text-2xl font-black text-white italic tracking-tighter">{operators.length}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* REGISTRATION */}
          <div className="lg:col-span-4">
            <div className="bg-[#111926] p-10 rounded-[3rem] border border-white/5 space-y-8 shadow-2xl sticky top-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                    <UserPlus size={24} />
                </div>
                <h2 className="font-black uppercase text-xs italic tracking-widest text-white">Provision Node</h2>
              </div>
              
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-3 italic tracking-widest">Operator Username</label>
                  <input 
                    value={form.username} 
                    className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 focus:border-blue-500 outline-none text-sm font-bold text-white transition-all placeholder:text-white/10 uppercase" 
                    placeholder="e.g. nairobi_hub" 
                    onChange={e => setForm({...form, username: e.target.value})} 
                    required 
                  />
                  <p className="text-[8px] text-slate-600 italic px-2">Access: {form.username ? form.username.toLowerCase() : '...' }@lucra.internal</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-3 italic tracking-widest">Access Key (Password)</label>
                  <div className="relative">
                    <input 
                      value={form.password} 
                      className="w-full bg-[#0b0f1a] p-5 pl-12 rounded-2xl border border-white/5 focus:border-blue-500 outline-none text-sm font-bold text-white transition-all" 
                      type="password" 
                      placeholder="••••••••" 
                      onChange={e => setForm({...form, password: e.target.value})} 
                      required 
                    />
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700" size={16} />
                  </div>
                </div>

                <button 
                  disabled={loading} 
                  className="w-full bg-blue-600 text-white font-black py-6 rounded-2xl hover:bg-white hover:text-black transition-all italic text-xs uppercase tracking-widest shadow-2xl shadow-blue-600/10"
                >
                  {loading ? "INITIALIZING..." : "ACTIVATE NODE"}
                </button>
              </form>
            </div>
          </div>

          {/* LEDGER TABLE */}
          <div className="lg:col-span-8">
            <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 bg-white/[0.01] flex items-center gap-3">
                   <TrendingUp size={20} className="text-blue-500" />
                   <h2 className="text-xs font-black uppercase italic tracking-[0.2em] text-white">Operator Master Ledger</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#0b0f1a]/50 text-slate-600 uppercase text-[9px] font-black tracking-[0.3em] italic">
                    <tr>
                      <th className="p-8">Node Protocol</th>
                      <th className="p-8 text-center">Synced Balance</th>
                      <th className="p-8 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {operators.map(op => (
                      <tr key={op.id} className="hover:bg-white/[0.02] transition-all group">
                        <td className="p-8">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-[#0b0f1a] rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-blue-500/30 transition-all">
                              <ShieldCheck size={24} className="text-slate-700 group-hover:text-blue-500 transition-colors" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-white uppercase italic tracking-tighter text-lg">{op.username}</span>
                              <span className="text-[9px] text-slate-500 font-black tracking-widest italic uppercase">Joined: {new Date(op.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-8 text-center">
                          <span className="text-white font-black text-xl italic tracking-tighter">
                            KES {parseFloat(op.balance).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-8 text-right">
                          <button 
                            onClick={() => router.push('/admin/funding')} 
                            className="text-[10px] font-black text-white hover:bg-blue-600 uppercase tracking-widest italic border border-white/10 px-6 py-3 rounded-2xl transition-all"
                          >
                            Dispatch Float
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
