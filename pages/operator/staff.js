import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { Monitor, BadgeCheck, PlusCircle, LayoutDashboard, Database } from 'lucide-react';

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [operatorId, setOperatorId] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [loading, setLoading] = useState(false);

  // 1. Fetch only THIS operator's cashiers
  const fetchStaff = async (id) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('parent_id', id)
      .eq('role', 'cashier')
      .order('created_at', { ascending: false });
    
    if (!error) setStaff(data || []);
  };

  useEffect(() => {
    const initSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setOperatorId(user.id);
        fetchStaff(user.id);
      }
    };
    initSession();
  }, []);

  const handleCreateCashier = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // 2. Register Cashier linked to this Operator via metadata
    const { error } = await supabase.auth.signUp({ 
      email: form.email, 
      password: form.password,
      options: {
        data: { 
          username: form.username,
          role: 'cashier',      
          parent_id: operatorId     
        }
      }
    });
    
    if (error) {
      alert("System Error: " + error.message);
    } else {
      alert(`Terminal ${form.username} has been deployed successfully.`);
      setForm({ email: '', password: '', username: '' });
      fetchStaff(operatorId);
    }
    setLoading(false);
  };

  // Logic: Calculate total float distributed across all terminals in this shop
  const totalShopFloat = staff.reduce((acc, s) => acc + parseFloat(s.balance || 0), 0);

  return (
    <ProtectedRoute allowedRoles={['operator']}>
      <AdminLayout>
        <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen text-white font-sans">
          
          {/* Header with Shop Stats */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Staff & Terminals</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 italic">Deploy and Control Cashier Nodes</p>
            </div>

            <div className="flex gap-4">
              <div className="bg-[#111926] px-6 py-4 rounded-2xl border border-white/5 flex flex-col items-end">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic mb-1">Total Deployed Float</span>
                <span className="text-xl font-black text-blue-400 italic tracking-tighter">
                  KES {totalShopFloat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Registration Form */}
            <div className="lg:col-span-4">
              <form onSubmit={handleCreateCashier} className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl sticky top-8 backdrop-blur-md">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                      <PlusCircle size={18} />
                  </div>
                  <h2 className="font-black uppercase text-xs italic tracking-widest text-white">Provision Terminal</h2>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Terminal Identity (e.g. COUNTER_01)</label>
                  <input value={form.username} className="w-full bg-[#0b0f1a] p-4 rounded-2xl border border-white/5 focus:border-blue-500 outline-none text-sm font-bold uppercase text-white transition-all" placeholder="LUCRA_T1" onChange={e => setForm({...form, username: e.target.value})} required />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Cashier Login Email</label>
                  <input value={form.email} className="w-full bg-[#0b0f1a] p-4 rounded-2xl border border-white/5 focus:border-blue-500 outline-none text-sm font-bold text-white transition-all" placeholder="staff@lucra.shop" onChange={e => setForm({...form, email: e.target.value})} required />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Terminal Access Pin</label>
                  <input value={form.password} className="w-full bg-[#0b0f1a] p-4 rounded-2xl border border-white/5 focus:border-blue-500 outline-none text-sm font-bold text-white transition-all" type="password" placeholder="••••••••" onChange={e => setForm({...form, password: e.target.value})} required />
                </div>

                <button disabled={loading} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl hover:bg-white hover:text-black transition-all active:scale-95 italic text-sm uppercase tracking-tighter shadow-xl shadow-blue-900/20">
                  {loading ? "PROVISIONING..." : "ACTIVATE TERMINAL"}
                </button>
              </form>
            </div>

            {/* Staff List */}
            <div className="lg:col-span-8">
              <div className="bg-[#111926] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
                   <LayoutDashboard size={16} className="text-blue-500" />
                   <span className="text-[10px] font-black uppercase italic text-slate-400">Terminal Network Status</span>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#0b0f1a]/50 text-slate-500 uppercase text-[9px] font-black tracking-[0.2em] italic">
                    <tr>
                      <th className="p-8">Node Identity</th>
                      <th className="p-8 text-center">Current Float</th>
                      <th className="p-8 text-right">Connectivity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {staff.map(s => (
                      <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="p-8">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#0b0f1a] rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-blue-500/30 transition-all">
                              <Monitor size={20} className="text-slate-600 group-hover:text-blue-500 transition-colors" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-white uppercase italic tracking-tighter text-base">{s.username}</span>
                              <span className="text-[9px] text-slate-500 font-bold tracking-widest italic uppercase">Terminal ID: {s.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-8 text-center">
                          <span className="bg-blue-500/10 text-blue-400 px-5 py-2.5 rounded-2xl font-mono font-black text-xs italic border border-blue-500/20">
                            KES {parseFloat(s.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="p-8 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                             <span className="text-[10px] font-black text-emerald-500 uppercase italic tracking-widest">Online</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {staff.length === 0 && (
                  <div className="p-32 text-center">
                    <Database size={48} className="mx-auto text-slate-800 mb-4 opacity-20" />
                    <p className="text-slate-700 font-black uppercase text-xs tracking-[0.4em] italic opacity-20">
                      Waiting for Terminal Deployment
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
