import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  UserPlus, 
  Briefcase, 
  ShieldCheck, 
  ArrowRightLeft, 
  TrendingUp, 
  Activity,
  Key,
  Database
} from 'lucide-react';
import { useRouter } from 'next/router';

export default function ManageOperators() {
  const router = useRouter();
  const [operators, setOperators] = useState([]);
  const [adminId, setAdminId] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [loading, setLoading] = useState(false);
  const [networkStats, setNetworkStats] = useState({ totalFloat: 0 });

  // 1. Fetch Operators and calculate their True Ledger Balances
  const syncNetworkState = useCallback(async () => {
    // Fetch all operator profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, balance, role, created_at')
      .eq('role', 'operator')
      .order('created_at', { ascending: false });

    if (error) return console.error("Sync Error:", error.message);

    // Fetch the ledger to get the "True" aggregate float of the entire network
    const { data: ledgerData } = await supabase
      .from('ledger')
      .select('amount, type, user_id');

    // Map the ledger balances to the operators
    const operatorsWithTruth = (profiles || []).map(op => {
      const opLedger = (ledgerData || []).filter(l => l.user_id === op.id);
      const trueBalance = opLedger.reduce((acc, row) => 
        row.type === 'credit' ? acc + Number(row.amount) : acc - Number(row.amount), 0
      );
      return { ...op, trueBalance };
    });

    const totalFloat = operatorsWithTruth.reduce((acc, op) => acc + op.trueBalance, 0);

    setOperators(operatorsWithTruth);
    setNetworkStats({ totalFloat });
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
  }, [syncNetworkState]);

  // 2. Provision New Node
  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Auth Sign Up handles the creation of the Auth User and the Profile via DB Triggers
    const { data, error } = await supabase.auth.signUp({ 
      email: form.email, 
      password: form.password,
      options: {
        data: { 
          username: form.username,
          role: 'operator',      
          parent_id: adminId 
        }
      }
    });
    
    if (error) {
      alert("Registration Protocol Failure: " + error.message);
      setLoading(false);
      return;
    }

    alert(`NODE INITIALIZED: Operator ${form.username} is now active.`);
    setForm({ email: '', password: '', username: '' });
    syncNetworkState();
    setLoading(false);
  };

  return (
    <AdminLayout>
      <div className="p-8 space-y-10 bg-[#06080f] min-h-screen text-white font-sans">
        
        {/* Header & Global Network Stats */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Database size={16} className="text-blue-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Ledger Governance</span>
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">Network Nodes</h1>
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full xl:w-auto">
            <div className="bg-[#111926] p-6 rounded-[2rem] border border-white/5 flex flex-col items-start min-w-[200px]">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic mb-2">Aggregate Float</span>
              <span className="text-2xl font-black text-blue-500 italic tracking-tighter">
                KES {networkStats.totalFloat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-blue-500/5 p-6 rounded-[2rem] border border-blue-500/20 flex flex-col items-start min-w-[150px]">
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest italic mb-2">Total Operators</span>
              <span className="text-2xl font-black text-white italic tracking-tighter">{operators.length}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Operator Registration Form */}
          <div className="lg:col-span-4">
            <div className="bg-[#111926] p-10 rounded-[3rem] border border-white/5 space-y-8 shadow-2xl sticky top-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                    <UserPlus size={24} />
                </div>
                <h2 className="font-black uppercase text-sm italic tracking-widest text-white">Provision Node</h2>
              </div>
              
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-3 italic tracking-widest">Business Username</label>
                  <input 
                    value={form.username} 
                    className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 focus:border-blue-500 outline-none text-sm font-bold uppercase text-white transition-all placeholder:text-slate-800" 
                    placeholder="LUCRA_NODE_X" 
                    onChange={e => setForm({...form, username: e.target.value})} 
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-3 italic tracking-widest">System Email</label>
                  <input 
                    value={form.email} 
                    className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 focus:border-blue-500 outline-none text-sm font-bold text-white transition-all placeholder:text-slate-800" 
                    placeholder="node@lucra.network" 
                    onChange={e => setForm({...form, email: e.target.value})} 
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-3 italic tracking-widest">Master Key</label>
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
                  className="w-full bg-blue-600 text-white font-black py-6 rounded-2xl hover:bg-white hover:text-black transition-all active:scale-95 italic text-xs uppercase tracking-widest shadow-2xl shadow-blue-600/10 mt-4 disabled:opacity-20"
                >
                  {loading ? "AUTHORIZING..." : "ACTIVATE OPERATOR"}
                </button>
              </form>
            </div>
          </div>

          {/* Operator Performance Ledger */}
          <div className="lg:col-span-8">
            <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <TrendingUp size={20} className="text-blue-500" />
                   <h2 className="text-xs font-black uppercase italic tracking-[0.2em] text-white">Operator Audit Ledger</h2>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#0b0f1a]/50 text-slate-600 uppercase text-[9px] font-black tracking-[0.3em] italic">
                    <tr>
                      <th className="p-8">Identity Protocol</th>
                      <th className="p-8 text-center">Verified Float</th>
                      <th className="p-8 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {operators.map(op => (
                      <tr key={op.id} className="hover:bg-white/[0.02] transition-all group">
                        <td className="p-8">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-[#0b0f1a] rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-blue-500/30 transition-all shadow-inner">
                              <ShieldCheck size={24} className="text-slate-700 group-hover:text-blue-500 transition-colors" />
                            </div>
                            <div className="flex flex-col space-y-1">
                              <span className="font-black text-white uppercase italic tracking-tighter text-lg">{op.username}</span>
                              <span className="text-[9px] text-slate-500 font-black tracking-widest italic uppercase">Active Since: {new Date(op.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-8 text-center">
                          <div className="flex flex-col items-center gap-2">
                              <span className="text-white font-black text-xl italic tracking-tighter">
                                KES {op.trueBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/5 rounded-full border border-blue-500/10">
                                 <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                                 <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Live Node</span>
                              </div>
                          </div>
                        </td>
                        <td className="p-8 text-right">
                          <button 
                            onClick={() => router.push('/admin/funding')} 
                            className="inline-flex items-center gap-3 text-[10px] font-black text-white hover:bg-blue-600 hover:border-blue-600 uppercase tracking-widest italic border border-white/10 px-6 py-3 rounded-2xl transition-all"
                          >
                            <ArrowRightLeft size={14} />
                            Dispatch Float
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {operators.length === 0 && (
                <div className="p-32 text-center space-y-6">
                  <Briefcase size={64} className="mx-auto text-slate-800 opacity-20" />
                  <p className="text-slate-700 font-black uppercase text-[10px] tracking-[0.5em] italic">
                    Network Clear — No Nodes Provisioned
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
