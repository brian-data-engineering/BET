import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { 
  UserPlus, 
  Briefcase, 
  ShieldCheck, 
  ArrowRightLeft, 
  TrendingUp, 
  Activity,
  Key
} from 'lucide-react';
import { useRouter } from 'next/router';

export default function ManageOperators() {
  const router = useRouter();
  const [operators, setOperators] = useState([]);
  const [adminId, setAdminId] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [loading, setLoading] = useState(false);

  // 1. Fetch ALL Operators + Calculate Total Float
  const fetchOperators = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'operator')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Fetch error:", error.message);
      return;
    }
    setOperators(data || []);
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAdminId(user.id);
        fetchOperators();
      }
    };
    getSession();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // 2. Register Operator in Auth
    // NOTE: In production, use a dedicated edge function or service role to prevent admin logout
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
    fetchOperators();
    setLoading(false);
  };

  const totalNetworkFloat = operators.reduce((acc, op) => acc + parseFloat(op.balance || 0), 0);

  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <AdminLayout>
        <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
          
          {/* Header & Global Network Stats */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={16} className="text-[#10b981]" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Governance Console</span>
              </div>
              <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">Network Operators</h1>
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full xl:w-auto">
              <div className="bg-[#111926] p-6 rounded-[2rem] border border-white/5 flex flex-col items-start min-w-[200px]">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic mb-2">Aggregate Float</span>
                <span className="text-2xl font-black text-[#10b981] italic tracking-tighter">
                  KES {totalNetworkFloat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-[#10b981]/5 p-6 rounded-[2rem] border border-[#10b981]/20 flex flex-col items-start min-w-[150px]">
                <span className="text-[9px] font-black text-[#10b981] uppercase tracking-widest italic mb-2">Operational Nodes</span>
                <span className="text-2xl font-black text-white italic tracking-tighter">{operators.length}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Operator Registration Form */}
            <div className="lg:col-span-4">
              <div className="bg-[#111926] p-10 rounded-[3rem] border border-white/5 space-y-8 shadow-2xl sticky top-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#10b981] rounded-2xl flex items-center justify-center text-black shadow-lg shadow-[#10b981]/20">
                      <UserPlus size={24} />
                  </div>
                  <h2 className="font-black uppercase text-sm italic tracking-widest text-white">Provision Node</h2>
                </div>
                
                <form onSubmit={handleCreate} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-3 italic tracking-widest">Business Username</label>
                    <input 
                      value={form.username} 
                      className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 focus:border-[#10b981] outline-none text-sm font-bold uppercase text-white transition-all placeholder:text-slate-800" 
                      placeholder="LUCRA_HQ_01" 
                      onChange={e => setForm({...form, username: e.target.value})} 
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-3 italic tracking-widest">System Email</label>
                    <input 
                      value={form.email} 
                      className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 focus:border-[#10b981] outline-none text-sm font-bold text-white transition-all placeholder:text-slate-800" 
                      placeholder="node@lucra.network" 
                      onChange={e => setForm({...form, email: e.target.value})} 
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-3 italic tracking-widest">Master Key (Password)</label>
                    <div className="relative">
                      <input 
                        value={form.password} 
                        className="w-full bg-[#0b0f1a] p-5 pl-12 rounded-2xl border border-white/5 focus:border-[#10b981] outline-none text-sm font-bold text-white transition-all" 
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
                    className="w-full bg-[#10b981] text-black font-black py-6 rounded-2xl hover:bg-white transition-all active:scale-95 italic text-xs uppercase tracking-widest shadow-2xl shadow-[#10b981]/10 mt-4 disabled:opacity-20"
                  >
                    {loading ? "AUTHORIZING NODE..." : "ACTIVATE OPERATOR"}
                  </button>
                </form>
              </div>
            </div>

            {/* Operator Performance Ledger */}
            <div className="lg:col-span-8">
              <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <TrendingUp size={20} className="text-[#10b981]" />
                     <h2 className="text-xs font-black uppercase italic tracking-[0.2em] text-white">Operator Liquidity Ledger</h2>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#0b0f1a]/50 text-slate-600 uppercase text-[9px] font-black tracking-[0.3em] italic">
                      <tr>
                        <th className="p-8">Identity Protocol</th>
                        <th className="p-8 text-center">Assigned Float</th>
                        <th className="p-8 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {operators.map(op => (
                        <tr key={op.id} className="hover:bg-white/[0.02] transition-all group">
                          <td className="p-8">
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 bg-[#0b0f1a] rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-[#10b981]/30 transition-all shadow-inner">
                                <ShieldCheck size={24} className="text-slate-700 group-hover:text-[#10b981] transition-colors" />
                              </div>
                              <div className="flex flex-col space-y-1">
                                <span className="font-black text-white uppercase italic tracking-tighter text-lg">{op.username}</span>
                                <span className="text-[9px] text-slate-500 font-black tracking-widest italic uppercase">UID: {op.id.slice(0, 12)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-8 text-center">
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-white font-black text-xl italic tracking-tighter">
                                  KES {parseFloat(op.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#10b981]/5 rounded-full border border-[#10b981]/10">
                                   <div className="w-1 h-1 bg-[#10b981] rounded-full animate-pulse" />
                                   <span className="text-[8px] font-black text-[#10b981] uppercase tracking-widest">Active</span>
                                </div>
                            </div>
                          </td>
                          <td className="p-8 text-right">
                            <button 
                              onClick={() => router.push('/admin/funding')} 
                              className="inline-flex items-center gap-3 text-[10px] font-black text-white hover:bg-[#10b981] hover:text-black uppercase tracking-widest italic border border-white/10 px-6 py-3 rounded-2xl transition-all"
                            >
                              <ArrowRightLeft size={14} />
                              Dispatch
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
                      Zero Active Nodes Detected
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
